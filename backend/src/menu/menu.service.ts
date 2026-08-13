import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { CreateMenuItemDto, UpdateMenuItemDto, ReorderDto } from './dto/menu-item.dto';
import { CreateTagDto } from './dto/tag.dto';

const ITEM_INCLUDE = {
    tags: { include: { tag: true } },
    modifierGroups: { include: { options: true }, orderBy: { displayOrder: 'asc' as const } },
};

@Injectable()
export class MenuService {
    constructor(private readonly prisma: PrismaService) {}

    // ---------- Categories ----------

    listCategories(venueId: string) {
        return this.prisma.withVenueScope(venueId, (tx) =>
            tx.menuCategory.findMany({
                where: { venueId },
                include: {
                    items: {
                        include: {
                            tags: { include: { tag: true } },
                            modifierGroups: {
                                include: { options: true },
                                orderBy: { displayOrder: 'asc' },
                            },
                        },
                        orderBy: { displayOrder: 'asc' },
                    },
                },
                orderBy: { displayOrder: 'asc' },
            }),
        );
    }

    async createCategory(venueId: string, dto: CreateCategoryDto) {
        return this.prisma.withVenueScope(venueId, async (tx) => {
            const maxOrder = await tx.menuCategory.aggregate({
                where: { venueId },
                _max: { displayOrder: true },
            });
            return tx.menuCategory.create({
                data: {
                    venueId,
                    name: dto.name,
                    description: dto.description,
                    displayOrder: dto.displayOrder ?? (maxOrder._max.displayOrder ?? -1) + 1,
                },
            });
        });
    }

    async updateCategory(venueId: string, categoryId: string, dto: UpdateCategoryDto) {
        return this.prisma.withVenueScope(venueId, async (tx) => {
            await this.assertCategoryInVenue(tx, venueId, categoryId);
            return tx.menuCategory.update({ where: { id: categoryId }, data: dto });
        });
    }

    async deleteCategory(venueId: string, categoryId: string) {
        return this.prisma.withVenueScope(venueId, async (tx) => {
            await this.assertCategoryInVenue(tx, venueId, categoryId);
            // Blocked by FK if items still reference it — caller should move/delete
            // items first; we don't cascade-delete menu items from a category
            // deletion, that's too destructive for a misclick.
            return tx.menuCategory.delete({ where: { id: categoryId } });
        });
    }

    async reorderCategories(venueId: string, dto: ReorderDto) {
        return this.prisma.withVenueScope(venueId, async (tx) => {
            await Promise.all(
                dto.orderedIds.map((id, index) =>
                    tx.menuCategory.updateMany({
                        where: { id, venueId },
                        data: { displayOrder: index },
                    }),
                ),
            );
            return { ok: true };
        });
    }

    private async assertCategoryInVenue(tx: any, venueId: string, categoryId: string) {
        const category = await tx.menuCategory.findUnique({ where: { id: categoryId } });
        if (!category || category.venueId !== venueId) {
            throw new NotFoundException('Category not found');
        }
    }

    // ---------- Menu items ----------

    async createItem(venueId: string, dto: CreateMenuItemDto) {
        return this.prisma.withVenueScope(venueId, async (tx) => {
            await this.assertCategoryInVenue(tx, venueId, dto.categoryId);

            const item = await tx.menuItem.create({
                data: {
                    venueId,
                    categoryId: dto.categoryId,
                    name: dto.name,
                    description: dto.description,
                    photoUrl: dto.photoUrl,
                    priceCents: dto.priceCents,
                    isAvailable: dto.isAvailable ?? true,
                    displayOrder: dto.displayOrder ?? 0,
                    dineInOnly: dto.dineInOnly ?? false,
                    takeawayOnly: dto.takeawayOnly ?? false,
                    tags: dto.tagIds ? { create: dto.tagIds.map((tagId) => ({ tagId })) } : undefined,
                },
            });

            if (dto.modifierGroups?.length) {
                await this.replaceModifierGroups(tx, item.id, dto.modifierGroups);
            }

            return tx.menuItem.findUnique({ where: { id: item.id }, include: ITEM_INCLUDE });
        });
    }

    async updateItem(venueId: string, itemId: string, dto: UpdateMenuItemDto) {
        return this.prisma.withVenueScope(venueId, async (tx) => {
            await this.assertItemInVenue(tx, venueId, itemId);
            if (dto.categoryId) await this.assertCategoryInVenue(tx, venueId, dto.categoryId);

            await tx.menuItem.update({
                where: { id: itemId },
                data: {
                    categoryId: dto.categoryId,
                    name: dto.name,
                    description: dto.description,
                    photoUrl: dto.photoUrl,
                    priceCents: dto.priceCents,
                    isAvailable: dto.isAvailable,
                    displayOrder: dto.displayOrder,
                    dineInOnly: dto.dineInOnly,
                    takeawayOnly: dto.takeawayOnly,
                },
            });

            if (dto.tagIds) {
                await tx.menuItemTag.deleteMany({ where: { menuItemId: itemId } });
                await tx.menuItemTag.createMany({
                    data: dto.tagIds.map((tagId) => ({ menuItemId: itemId, tagId })),
                });
            }

            if (dto.modifierGroups) {
                await this.replaceModifierGroups(tx, itemId, dto.modifierGroups);
            }

            return tx.menuItem.findUnique({ where: { id: itemId }, include: ITEM_INCLUDE });
        });
    }

    /** The one-tap "86 it" toggle from section 5 — instantly hides/shows the
     * item on the customer menu. Kept as its own endpoint so staff don't need
     * the full update payload just to flip availability mid-service. */
    async setAvailability(venueId: string, itemId: string, isAvailable: boolean) {
        return this.prisma.withVenueScope(venueId, async (tx) => {
            await this.assertItemInVenue(tx, venueId, itemId);
            return tx.menuItem.update({ where: { id: itemId }, data: { isAvailable } });
        });
    }

    async deleteItem(venueId: string, itemId: string) {
        return this.prisma.withVenueScope(venueId, async (tx) => {
            await this.assertItemInVenue(tx, venueId, itemId);
            // Menu items referenced by past OrderItems can't be hard-deleted
            // without destroying order history (section 8) — Prisma's FK will
            // reject this if the item has ever been ordered. Prefer
            // setAvailability(false) for "retire this item" in the UI; this
            // delete is really only for items created by mistake, never ordered.
            return tx.menuItem.delete({ where: { id: itemId } });
        });
    }

    async reorderItems(venueId: string, dto: ReorderDto) {
        return this.prisma.withVenueScope(venueId, async (tx) => {
            await Promise.all(
                dto.orderedIds.map((id, index) =>
                    tx.menuItem.updateMany({ where: { id, venueId }, data: { displayOrder: index } }),
                ),
            );
            return { ok: true };
        });
    }

    private async assertItemInVenue(tx: any, venueId: string, itemId: string) {
        const item = await tx.menuItem.findUnique({ where: { id: itemId } });
        if (!item || item.venueId !== venueId) {
            throw new NotFoundException('Menu item not found');
        }
    }

    /** Replace-in-place strategy: delete all existing groups (cascades to
     * options) and recreate from the submitted tree. Simpler and safer than
     * diffing individual options against a live menu, at the cost of
     * modifier option ids changing on every edit — acceptable since
     * OrderItemModifier snapshots price/name at order time and doesn't
     * depend on the option id surviving. */
    private async replaceModifierGroups(tx: any, itemId: string, groups: any[]) {
        await tx.modifierGroup.deleteMany({ where: { menuItemId: itemId } });
        for (const [index, group] of groups.entries()) {
            await tx.modifierGroup.create({
                data: {
                    menuItemId: itemId,
                    name: group.name,
                    isRequired: group.isRequired,
                    minSelect: group.minSelect,
                    maxSelect: group.maxSelect,
                    displayOrder: group.displayOrder ?? index,
                    options: {
                        create: group.options.map((o: any, i: number) => ({
                            name: o.name,
                            priceDeltaCents: o.priceDeltaCents,
                            displayOrder: o.displayOrder ?? i,
                        })),
                    },
                },
            });
        }
    }

    // ---------- Tags ----------

    listTags(venueId: string) {
        return this.prisma.withVenueScope(venueId, (tx) => tx.tag.findMany({ where: { venueId } }));
    }

    createTag(venueId: string, dto: CreateTagDto) {
        return this.prisma.withVenueScope(venueId, (tx) =>
            tx.tag.create({ data: { venueId, label: dto.label, kind: dto.kind ?? 'dietary' } }),
        );
    }

    async deleteTag(venueId: string, tagId: string) {
        return this.prisma.withVenueScope(venueId, async (tx) => {
            const tag = await tx.tag.findUnique({ where: { id: tagId } });
            if (!tag || tag.venueId !== venueId) throw new NotFoundException('Tag not found');
            return tx.tag.delete({ where: { id: tagId } });
        });
    }

    // ---------- Public (customer-facing menu read) ----------

    /** Used by the public /r/:slug page — no auth, but still fully scoped to
     * one venue's data by construction (only that venue's categories/items
     * are ever queried), and only ever returns available items' visibility
     * flag as-is so the frontend can grey out unavailable items. */
    async getPublicMenu(venueSlug: string) {
        const venue = await this.prisma.venue.findUnique({ where: { slug: venueSlug } });
        if (!venue) throw new NotFoundException('Venue not found');

        return this.prisma.withVenueScope(venue.id, async (tx) => {
            const categories = await tx.menuCategory.findMany({
                where: { venueId: venue.id },
                orderBy: { displayOrder: 'asc' },
                include: {
                    items: {
                        orderBy: { displayOrder: 'asc' },
                        include: ITEM_INCLUDE,
                    },
                },
            });
            return { venue, categories };
        });
    }
}
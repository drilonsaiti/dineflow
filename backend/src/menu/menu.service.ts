import {Inject, Injectable, NotFoundException} from '@nestjs/common';
import {PrismaService} from '../prisma/prisma.service';
import {CreateCategoryDto, UpdateCategoryDto} from './dto/category.dto';
import {CreateMenuItemDto, ReorderDto, UpdateMenuItemDto} from './dto/menu-item.dto';
import {CreateTagDto} from './dto/tag.dto';
import {CACHE_MANAGER} from '@nestjs/cache-manager';
import {Cache} from 'cache-manager';

const ITEM_INCLUDE = {
    tags: {include: {tag: true}},
    modifierGroups: {include: {options: true}, orderBy: {displayOrder: 'asc' as const}},
};

@Injectable()
export class MenuService {
    constructor(
        private readonly prisma: PrismaService,
        @Inject(CACHE_MANAGER) private readonly cache: Cache,
    ) {
    }

    // ---------- Categories ----------

    listCategories(venueId: string) {
        return this.prisma.withVenueScope(venueId, (tx) =>
            tx.menuCategory.findMany({
                where: {venueId},
                include: {
                    items: {
                        include: {
                            tags: {include: {tag: true}},
                            modifierGroups: {
                                include: {options: true},
                                orderBy: {displayOrder: 'asc'},
                            },
                        },
                        orderBy: {displayOrder: 'asc'},
                    },
                },
                orderBy: {displayOrder: 'asc'},
            }),
        );
    }

    async createCategory(venueId: string, dto: CreateCategoryDto) {
        return this.prisma.withVenueScope(venueId, async (tx) => {
            const maxOrder = await tx.menuCategory.aggregate({
                where: {venueId},
                _max: {displayOrder: true},
            });
            await this.invalidatePublicMenuCache(venueId);
            return tx.menuCategory.create({
                data: {
                    venueId,
                    name: dto.name,
                    description: dto.description,
                    station: dto.station,
                    displayOrder: dto.displayOrder ?? (maxOrder._max.displayOrder ?? -1) + 1,
                },
            });
        });
    }

    async updateCategory(venueId: string, categoryId: string, dto: UpdateCategoryDto) {
        return this.prisma.withVenueScope(venueId, async (tx) => {
            await this.assertCategoryInVenue(tx, venueId, categoryId);
            await this.invalidatePublicMenuCache(venueId);
            return tx.menuCategory.update({where: {id: categoryId}, data: dto});
        });
    }

    async deleteCategory(venueId: string, categoryId: string) {
        return this.prisma.withVenueScope(venueId, async (tx) => {
            await this.assertCategoryInVenue(tx, venueId, categoryId);
            // Blocked by FK if items still reference it — caller should move/delete
            // items first; we don't cascade-delete menu items from a category
            // deletion, that's too destructive for a misclick.
            await this.invalidatePublicMenuCache(venueId);
            return tx.menuCategory.delete({where: {id: categoryId}});
        });
    }

    async reorderCategories(venueId: string, dto: ReorderDto) {
        return this.prisma.withVenueScope(venueId, async (tx) => {
            await Promise.all(
                dto.orderedIds.map((id, index) =>
                    tx.menuCategory.updateMany({
                        where: {id, venueId},
                        data: {displayOrder: index},
                    }),
                ),
            );
            await this.invalidatePublicMenuCache(venueId);
            return {ok: true};
        });
    }

    private async assertCategoryInVenue(tx: any, venueId: string, categoryId: string) {
        const category = await tx.menuCategory.findUnique({where: {id: categoryId}});
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
                    tags: dto.tagIds ? {create: dto.tagIds.map((tagId) => ({tagId}))} : undefined,
                    stockCount: dto.stockCount,
                    lowStockThreshold: dto.lowStockThreshold,
                    translations: dto.translations,
                    courseNumber: dto.courseNumber ?? 1
                },
            });

            if (dto.modifierGroups?.length) {
                await this.replaceModifierGroups(tx, item.id, dto.modifierGroups);
            }
            await this.invalidatePublicMenuCache(venueId);
            return tx.menuItem.findUnique({where: {id: item.id}, include: ITEM_INCLUDE});
        });
    }

    async updateItem(venueId: string, itemId: string, dto: UpdateMenuItemDto) {
        return this.prisma.withVenueScope(venueId, async (tx) => {
            await this.assertItemInVenue(tx, venueId, itemId);
            if (dto.categoryId) await this.assertCategoryInVenue(tx, venueId, dto.categoryId);

            await tx.menuItem.update({
                where: {id: itemId},
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
                    stockCount: dto.stockCount,
                    lowStockThreshold: dto.lowStockThreshold,
                    translations: dto.translations,
                    courseNumber: dto.courseNumber ?? 1
                },
            });

            if (dto.tagIds) {
                await tx.menuItemTag.deleteMany({where: {menuItemId: itemId}});
                await tx.menuItemTag.createMany({
                    data: dto.tagIds.map((tagId) => ({menuItemId: itemId, tagId})),
                });
            }

            if (dto.modifierGroups) {
                await this.replaceModifierGroups(tx, itemId, dto.modifierGroups);
            }
            await this.invalidatePublicMenuCache(venueId);
            return tx.menuItem.findUnique({where: {id: itemId}, include: ITEM_INCLUDE});
        });
    }

    /** The one-tap "86 it" toggle from section 5 — instantly hides/shows the
     * item on the customer menu. Kept as its own endpoint so staff don't need
     * the full update payload just to flip availability mid-service. */
    async setAvailability(venueId: string, itemId: string, isAvailable: boolean) {
        return this.prisma.withVenueScope(venueId, async (tx) => {
            await this.assertItemInVenue(tx, venueId, itemId);
            const item = await tx.menuItem.update({where: {id: itemId}, data: {isAvailable}});
            await this.invalidatePublicMenuCache(venueId);
            return item;
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
            await this.invalidatePublicMenuCache(venueId);
            return tx.menuItem.delete({where: {id: itemId}});
        });
    }

    async reorderItems(venueId: string, dto: ReorderDto) {
        return this.prisma.withVenueScope(venueId, async (tx) => {
            await Promise.all(
                dto.orderedIds.map((id, index) =>
                    tx.menuItem.updateMany({where: {id, venueId}, data: {displayOrder: index}}),
                ),
            );
            await this.invalidatePublicMenuCache(venueId);
            return {ok: true};
        });
    }

    private async assertItemInVenue(tx: any, venueId: string, itemId: string) {
        const item = await tx.menuItem.findUnique({where: {id: itemId}});
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
        await tx.modifierGroup.deleteMany({where: {menuItemId: itemId}});
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
        return this.prisma.withVenueScope(venueId, (tx) => tx.tag.findMany({where: {venueId}}));
    }

    async createTag(venueId: string, dto: CreateTagDto) {
        await this.invalidatePublicMenuCache(venueId);
        return this.prisma.withVenueScope(venueId, (tx) =>
            tx.tag.create({data: {venueId, label: dto.label, kind: dto.kind ?? 'dietary'}}),
        );
    }

    async deleteTag(venueId: string, tagId: string) {
        return this.prisma.withVenueScope(venueId, async (tx) => {
            const tag = await tx.tag.findUnique({where: {id: tagId}});
            if (!tag || tag.venueId !== venueId) throw new NotFoundException('Tag not found');
            await this.invalidatePublicMenuCache(venueId);
            return tx.tag.delete({where: {id: tagId}});
        });
    }

    // ---------- Public (customer-facing menu read) ----------

    /** Used by the public /r/:slug page — no auth, but still fully scoped to
     * one venue's data by construction (only that venue's categories/items
     * are ever queried), and only ever returns available items' visibility
     * flag as-is so the frontend can grey out unavailable items. */
    async getPublicMenu(venueSlug: string, lang?: string) {
        const cacheKey = `public-menu:${venueSlug}:${lang ?? 'default'}`;
        const cached = await this.cache.get(cacheKey);
        if (cached) return cached;

        const venue = await this.prisma.venue.findUnique({ where: { slug: venueSlug } });
        if (!venue) throw new NotFoundException('Venue not found');

        const result = await this.prisma.withVenueScope(venue.id, async (tx) => {
            const categories = await tx.menuCategory.findMany({
                where: { venueId: venue.id },
                orderBy: { displayOrder: 'asc' },
                include: { items: { orderBy: { displayOrder: 'asc' }, include: ITEM_INCLUDE } },
            });
            return { venue, categories };
        });

        for (const category of result.categories) {
            this.applyTranslation(category, lang);
            for (const item of category.items as any[]) {
                this.applyTranslation(item, lang);
                item.isAvailable = item.isAvailable && this.isWithinSchedule(item.availableFrom, item.availableTo);
            }
        }

        await this.cache.set(cacheKey, result, 15_000);
        return result;
    }


    async invalidatePublicMenuCache(venueId: string) {
        const venue = await this.prisma.venue.findUnique({
            where: {id: venueId},
            select: {
                slug: true,
                supportedLanguages: true,
            },
        });

        if (!venue) return;

        await this.cache.del(`public-menu:${venue.slug}:default`);

        for (const lang of venue.supportedLanguages) {
            await this.cache.del(`public-menu:${venue.slug}:${lang}`);
        }
    }

    /** Overnight-safe window check — e.g. availableFrom "22:00", availableTo
     * "02:00" correctly covers 23:30 and 01:00 but not 15:00. */
    private isWithinSchedule(availableFrom: string | null, availableTo: string | null): boolean {
        if (!availableFrom || !availableTo) return true;
        const now = new Date();
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        const [fh, fm] = availableFrom.split(':').map(Number);
        const [th, tm] = availableTo.split(':').map(Number);
        const fromMinutes = fh * 60 + fm;
        const toMinutes = th * 60 + tm;
        return fromMinutes <= toMinutes
            ? nowMinutes >= fromMinutes && nowMinutes <= toMinutes
            : nowMinutes >= fromMinutes || nowMinutes <= toMinutes; // overnight wrap
    }

    /** Overlays a translated name/description onto the object if the venue
     * has one for the requested language — falls back to the default
     * name/description silently rather than showing an empty field when a
     * translation is missing for one item. */
    private applyTranslation(entity: any, lang?: string) {
        if (!lang || !entity.translations) return;
        const t = (entity.translations as Record<string, { name?: string; description?: string }>)[lang];
        if (t?.name) entity.name = t.name;
        if (t?.description) entity.description = t.description;
    }
}
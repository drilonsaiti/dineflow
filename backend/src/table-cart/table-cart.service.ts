import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TablesService } from '../tables/tables.service';
import { AddCartItemDto, UpdateCartItemDto } from './dto/table-cart.dto';

@Injectable()
export class TableCartService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly tablesService: TablesService,
    ) {}

    /** Resolves current display prices fresh on every read — deliberately not
     * cached on the cart item itself, since a menu price can change mid-shift
     * and the cart should always show what checkout will actually charge. */
    async list(tableToken: string) {
        const table = await this.tablesService.resolveByToken(tableToken);
        return this.prisma.withVenueScope(table.venueId, async (tx) => {
            const items = await tx.tableCartItem.findMany({
                where: { tableId: table.id },
                orderBy: { createdAt: 'asc' },
            });
            if (items.length === 0) return [];

            const menuItems = await tx.menuItem.findMany({
                where: { id: { in: items.map((i) => i.menuItemId) } },
                include: { modifierGroups: { include: { options: true } } },
            });
            const menuItemsById = new Map(menuItems.map((m) => [m.id, m]));

            return items.map((item) => {
                const menuItem = menuItemsById.get(item.menuItemId);
                const allOptions = menuItem?.modifierGroups.flatMap((g) => g.options) ?? [];
                const modifiers = item.modifierOptionIds
                    .map((id) => allOptions.find((o) => o.id === id))
                    .filter((o): o is NonNullable<typeof o> => !!o)
                    .map((o) => ({ modifierOptionId: o.id, name: o.name, priceDeltaCents: o.priceDeltaCents }));

                const unitPriceCents = (menuItem?.priceCents ?? 0) + modifiers.reduce((s, m) => s + m.priceDeltaCents, 0);

                return {
                    id: item.id,
                    menuItemId: item.menuItemId,
                    name: menuItem?.name ?? 'Item no longer on menu',
                    photoUrl: menuItem?.photoUrl ?? null,
                    isAvailable: menuItem?.isAvailable ?? false,
                    quantity: item.quantity,
                    note: item.note,
                    addedByLabel: item.addedByLabel,
                    modifiers,
                    unitPriceCents,
                    lineTotalCents: unitPriceCents * item.quantity,
                };
            });
        });
    }

    async add(dto: AddCartItemDto) {
        const table = await this.tablesService.resolveByToken(dto.tableToken);
        return this.prisma.withVenueScope(table.venueId, async (tx) => {
            const menuItem = await tx.menuItem.findUnique({
                where: { id: dto.menuItemId },
                include: { modifierGroups: { include: { options: true } } },
            });
            if (!menuItem || menuItem.venueId !== table.venueId) {
                throw new NotFoundException('Menu item not found');
            }
            const validOptionIds = new Set(menuItem.modifierGroups.flatMap((g) => g.options.map((o) => o.id)));
            if (dto.modifierOptionIds.some((id) => !validOptionIds.has(id))) {
                throw new BadRequestException('Invalid modifier selection');
            }

            return tx.tableCartItem.create({
                data: {
                    venueId: table.venueId,
                    tableId: table.id,
                    menuItemId: dto.menuItemId,
                    quantity: dto.quantity,
                    note: dto.note,
                    addedByLabel: dto.addedByLabel,
                    modifierOptionIds: dto.modifierOptionIds,
                },
            });
        });
    }

    async update(tableToken: string, itemId: string, dto: UpdateCartItemDto) {
        const table = await this.tablesService.resolveByToken(tableToken);
        return this.prisma.withVenueScope(table.venueId, async (tx) => {
            const item = await tx.tableCartItem.findUnique({ where: { id: itemId } });
            if (!item || item.tableId !== table.id) throw new NotFoundException('Cart item not found');

            if (dto.quantity === 0) {
                await tx.tableCartItem.delete({ where: { id: itemId } });
                return { deleted: true };
            }
            return tx.tableCartItem.update({
                where: { id: itemId },
                data: { quantity: dto.quantity, note: dto.note },
            });
        });
    }

    async remove(tableToken: string, itemId: string) {
        const table = await this.tablesService.resolveByToken(tableToken);
        return this.prisma.withVenueScope(table.venueId, async (tx) => {
            const item = await tx.tableCartItem.findUnique({ where: { id: itemId } });
            if (!item || item.tableId !== table.id) throw new NotFoundException('Cart item not found');
            await tx.tableCartItem.delete({ where: { id: itemId } });
            return { deleted: true };
        });
    }

    /** Bulk-remove by menuItemId — used when checkout rejects items that went
     * unavailable between add-to-cart and placement (section 18's edge case,
     * now applied to a shared cart instead of per-browser localStorage). */
    async removeByMenuItemIds(tableToken: string, menuItemIds: string[]) {
        const table = await this.tablesService.resolveByToken(tableToken);
        return this.prisma.withVenueScope(table.venueId, (tx) =>
            tx.tableCartItem.deleteMany({ where: { tableId: table.id, menuItemId: { in: menuItemIds } } }),
        );
    }
}
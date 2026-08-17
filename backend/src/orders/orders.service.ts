import {BadRequestException, GoneException, Injectable, NotFoundException,} from '@nestjs/common';
import {OrderStatus} from '@prisma/client';
import {PrismaService} from '../prisma/prisma.service';
import {PlaceOrderDto} from './dto/place-order.dto';
import {assertValidTransition} from './order-status.machine';
import {OrdersGateway} from './orders.gateway';
import {TablesService} from '../tables/tables.service';
import {NotificationsService} from '../notifications/notifications.service';
import {MenuService} from "../menu/menu.service";
import {SubmitFeedbackDto} from "./submit-feedback.dto";
import {PrinterService} from "../printer/printer.service";
import { StaffPlaceOrderDto } from "./dto/staff-place-order.dto";

@Injectable()
export class OrdersService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly gateway: OrdersGateway,
        private readonly tablesService: TablesService,
        private readonly notifications: NotificationsService,
        private readonly menuService: MenuService,
        private readonly printer: PrinterService,
    ) {
    }

    // ---------- Customer-facing (public, no auth — section 3/11) ----------

    /** Resolves the table from its opaque token; used by the public menu page
     * and by placeOrder. Handles the "deactivated table" edge case (section 18)
     * with a clear error rather than a crash. */
    async resolveTable(tableToken: string) {
        const table = await this.prisma.table.findUnique({
            where: {token: tableToken},
            include: {venue: true},
        });
        if (!table) throw new NotFoundException('This QR code is not recognized.');
        if (!table.isActive) {
            throw new GoneException('This table is no longer active. Please ask staff for help.');
        }
        return table;
    }

    async placeOrder(dto: PlaceOrderDto) {
        const table = await this.tablesService.resolveByToken(dto.tableToken);
        await this.tablesService.assertSessionValid(table.id, dto.sessionToken);
        this.tablesService.touchSession(dto.sessionToken).catch(() => {});

        const twoMinutesAgo = new Date(Date.now() - 2 * 60_000);
        const recentOrderCount = await this.prisma.order.count({
            where: { tableId: table.id, createdAt: { gte: twoMinutesAgo } },
        });
        if (recentOrderCount >= 5) {
            throw new BadRequestException(
                'Too many orders placed for this table recently. Please wait a moment or ask a staff member for help.',
            );
        }

        let locationFlagged = false;
        const venue = await this.prisma.venue.findUnique({ where: { id: table.venueId } });
        if (venue?.latitude != null && venue?.longitude != null && dto.customerLatitude != null && dto.customerLongitude != null) {
            const distance = this.distanceMeters(venue.latitude, venue.longitude, dto.customerLatitude, dto.customerLongitude);
            if (distance > 300) locationFlagged = true;
        }

        const result = await this.prisma.withVenueScope(table.venueId, async (tx) => {
            const cartItems = await tx.tableCartItem.findMany({ where: { tableId: table.id } });
            if (cartItems.length === 0) throw new BadRequestException('Your cart is empty.');

            const itemsInput = cartItems.map((c) => ({
                menuItemId: c.menuItemId,
                quantity: c.quantity,
                note: c.note ?? undefined,
                modifiers: c.modifierOptionIds.map((id) => ({ modifierOptionId: id })),
                addedByLabel: c.addedByLabel ?? undefined,
            }));

            const built = await this.buildAndCreateOrder(tx, table.venueId, table.id, itemsInput, {
                customerName: dto.customerName,
                customerPhone: dto.customerPhone,
                note: dto.note,
                locationFlagged,
            });

            await tx.tableCartItem.deleteMany({ where: { tableId: table.id } });
            return built;
        });

        this.gateway.emitOrderEvent(table.venueId, 'order_created', result.order);
        if (result.stockChanged) await this.menuService.invalidatePublicMenuCache(table.venueId);
        this.printer.printOrderTicket(table.venueId, result.order.id).catch(() => {});
        return result.order;
    }


    /** Polled by the customer's tracking screen every few seconds (section 11). */
    async getForCustomer(orderId: string, tableToken: string) {
        const order = await this.prisma.order.findUnique({
            where: {id: orderId},
            include: {
                items: {include: {menuItem: true, modifiers: {include: {modifierOption: true}}}},
                table: true,
                statusEvents: {
                    orderBy: {changedAt: 'desc'},
                    take: 1,
                    include: {changedBy: {select: {id: true, email: true, fullName: true}}},
                },
            },
        });
        if (!order || order.table.token !== tableToken) {
            throw new NotFoundException('Order not found.');
        }
        return order;
    }

    // ---------- Staff-facing (authenticated, venue-scoped) ----------

    async listForVenue(venueId: string, station?: string, take = 100, skip = 0) {
        return this.prisma.withVenueScope(venueId, (tx) =>
            tx.order.findMany({
                where: { venueId, status: { notIn: [OrderStatus.SERVED, OrderStatus.CANCELLED] }, ...(station ? { items: { some: { menuItem: { category: { station } } } } } : {}) },
                include: {
                    items: {
                        include: {
                            menuItem: {include: {category: true}},
                            modifiers: {include: {modifierOption: true}}
                        }
                    },
                    table: true,
                    statusEvents: {
                        orderBy: {changedAt: 'desc'},
                        take: 1,
                        include: {changedBy: {select: {id: true, email: true, fullName: true}}},
                    },
                },
                orderBy: {createdAt: 'asc'},
                take: Math.min(take, 200),
                skip,
            }),
        );
    }

    async advanceStatus(
        venueId: string,
        orderId: string,
        toStatus: OrderStatus,
        staffUserId: string,
        staffRole: string,
    ) {
        return this.prisma.withVenueScope(venueId, async (tx) => {
            const order = await tx.order.findUnique({where: {id: orderId}});
            if (!order || order.venueId !== venueId) throw new NotFoundException('Order not found.');

            try {
                assertValidTransition(order.status, toStatus);
            } catch (e) {
                throw new BadRequestException((e as Error).message);
            }

            // Marking SERVED is the one action that's claim-gated: a waiter can
            // only serve a table they've claimed, so accountability for "who
            // actually walked the food out" stays meaningful. Owners/managers
            // bypass this — they're allowed to cover any table.
            if (toStatus === OrderStatus.SERVED && !['OWNER', 'MANAGER'].includes(staffRole)) {
                const assignment = await tx.staffTableAssignment.findUnique({where: {tableId: order.tableId}});
                if (!assignment || assignment.userId !== staffUserId) {
                    throw new BadRequestException('You can only mark orders served at a table you\'ve claimed.');
                }
            }

            const updated = await tx.order.update({
                where: {id: orderId},
                data: {status: toStatus, statusEvents: {create: {status: toStatus, changedByUserId: staffUserId}}},
                include: {
                    items: {include: {menuItem: true, modifiers: {include: {modifierOption: true}}}},
                    table: true,
                    statusEvents: {
                        orderBy: {changedAt: 'desc'},
                        take: 1,
                        include: {changedBy: {select: {id: true, email: true, fullName: true}}}
                    },
                },
            });

            this.gateway.emitOrderEvent(venueId, 'order_updated', updated);
            return updated;
        });
    }

    async listForTable(venueId: string, tableId: string, take = 100, skip = 0) {
        return this.prisma.withVenueScope(venueId, (tx) =>
            tx.order.findMany({
                where: {venueId, tableId},
                include: {
                    items: {include: {menuItem: true, modifiers: {include: {modifierOption: true}}}},
                    statusEvents: {
                        orderBy: {changedAt: 'desc'},
                        take: 1,
                        include: {changedBy: {select: {id: true, email: true, fullName: true}}},
                    },
                },
                orderBy: {createdAt: 'desc'},
                take: Math.min(take, 200),
                skip
            }),
        );
    }

    async submitFeedback(orderId: string, dto: SubmitFeedbackDto) {
        const order = await this.prisma.order.findUnique({where: {id: orderId}, include: {table: true}});
        if (!order || order.table.token !== dto.tableToken) throw new NotFoundException('Order not found.');
        if (order.status !== OrderStatus.SERVED) {
            throw new BadRequestException('You can rate your order once it has been served.');
        }
        return this.prisma.orderFeedback.upsert({
            where: {orderId},
            update: {rating: dto.rating, comment: dto.comment},
            create: {orderId, rating: dto.rating, comment: dto.comment},
        });
    }

    /** Public, session-gated view of everything ordered by this table today —
     * "the tab" — grouped by who added each item (section 1: uses the name
     * customers already give when adding to the shared cart). Items with no
     * addedByLabel land in a "Shared" bucket rather than being dropped. */

    async getTableTab(tableToken: string, sessionToken: string) {
        const table = await this.tablesService.resolveByToken(tableToken);
        await this.tablesService.assertSessionValid(table.id, sessionToken);

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        return this.prisma.withVenueScope(table.venueId, async (tx) => {
            const orders = await tx.order.findMany({
                where: {
                    venueId: table.venueId,
                    tableId: table.id,
                    createdAt: {gte: startOfDay},
                    status: {not: 'CANCELLED'}
                },
                include: {items: {include: {menuItem: true, modifiers: {include: {modifierOption: true}}}}},
                orderBy: {createdAt: 'asc'},
            });

            const byPerson = new Map<string, { label: string; items: any[]; totalCents: number }>();
            let grandTotalCents = 0;

            for (const order of orders) {
                for (const item of order.items) {
                    const label = item.addedByLabel ?? 'Shared';
                    if (!byPerson.has(label)) byPerson.set(label, {label, items: [], totalCents: 0});
                    const bucket = byPerson.get(label)!;
                    bucket.items.push({
                        name: item.menuItem.name,
                        quantity: item.quantity,
                        note: item.note,
                        lineTotalCents: item.lineTotalCents,
                        modifiers: item.modifiers.map((m) => m.modifierOption.name),
                    });
                    bucket.totalCents += item.lineTotalCents;
                    grandTotalCents += item.lineTotalCents;
                }
            }

            return {
                orderCount: orders.length,
                byPerson: Array.from(byPerson.values()),
                grandTotalCents,
            };
        });
    }

    async getOneForVenue(venueId: string, orderId: string) {
        return this.prisma.withVenueScope(venueId, async (tx) => {
            const order = await tx.order.findUnique({
                where: {id: orderId},
                include: {
                    items: {include: {menuItem: true, modifiers: {include: {modifierOption: true}}}},
                    table: true
                },
            });
            if (!order || order.venueId !== venueId) throw new NotFoundException('Order not found');
            return order;
        });
    }

    /** Per-guest breakdown for splitting the bill by what each person
     * actually ordered, not evenly (section 2 of the original ask). Reuses
     * the same addedByLabel grouping as getTableTab — "Shared" bucket for
     * anything with no label, since not every group bothers naming who
     * ordered what. */
    async getItemizedBill(tableToken: string, sessionToken: string) {
        const tab = await this.getTableTab(tableToken, sessionToken); // already groups by person + totals

        return {
            byPerson: tab.byPerson.map((p) => ({
                label: p.label,
                totalCents: p.totalCents,
                items: p.items,
            })),
            grandTotalCents: tab.grandTotalCents,
            // Explicit limitation, not a silent gap: shared items (appetizers
            // nobody attributed to a specific person) land in "Shared" and are
            // NOT auto-split across the other buckets — that would require
            // knowing who actually ate them, which this app doesn't track.
            note: 'Items added without a name are grouped as "Shared" and are not automatically divided between guests.',
        };
    }

    async fireCourse(venueId: string, orderId: string, courseNumber: number) {
        return this.prisma.withVenueScope(venueId, async (tx) => {
            const order = await tx.order.findUnique({ where: { id: orderId } });
            if (!order || order.venueId !== venueId) throw new NotFoundException('Order not found');

            if (order.firedCourseNumbers.includes(courseNumber)) return order; // already fired — idempotent

            const updated = await tx.order.update({
                where: { id: orderId },
                data: { firedCourseNumbers: [...order.firedCourseNumbers, courseNumber] },
                include: {
                    items: { include: { menuItem: true, modifiers: { include: { modifierOption: true } } } },
                    table: true,
                    statusEvents: { orderBy: { changedAt: 'desc' }, take: 1, include: { changedBy: true } },
                },
            });
            this.gateway.emitOrderEvent(venueId, 'order_updated', updated);
            return updated;
        });
    }
    /** Staff-initiated order — a waiter taking a table's order verbally,
     * without the customer's phone/QR flow at all. Shares all pricing/stock/
     * availability/tax logic with the customer path via
     * buildOrderFromItems() below, so the two entry points can never
     * silently diverge on how a total gets calculated. Unlike placeOrder,
     * there's no shared cart to clear and no session to validate — the
     * table is picked directly, and the acting staff member is attributed
     * on the order for accountability. */
    async placeOrderAsStaff(venueId: string, dto: StaffPlaceOrderDto, staffUserId: string) {
        return this.prisma.withVenueScope(venueId, async (tx) => {
            const table = await tx.table.findUnique({ where: { id: dto.tableId } });
            if (!table || table.venueId !== venueId) throw new NotFoundException('Table not found');
            if (!table.isActive) throw new BadRequestException('This table is not active.');

            const { order, stockChanged } = await this.buildAndCreateOrder(tx, venueId, table.id, dto.items, {
                customerName: dto.customerName,
                note: dto.note,
                placedByUserId: staffUserId,
            });

            this.gateway.emitOrderEvent(venueId, 'order_created', order);
            if (stockChanged) await this.menuService.invalidatePublicMenuCache(venueId);
            return order;
        });
    }

    /** The single place order pricing/availability/stock/tax logic lives —
     * called by both the customer QR flow (placeOrder) and the staff-taken
     * flow (placeOrderAsStaff) so neither can drift from the other. */

    private async buildAndCreateOrder(
        tx: any,
        venueId: string,
        tableId: string,
        itemsInput: { menuItemId: string; quantity: number; note?: string; modifiers: { modifierOptionId: string }[]; addedByLabel?: string }[],
        extras: {
            customerName?: string;
            customerPhone?: string;
            note?: string;
            placedByUserId?: string;
            locationFlagged?: boolean;
        },
    ) {
        const menuItemIds = itemsInput.map((i) => i.menuItemId);
        const menuItems = await tx.menuItem.findMany({
            where: { id: { in: menuItemIds }, venueId },
            include: { modifierGroups: { include: { options: true } } },
        });
        const menuItemsById = new Map(menuItems.map((m: any) => [m.id, m]));

        const unavailable = itemsInput.filter((i) => {
            const item: any = menuItemsById.get(i.menuItemId);
            return !item || !item.isAvailable || (item.stockCount != null && item.stockCount < i.quantity);
        });
        if (unavailable.length > 0) {
            throw new BadRequestException({
                message: 'Some items are no longer available.',
                unavailableMenuItemIds: unavailable.map((i) => i.menuItemId),
            });
        }

        let totalCents = 0;
        const itemsData = itemsInput.map((input) => {
            const menuItem: any = menuItemsById.get(input.menuItemId);
            const allOptions = menuItem.modifierGroups.flatMap((g: any) => g.options);
            const chosen = input.modifiers.map((m) => {
                const option = allOptions.find((o: any) => o.id === m.modifierOptionId);
                if (!option) throw new BadRequestException('Invalid modifier selection.');
                return option;
            });
            const modifierDelta = chosen.reduce((sum: number, o: any) => sum + o.priceDeltaCents, 0);
            const unitPriceCents = menuItem.priceCents + modifierDelta;
            const lineTotalCents = unitPriceCents * input.quantity;
            totalCents += lineTotalCents;

            return {
                menuItemId: menuItem.id,
                quantity: input.quantity,
                note: input.note,
                addedByLabel: input.addedByLabel,
                unitPriceCents,
                lineTotalCents,
                modifiers: { create: chosen.map((o: any) => ({ modifierOptionId: o.id, priceDeltaCents: o.priceDeltaCents })) },
            };
        });

        const venueTax = await tx.venue.findUniqueOrThrow({ where: { id: venueId }, select: { taxRatePercent: true, taxInclusive: true } });
        let subtotalCents = totalCents;
        let taxCents = 0;
        if (venueTax.taxRatePercent != null) {
            if (venueTax.taxInclusive) {
                taxCents = Math.round(totalCents - totalCents / (1 + venueTax.taxRatePercent / 100));
                subtotalCents = totalCents - taxCents;
            } else {
                taxCents = Math.round(totalCents * (venueTax.taxRatePercent / 100));
                totalCents = totalCents + taxCents;
            }
        }

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        await tx.$executeRaw`
      INSERT INTO "DailyOrderCounter" ("venueId", "day", "lastValue")
      VALUES (${venueId}, ${startOfDay}, 1)
      ON CONFLICT ("venueId", "day")
      DO UPDATE SET "lastValue" = "DailyOrderCounter"."lastValue" + 1
    `;
        const counterRow = await tx.dailyOrderCounter.findUniqueOrThrow({ where: { venueId_day: { venueId, day: startOfDay } } });

        const order = await tx.order.create({
            data: {
                venueId,
                tableId,
                dailyNumber: counterRow.lastValue,
                customerName: extras.customerName,
                customerPhone: extras.customerPhone,
                note: extras.note,
                placedByUserId: extras.placedByUserId, // null for customer-placed orders
                locationFlagged: extras.locationFlagged ?? false,
                subtotalCents,
                taxCents,
                totalCents,
                status: OrderStatus.RECEIVED,
                items: { create: itemsData },
                statusEvents: { create: { status: OrderStatus.RECEIVED, changedByUserId: extras.placedByUserId } },
            },
            include: { items: true, table: true },
        });

        let stockChanged = false;
        for (const input of itemsInput) {
            const menuItem: any = menuItemsById.get(input.menuItemId);
            if (menuItem.stockCount != null) {
                const newStock = menuItem.stockCount - input.quantity;
                await tx.menuItem.update({ where: { id: menuItem.id }, data: { stockCount: newStock, isAvailable: newStock > 0 ? menuItem.isAvailable : false } });
                stockChanged = true;
            }
        }

        return { order, stockChanged };
    }

    private distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371000;
        const toRad = (d: number) => (d * Math.PI) / 180;
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}

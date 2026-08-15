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
        const twoMinutesAgo = new Date(Date.now() - 2 * 60_000);
        const recentOrderCount = await this.prisma.order.count({
            where: {tableId: table.id, createdAt: {gte: twoMinutesAgo}},
        });

        if (recentOrderCount >= 5) {
            throw new BadRequestException(
                'Too many orders placed for this table recently. Please wait a moment or ask a staff member for help.',
            );
        }

        const result = await this.prisma.withVenueScope(table.venueId, async (tx) => {
            const cartItems = await tx.tableCartItem.findMany({where: {tableId: table.id}});
            if (cartItems.length === 0) {
                throw new BadRequestException('Your cart is empty.');
            }

            const menuItemIds = cartItems.map((i) => i.menuItemId);
            const menuItems = await tx.menuItem.findMany({
                where: {id: {in: menuItemIds}, venueId: table.venueId},
                include: {modifierGroups: {include: {options: true}}},
            });
            const menuItemsById = new Map(menuItems.map((m) => [m.id, m]));

            // Availability AND stock checked at placement time (section 18's
            // edge case, plus the new stock-tracking feature) — never trusted
            // from when the item was added to the shared cart, which could have
            // been minutes or an entire other round ago.
            const unavailable = cartItems.filter((i) => {
                const item = menuItemsById.get(i.menuItemId);
                return (
                    !item ||
                    !item.isAvailable ||
                    (item.stockCount != null && item.stockCount < i.quantity)
                );
            });
            if (unavailable.length > 0) {
                throw new BadRequestException({
                    message: 'Some items in your cart are no longer available.',
                    unavailableMenuItemIds: unavailable.map((i) => i.menuItemId),
                });
            }

            let totalCents = 0;
            const itemsData = cartItems.map((cartItem) => {
                const menuItem = menuItemsById.get(cartItem.menuItemId)!;
                const allOptions = menuItem.modifierGroups.flatMap((g) => g.options);
                const chosen = cartItem.modifierOptionIds.map((id) => {
                    const option = allOptions.find((o) => o.id === id);
                    if (!option) throw new BadRequestException('Invalid modifier selection.');
                    return option;
                });
                const modifierDelta = chosen.reduce((sum, o) => sum + o.priceDeltaCents, 0);
                const unitPriceCents = menuItem.priceCents + modifierDelta;
                const lineTotalCents = unitPriceCents * cartItem.quantity;
                totalCents += lineTotalCents;

                return {
                    menuItemId: menuItem.id,
                    quantity: cartItem.quantity,
                    note: cartItem.note,
                    addedByLabel: cartItem.addedByLabel,
                    unitPriceCents,
                    lineTotalCents,
                    modifiers: {
                        create: chosen.map((o) => ({modifierOptionId: o.id, priceDeltaCents: o.priceDeltaCents})),
                    },
                };
            });

            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            await tx.$executeRaw`
        INSERT INTO "DailyOrderCounter" ("venueId", "day", "lastValue")
        VALUES (${table.venueId}, ${startOfDay}, 1)
        ON CONFLICT ("venueId", "day")
        DO UPDATE SET "lastValue" = "DailyOrderCounter"."lastValue" + 1
      `;
            const counterRow = await tx.dailyOrderCounter.findUniqueOrThrow({
                where: {venueId_day: {venueId: table.venueId, day: startOfDay}},
            });

            const order = await tx.order.create({
                data: {
                    venueId: table.venueId,
                    tableId: table.id,
                    dailyNumber: counterRow.lastValue,
                    customerName: dto.customerName,
                    customerPhone: dto.customerPhone,
                    note: dto.note,
                    totalCents,
                    status: OrderStatus.RECEIVED,
                    items: {create: itemsData},
                    statusEvents: {create: {status: OrderStatus.RECEIVED}},
                },
                include: {items: true, table: true},
            });

            // Decrement stock for tracked items; auto-86 anything that just hit zero.
            let stockChanged = false;
            for (const cartItem of cartItems) {
                const menuItem = menuItemsById.get(cartItem.menuItemId)!;
                if (menuItem.stockCount != null) {
                    const newStock = menuItem.stockCount - cartItem.quantity;
                    await tx.menuItem.update({
                        where: {id: menuItem.id},
                        data: {stockCount: newStock, isAvailable: newStock > 0 ? menuItem.isAvailable : false},
                    });
                    stockChanged = true;
                }
            }

            // The shared cart's job is done — clear it for the next round.
            await tx.tableCartItem.deleteMany({where: {tableId: table.id}});

            return {order, stockChanged};
        });

        this.gateway.emitOrderEvent(table.venueId, 'order_created', result.order);
        if (result.stockChanged) {
            await this.menuService.invalidatePublicMenuCache(table.venueId);
        }

        this.printer.printOrderTicket(table.venueId, result.order.id).catch(() => {
        }); // fire-and-forget, see PrinterService
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

    async listForVenue(venueId: string, station?: string) {
        return this.prisma.withVenueScope(venueId, (tx) =>
            tx.order.findMany({
                where: {
                    venueId,
                    status: {notIn: [OrderStatus.SERVED, OrderStatus.CANCELLED]},
                    // An order "belongs" to a station if any of its line items came
                    // from a category tagged for that station. Categories with no
                    // station set (null) are venue-wide (e.g. desserts shown to
                    // everyone) and are intentionally excluded from a station-scoped
                    // view — a kitchen filter should show kitchen work, not
                    // everything that isn't explicitly bar.
                    ...(station
                        ? {items: {some: {menuItem: {category: {station}}}}}
                        : {}),
                },
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

    async listForTable(venueId: string, tableId: string) {
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
                take: 20,
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
}

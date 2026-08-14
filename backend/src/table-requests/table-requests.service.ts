import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TablesService } from '../tables/tables.service';
import { OrdersGateway } from '../orders/orders.gateway';

@Injectable()
export class TableRequestsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly tablesService: TablesService,
        private readonly gateway: OrdersGateway,
    ) {}

    async create(tableToken: string, type: 'CALL_WAITER' | 'REQUEST_BILL_CASH', guestCount?: number) {
        const table = await this.tablesService.resolveByToken(tableToken);
        return this.prisma.withVenueScope(table.venueId, async (tx) => {
            if (type === 'REQUEST_BILL_CASH') {
                // Merge into an existing pending/acknowledged bill request for this
                // table rather than spawning a duplicate — a second guest asking
                // to split differently is updating the same bill, not requesting
                // a second one (see the design note above).
                const existing = await tx.tableRequest.findFirst({
                    where: { tableId: table.id, type: 'REQUEST_BILL_CASH', status: { not: 'RESOLVED' } },
                });
                if (existing) {
                    const totalCents = existing.totalCentsAtRequest ?? 0;
                    const mergedGuestCount = guestCount ?? existing.guestCount ?? undefined;
                    const perPersonCentsAtRequest = mergedGuestCount ? Math.round(totalCents / mergedGuestCount) : null;
                    const updated = await tx.tableRequest.update({
                        where: { id: existing.id },
                        data: { guestCount: mergedGuestCount, perPersonCentsAtRequest },
                        include: { table: true },
                    });
                    this.gateway.emitTableRequestEvent(table.venueId, 'table_request_updated', updated);
                    return updated;
                }
            }

            let totalCentsAtRequest: number | undefined;
            let perPersonCentsAtRequest: number | undefined;
            if (type === 'REQUEST_BILL_CASH') {
                const startOfDay = new Date();
                startOfDay.setHours(0, 0, 0, 0);
                const agg = await tx.order.aggregate({
                    where: { venueId: table.venueId, tableId: table.id, createdAt: { gte: startOfDay }, status: { not: 'CANCELLED' } },
                    _sum: { totalCents: true },
                });
                totalCentsAtRequest = agg._sum.totalCents ?? 0;
                if (guestCount) perPersonCentsAtRequest = Math.round(totalCentsAtRequest / guestCount);
            }

            const request = await tx.tableRequest.create({
                data: { venueId: table.venueId, tableId: table.id, type, guestCount, totalCentsAtRequest, perPersonCentsAtRequest },
                include: { table: true },
            });
            this.gateway.emitTableRequestEvent(table.venueId, 'table_request_created', request);
            return request;
        });
    }

    /** Polled by every device at the table so everyone sees the same bill
     * state — "already requested, splitting 3 ways" — regardless of which
     * phone triggered it (section 6's real-time requirement). */
    async getActiveForTable(tableToken: string) {
        const table = await this.tablesService.resolveByToken(tableToken);
        return this.prisma.withVenueScope(table.venueId, (tx) =>
            tx.tableRequest.findMany({ where: { tableId: table.id, status: { not: 'RESOLVED' } } }),
        );
    }

    async listActive(venueId: string) {
        return this.prisma.withVenueScope(venueId, (tx) =>
            tx.tableRequest.findMany({
                where: { venueId, status: { not: 'RESOLVED' } },
                include: { table: true },
                orderBy: { createdAt: 'asc' },
            }),
        );
    }

    async acknowledge(venueId: string, requestId: string, userId: string) {
        return this.prisma.withVenueScope(venueId, async (tx) => {
            const updated = await tx.tableRequest.update({
                where: { id: requestId },
                data: { status: 'ACKNOWLEDGED', acknowledgedAt: new Date(), acknowledgedByUserId: userId },
                include: { table: true },
            });
            this.gateway.emitTableRequestEvent(venueId, 'table_request_updated', updated);
            return updated;
        });
    }

    async resolve(venueId: string, requestId: string) {
        return this.prisma.withVenueScope(venueId, async (tx) => {
            const updated = await tx.tableRequest.update({
                where: { id: requestId },
                data: { status: 'RESOLVED', resolvedAt: new Date() },
                include: { table: true },
            });
            this.gateway.emitTableRequestEvent(venueId, 'table_request_updated', updated);
            return updated;
        });
    }
}
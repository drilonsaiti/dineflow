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
                if (guestCount && guestCount > 0) {
                    perPersonCentsAtRequest = Math.round(totalCentsAtRequest / guestCount);
                }
            }

            const request = await tx.tableRequest.create({
                data: { venueId: table.venueId, tableId: table.id, type, guestCount, totalCentsAtRequest, perPersonCentsAtRequest },
                include: { table: true },
            });
            this.gateway.emitTableRequestEvent(table.venueId, 'table_request_created', request);
            return request;
        });
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
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

    async create(tableToken: string, type: 'CALL_WAITER' | 'REQUEST_BILL_CASH') {
        const table = await this.tablesService.resolveByToken(tableToken);
        return this.prisma.withVenueScope(table.venueId, async (tx) => {
            const request = await tx.tableRequest.create({
                data: { venueId: table.venueId, tableId: table.id, type },
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
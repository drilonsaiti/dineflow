import {ForbiddenException, Injectable} from '@nestjs/common';
import {PrismaService} from '../prisma/prisma.service';

@Injectable()
export class TableAssignmentsService {
    constructor(private readonly prisma: PrismaService) {
    }

    list(venueId: string) {
        return this.prisma.withVenueScope(venueId, (tx) =>
            tx.staffTableAssignment.findMany({
                where: {venueId},
                include: {table: true, user: {select: {id: true, email: true, fullName: true}}},
            }),
        );
    }

    claim(venueId: string, tableId: string, userId: string) {
        return this.prisma.withVenueScope(venueId, (tx) =>
            tx.staffTableAssignment.upsert({
                where: {tableId},
                update: {userId},
                create: {venueId, tableId, userId},
                include: {table: true, user: {select: {id: true, email: true, fullName: true}}},
            }),
        );
    }

    async release(venueId: string, tableId: string, requestingUserId: string, isManagerOrOwner: boolean) {
        return this.prisma.withVenueScope(venueId, async (tx) => {
            const existing = await tx.staffTableAssignment.findUnique({where: {tableId}});
            if (!existing) return {released: true};
            if (existing.userId !== requestingUserId && !isManagerOrOwner) {
                throw new ForbiddenException('Only the assigned staff member or a manager can release this table.');
            }
            await tx.staffTableAssignment.delete({where: {tableId}});
            return {released: true};
        });
    }
}
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

/** Backstop only — normal expiry happens naturally via
 * TablesService.assertSessionValid checking expiresAt on read, and via
 * closeActiveSession when a bill is resolved. This just keeps the DB tidy
 * by flipping status on rows nothing else got around to closing. */
@Injectable()
export class SessionExpiryService {
    private readonly logger = new Logger(SessionExpiryService.name);
    constructor(private readonly prisma: PrismaService) {}

    @Cron(CronExpression.EVERY_10_MINUTES)
    async expireStaleSessions() {
        const { count } = await this.prisma.tableSession.updateMany({
            where: { status: 'ACTIVE', expiresAt: { lt: new Date() } },
            data: { status: 'CLOSED', closedAt: new Date() },
        });
        if (count > 0) this.logger.log(`Closed ${count} expired table session(s)`);
    }
}
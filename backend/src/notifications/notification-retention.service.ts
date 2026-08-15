import {Injectable, Logger} from '@nestjs/common';
import {Cron, CronExpression} from '@nestjs/schedule';
import {PrismaService} from '../prisma/prisma.service';

/**
 * Purges NotificationLog rows past a retention window. This table exists
 * for short-term delivery-debugging ("did the SMS actually send"), not as
 * a permanent record — keeping it forever means keeping (masked) customer
 * contact-attempt history indefinitely for no operational reason.
 *
 * 90 days is a reasonable default for "long enough to debug a billing
 * dispute or a 'did I get notified' support question," short enough to not
 * accumulate PII-adjacent data indefinitely. Adjust RETENTION_DAYS if your
 * venues need longer for compliance/dispute-resolution reasons.
 */
@Injectable()
export class NotificationRetentionService {
    private readonly logger = new Logger(NotificationRetentionService.name);
    private readonly RETENTION_DAYS = 90;

    constructor(private readonly prisma: PrismaService) {
    }

    @Cron(CronExpression.EVERY_DAY_AT_3AM)
    async purgeOldLogs() {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - this.RETENTION_DAYS);

        const {count} = await this.prisma.notificationLog.deleteMany({
            where: {createdAt: {lt: cutoff}},
        });

        if (count > 0) this.logger.log(`Purged ${count} notification log(s) older than ${this.RETENTION_DAYS} days`);
    }
}
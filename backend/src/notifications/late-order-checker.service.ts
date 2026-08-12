import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { OrderStatus } from '@prisma/client';

/**
 * Structural counterpart to the dashboard's visual "sitting too long" flag
 * (section 10) — this is what makes that threshold also produce an actual
 * staff alert (section 15) rather than only a color change someone has to
 * be looking at the screen to notice.
 *
 * Runs every minute, checks each venue's own configured threshold (not a
 * single global constant), and alerts at most once per order — tracked via
 * NotificationLog rather than a separate "alreadyNotified" flag on Order,
 * so the audit trail IS the dedupe mechanism.
 */
@Injectable()
export class LateOrderCheckerService {
    private readonly logger = new Logger(LateOrderCheckerService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly notifications: NotificationsService,
    ) {}

    @Cron(CronExpression.EVERY_MINUTE)
    async checkForLateOrders() {
        const venues = await this.prisma.venue.findMany({
            where: { staffAlertWebhookUrl: { not: null } }, // skip venues that haven't configured alerting at all
            select: { id: true, lateOrderThresholdMinutes: true },
        });

        for (const venue of venues) {
            const cutoff = new Date(Date.now() - venue.lateOrderThresholdMinutes * 60_000);

            const lateOrders = await this.prisma.order.findMany({
                where: {
                    venueId: venue.id,
                    status: { in: [OrderStatus.RECEIVED, OrderStatus.VIEWED, OrderStatus.PREPARING] },
                    createdAt: { lt: cutoff },
                },
                select: { id: true },
            });

            for (const order of lateOrders) {
                const alreadyNotified = await this.prisma.notificationLog.findFirst({
                    where: { orderId: order.id, kind: 'STAFF_ORDER_LATE', status: 'sent' },
                });
                if (alreadyNotified) continue;

                await this.notifications.notifyStaffOrderLate(venue.id, order.id);
            }
        }
    }
}
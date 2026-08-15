import {Injectable, Logger} from '@nestjs/common';
import {Cron, CronExpression} from '@nestjs/schedule';
import {PrismaService} from '../prisma/prisma.service';
import {NotificationsService} from './notifications.service';
import {OrderStatus} from '@prisma/client';

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
    ) {
    }

    @Cron(CronExpression.EVERY_MINUTE)
    async checkForLateOrders() {
        const venues = await this.prisma.venue.findMany({
            where: {staffAlertWebhookUrl: {not: null}},
            select: {id: true, lateOrderThresholdMinutes: true},
        });

        for (const venue of venues) {
            await this.checkLateOrders(venue.id, venue.lateOrderThresholdMinutes);
            await this.checkStaleTableRequests(venue.id, venue.lateOrderThresholdMinutes);
        }
    }

    private async checkLateOrders(venueId: string, thresholdMinutes: number) {
        const cutoff = new Date(Date.now() - thresholdMinutes * 60_000);
        const lateOrders = await this.prisma.order.findMany({
            where: {
                venueId,
                status: {in: [OrderStatus.RECEIVED, OrderStatus.VIEWED, OrderStatus.PREPARING]},
                createdAt: {lt: cutoff},
            },
            select: {id: true},
        });

        for (const order of lateOrders) {
            const alreadyNotified = await this.prisma.notificationLog.findFirst({
                where: {orderId: order.id, kind: 'STAFF_ORDER_LATE', status: 'sent'},
            });
            if (alreadyNotified) continue;
            await this.notifications.notifyStaffOrderLate(venueId, order.id);
        }
    }

    /** A "call waiter" or "bring the bill" left unacknowledged past the
     * threshold is arguably more urgent than a slow kitchen ticket — a guest
     * is actively waiting on staff attention, not food prep. Reuses the same
     * threshold and webhook rather than adding a second configurable value,
     * since in practice venues want both alerted on roughly the same
     * urgency window. */
    private async checkStaleTableRequests(venueId: string, thresholdMinutes: number) {
        const cutoff = new Date(Date.now() - thresholdMinutes * 60_000);
        const stale = await this.prisma.tableRequest.findMany({
            where: {venueId, status: 'PENDING', createdAt: {lt: cutoff}},
            include: {table: true},
        });

        for (const request of stale) {
            const alreadyNotified = await this.prisma.notificationLog.findFirst({
                where: {orderId: request.id, kind: 'STAFF_ORDER_LATE', status: 'sent'},
            });
            if (alreadyNotified) continue;

            await this.notifications.notifyStaffTableRequestStale(venueId, request.id, request.table.label, request.type);
        }
    }
}
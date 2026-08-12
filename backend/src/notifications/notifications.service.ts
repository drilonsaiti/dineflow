import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SMS_PROVIDER, WEBHOOK_PROVIDER, SmsProvider, WebhookProvider } from './notification-provider.interface';
import { NotificationChannel, NotificationKind } from '@prisma/client';

@Injectable()
export class NotificationsService {
    constructor(
        private readonly prisma: PrismaService,
        @Inject(SMS_PROVIDER) private readonly smsProvider: SmsProvider,
        @Inject(WEBHOOK_PROVIDER) private readonly webhookProvider: WebhookProvider,
    ) {}

    /** Trigger point: OrdersService.advanceStatus calls this whenever an
     * order transitions into READY. Section 15: "SMS/push notification to
     * the customer when their order is Ready (would need an optional phone
     * number at order time)" — the phone number already exists on Order
     * from placeOrder; this only fires if the customer actually gave one. */
    async notifyCustomerOrderReady(venueId: string, orderId: string) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: { table: true },
        });

        if (!order?.customerPhone) {
            await this.log(venueId, orderId, 'CUSTOMER_ORDER_READY', 'SMS', 'n/a', 'skipped_not_configured');
            return;
        }

        const message = `Your order at ${order.table.label} is ready! 🎉`;
        const result = await this.smsProvider.send(order.customerPhone, message);

        await this.log(
            venueId,
            orderId,
            'CUSTOMER_ORDER_READY',
            'SMS',
            order.customerPhone,
            result.ok ? 'sent' : 'failed',
            result.detail,
        );
    }

    /** Trigger point: a scheduled check (see LateOrderCheckerService) calls
     * this for any order that's crossed the venue's lateOrderThresholdMinutes
     * without a status change. Section 15: "staff notification (e.g. Slack
     * webhook, email) for orders sitting too long unattended." Email isn't
     * implemented (no provider bound for it below) — only the webhook path
     * is live, since it needs no third-party account to actually work. */
    async notifyStaffOrderLate(venueId: string, orderId: string) {
        const venue = await this.prisma.venue.findUnique({ where: { id: venueId } });

        if (!venue?.staffAlertWebhookUrl) {
            await this.log(venueId, orderId, 'STAFF_ORDER_LATE', 'WEBHOOK', 'n/a', 'skipped_not_configured');
            return;
        }

        const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { table: true } });
        const result = await this.webhookProvider.post(venue.staffAlertWebhookUrl, {
            text: `⏰ Order #${order?.dailyNumber} at ${order?.table.label} has been unattended for over ${venue.lateOrderThresholdMinutes} minutes.`,
        });

        await this.log(
            venueId,
            orderId,
            'STAFF_ORDER_LATE',
            'WEBHOOK',
            venue.staffAlertWebhookUrl,
            result.ok ? 'sent' : 'failed',
            result.detail,
        );
    }

    private async log(
        venueId: string,
        orderId: string | null,
        kind: NotificationKind,
        channel: NotificationChannel,
        recipient: string,
        status: string,
        detail?: string,
    ) {
        await this.prisma.notificationLog.create({
            data: { venueId, orderId: orderId ?? undefined, kind, channel, recipient, status, detail },
        });
    }
}
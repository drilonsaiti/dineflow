import { Injectable, Logger } from '@nestjs/common';
import { WebhookProvider } from '../notification-provider.interface';

/**
 * Unlike SMS, a generic webhook POST (Slack incoming webhook, Discord,
 * a venue's own endpoint) needs no third-party SDK or account to be
 * genuinely functional — so this one is implemented for real, not stubbed.
 * It's still structured behind the interface so a future Slack-specific
 * provider (richer block formatting, etc.) can replace it without touching
 * NotificationsService.
 */
@Injectable()
export class HttpWebhookProvider implements WebhookProvider {
    private readonly logger = new Logger(HttpWebhookProvider.name);

    async post(url: string, payload: unknown) {
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                return { ok: false, detail: `Webhook returned ${res.status}` };
            }
            return { ok: true };
        } catch (err) {
            this.logger.warn(`Webhook delivery failed: ${(err as Error).message}`);
            return { ok: false, detail: (err as Error).message };
        }
    }
}
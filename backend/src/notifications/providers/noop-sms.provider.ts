import {Injectable, Logger} from '@nestjs/common';
import {SmsProvider} from '../notification-provider.interface';

/**
 * Default provider — logs instead of sending. This is intentional, not a
 * placeholder left unfinished: section 15 asks for the data model and the
 * seam, not a live SMS integration, and shipping a no-op keeps the code
 * honest about what actually happens today rather than silently failing
 * against unset Twilio credentials.
 *
 * To go live: implement SmsProvider against Twilio (or similar), then swap
 * the binding in NotificationsModule from NoopSmsProvider to the real class.
 * No other file changes.
 */
@Injectable()
export class NoopSmsProvider implements SmsProvider {
    private readonly logger = new Logger(NoopSmsProvider.name);

    async send(toPhoneNumber: string, message: string) {
        this.logger.log(`[SMS stub] would send to ${toPhoneNumber}: "${message}"`);
        return {ok: true, detail: 'no-op provider — not actually sent'};
    }
}
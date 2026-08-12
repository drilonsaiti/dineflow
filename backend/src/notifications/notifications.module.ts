import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service';
import { LateOrderCheckerService } from './late-order-checker.service';
import { NoopSmsProvider } from './providers/noop-sms.provider';
import { HttpWebhookProvider } from './providers/http-webhook.provider';
import { SMS_PROVIDER, WEBHOOK_PROVIDER } from './notification-provider.interface';

@Module({
    imports: [ScheduleModule.forRoot()],
    providers: [
        NotificationsService,
        LateOrderCheckerService,
        // The one place a real SMS provider gets swapped in later:
        { provide: SMS_PROVIDER, useClass: NoopSmsProvider },
        { provide: WEBHOOK_PROVIDER, useClass: HttpWebhookProvider },
    ],
    exports: [NotificationsService],
})
export class NotificationsModule {}
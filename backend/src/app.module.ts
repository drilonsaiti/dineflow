import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { VenuesModule } from './venues/venues.module';
import { OrdersModule } from './orders/orders.module';
import { MenuModule } from './menu/menu.module';
import { TablesModule } from './tables/tables.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { StorageModule } from './storage/storage.module';
import { NotificationsModule } from './notifications/notifications.module';
import { StaffModule } from './staff/staff.module';
import { TableRequestsModule } from './table-requests/table-requests.module';
import { BillingModule } from './billing/billing.module';
import {TableCartModule} from "./table-cart/table-cart.module";
import {TableAssignmentsModule} from "./table-assignments/table-assignments.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Global default: 60 requests/minute per IP across the whole API.
    // Specific endpoints (see OrdersController.placeOrder) override this
    // with a tighter limit where abuse risk is higher.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    CacheModule.register({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    VenuesModule,
    OrdersModule,
    MenuModule,
    TablesModule,
    AnalyticsModule,
    StorageModule,
    NotificationsModule,
    StaffModule,
    TableRequestsModule,
    BillingModule,
    TableCartModule,
    TableAssignmentsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
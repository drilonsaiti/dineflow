import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { VenuesModule } from './venues/venues.module';
import { OrdersModule } from './orders/orders.module';
import { MenuModule } from './menu/menu.module';
import { TablesModule } from './tables/tables.module';
import { AnalyticsModule } from './analytics/analytics.module';
import {StorageModule} from "./storage/storage.module";
import {NotificationsModule} from "./notifications/notifications.module";
import {StaffModule} from "./staff/staff.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
  ],
})
export class AppModule {}
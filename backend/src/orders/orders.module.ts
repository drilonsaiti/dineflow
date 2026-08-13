import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrdersGateway } from './orders.gateway';
import { TablesModule } from '../tables/tables.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TableCartModule } from '../table-cart/table-cart.module';
import { MenuModule } from '../menu/menu.module';

@Module({
  imports: [TablesModule, NotificationsModule, TableCartModule, MenuModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersGateway],
  exports: [OrdersGateway],
})
export class OrdersModule {}
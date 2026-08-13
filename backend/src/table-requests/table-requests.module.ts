import { Module } from '@nestjs/common';
import { TableRequestsService } from './table-requests.service';
import { TableRequestsController } from './table-requests.controller';
import { TablesModule } from '../tables/tables.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
    imports: [TablesModule, OrdersModule], // OrdersModule exports OrdersGateway implicitly via its providers — see note below
    controllers: [TableRequestsController],
    providers: [TableRequestsService],
})
export class TableRequestsModule {}
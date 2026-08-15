import {Module} from '@nestjs/common';
import {ScheduleModule} from '@nestjs/schedule';
import {TableRequestsService} from './table-requests.service';
import {TableRequestsController} from './table-requests.controller';
import {TablesModule} from '../tables/tables.module';
import {OrdersModule} from '../orders/orders.module';
import {SessionExpiryService} from './session-expiry.service';

@Module({
    imports: [TablesModule, OrdersModule, ScheduleModule.forRoot()],
    controllers: [TableRequestsController],
    providers: [TableRequestsService, SessionExpiryService],
})
export class TableRequestsModule {
}
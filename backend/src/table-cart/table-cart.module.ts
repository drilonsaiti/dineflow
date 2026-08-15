import {Module} from '@nestjs/common';
import {TableCartService} from './table-cart.service';
import {TableCartController} from './table-cart.controller';
import {TablesModule} from '../tables/tables.module';

@Module({
    imports: [TablesModule],
    controllers: [TableCartController],
    providers: [TableCartService],
    exports: [TableCartService],
})
export class TableCartModule {
}
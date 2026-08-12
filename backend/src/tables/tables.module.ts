import { Module } from '@nestjs/common';
import { TablesService } from './tables.service';
import { TablesController, PublicTablesController } from './tables.controller';

@Module({
    controllers: [TablesController, PublicTablesController],
    providers: [TablesService],
    exports: [TablesService],
})
export class TablesModule {}
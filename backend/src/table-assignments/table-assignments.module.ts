import {Module} from '@nestjs/common';
import {TableAssignmentsService} from './table-assignments.service';
import {TableAssignmentsController} from './table-assignments.controller';

@Module({
    controllers: [TableAssignmentsController],
    providers: [TableAssignmentsService],
})
export class TableAssignmentsModule {
}
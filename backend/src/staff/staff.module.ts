import {Module} from '@nestjs/common';
import {StaffService} from './staff.service';
import {StaffController} from './staff.controller';
import {StaffAuthController} from "./staff-auth.controller";

@Module({
    controllers: [StaffController,StaffAuthController],
    providers: [StaffService],
})
export class StaffModule {
}
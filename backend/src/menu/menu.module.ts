import {Module} from '@nestjs/common';
import {MenuService} from './menu.service';
import {MenuController, PublicMenuController} from './menu.controller';

@Module({
    controllers: [MenuController, PublicMenuController],
    providers: [MenuService],
    exports: [MenuService],
})
export class MenuModule {
}
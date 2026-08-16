import {Body, Controller, Delete, Get, Param, Patch, Post, Query} from '@nestjs/common';
import {Throttle} from '@nestjs/throttler';
import {TableCartService} from './table-cart.service';
import {AddCartItemDto, UpdateCartItemDto} from './dto/table-cart.dto';
import {Public} from '../auth/public.decorator';

@Controller('public/table-cart')
export class TableCartController {
    constructor(private readonly cartService: TableCartService) {
    }

    @Public()
    @Get(':token')
    list(@Param('token') token: string) {
        return this.cartService.list(token);
    }

    @Throttle({default: {limit: 30, ttl: 60_000}})
    @Public()
    @Post()
    add(@Body() dto: AddCartItemDto) {
        return this.cartService.add(dto);
    }

    @Throttle({ default: { limit: 30, ttl: 60_000 } })
    @Public()
    @Patch(':token/items/:itemId')
    update(
        @Param('token') token: string,
        @Param('itemId') itemId: string,
        @Query('session') session: string,
        @Body() dto: UpdateCartItemDto,
    ) {
        return this.cartService.update(token, itemId, session, dto);
    }

    @Throttle({ default: { limit: 30, ttl: 60_000 } })
    @Public()
    @Delete(':token/items/:itemId')
    remove(@Param('token') token: string, @Param('itemId') itemId: string, @Query('session') session: string) {
        return this.cartService.remove(token, itemId, session);
    }

    @Public()
    @Post(':token/bulk-remove')
    bulkRemove(
        @Param('token') token: string,
        @Query('session') session: string,
        @Body('menuItemIds') menuItemIds: string[],
    ) {
        return this.cartService.removeByMenuItemIds(token, menuItemIds, session);
    }
}
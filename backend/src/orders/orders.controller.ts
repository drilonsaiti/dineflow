import {Body, Controller, Get, Param, Patch, Post, Query, UseGuards} from '@nestjs/common';
import {OrdersService} from './orders.service';
import {PlaceOrderDto} from './dto/place-order.dto';
import {Public} from '../auth/public.decorator';
import {VenueScopeGuard} from '../common/venue-scope.guard';
import {CurrentUser, CurrentVenue} from '../common/current-user.decorator';
import {AuthenticatedUser} from '../auth/supabase-jwt.strategy';
import {OrderStatus} from '@prisma/client';
import {IsIn} from 'class-validator';
import {Throttle} from '@nestjs/throttler';
import {SubmitFeedbackDto} from "./submit-feedback.dto";

class AdvanceStatusDto {
    @IsIn(Object.values(OrderStatus))
    status!: OrderStatus;
}

@Controller()
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) {
    }

    // ----- Public customer flow (no auth — zero login by design) -----

    @Throttle({default: {limit: 30, ttl: 60_000}})
    @Public()
    @Post('public/orders')
    placeOrder(@Body() dto: PlaceOrderDto) {
        return this.ordersService.placeOrder(dto);
    }

    @Public()
    @Get('public/orders/:orderId')
    trackOrder(@Param('orderId') orderId: string, @Query('table') tableToken: string) {
        return this.ordersService.getForCustomer(orderId, tableToken);
    }

    // ----- Staff dashboard (authenticated, venue-scoped) -----

    @Get('venues/:venueId/orders')
    @UseGuards(VenueScopeGuard)
    listForVenue(
        @CurrentVenue() scope: { venueId: string },
        @Query('station') station?: string,
        @Query('take') take?: string,
        @Query('skip') skip?: string,
    ) {
        return this.ordersService.listForVenue(scope.venueId, station, Number(take) || 100, Number(skip) || 0);
    }

    @Patch('venues/:venueId/orders/:orderId/status')
    @UseGuards(VenueScopeGuard)
    advanceStatus(
        @CurrentVenue() scope: { venueId: string; role: string },
        @Param('orderId') orderId: string,
        @Body() dto: AdvanceStatusDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.ordersService.advanceStatus(scope.venueId, orderId, dto.status, user.id, scope.role);
    }

    @Get('venues/:venueId/tables/:tableId/orders')
    @UseGuards(VenueScopeGuard)
    listForTable(@CurrentVenue() scope: { venueId: string }, @Param('tableId') tableId: string) {
        return this.ordersService.listForTable(scope.venueId, tableId);
    }

    @Throttle({ default: { limit: 3, ttl: 60_000 } })
    @Public()
    @Post('public/orders/:orderId/feedback')
    submitFeedback(@Param('orderId') orderId: string, @Body() dto: SubmitFeedbackDto) {
        return this.ordersService.submitFeedback(orderId, dto);
    }

    @Public()
    @Get('public/tables/:token/tab')
    getTableTab(@Param('token') token: string, @Query('session') session: string) {
        return this.ordersService.getTableTab(token, session);
    }

    @Get('venues/:venueId/orders/:orderId')
    @UseGuards(VenueScopeGuard)
    getOne(@CurrentVenue() scope: { venueId: string }, @Param('orderId') orderId: string) {
        return this.ordersService.getOneForVenue(scope.venueId, orderId);
    }

    @Public()
    @Get('public/tables/:token/itemized-bill')
    getItemizedBill(@Param('token') token: string, @Query('session') session: string) {
        return this.ordersService.getItemizedBill(token, session);
    }

    @Patch('venues/:venueId/orders/:orderId/fire-course')
    @UseGuards(VenueScopeGuard)
    fireCourse(@CurrentVenue() scope: { venueId: string }, @Param('orderId') orderId: string, @Body('courseNumber') courseNumber: number) {
        return this.ordersService.fireCourse(scope.venueId, orderId, courseNumber);
    }
}

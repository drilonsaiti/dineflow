import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PlaceOrderDto } from './dto/place-order.dto';
import { Public } from '../auth/public.decorator';
import { VenueScopeGuard } from '../common/venue-scope.guard';
import { CurrentUser, CurrentVenue } from '../common/current-user.decorator';
import { AuthenticatedUser } from '../auth/supabase-jwt.strategy';
import { OrderStatus } from '@prisma/client';
import { IsIn } from 'class-validator';
import { Throttle } from '@nestjs/throttler';

class AdvanceStatusDto {
  @IsIn(Object.values(OrderStatus))
  status!: OrderStatus;
}

@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ----- Public customer flow (no auth — zero login by design) -----

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
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
  listForVenue(@CurrentVenue() scope: { venueId: string }, @Query('station') station?: string) {
    return this.ordersService.listForVenue(scope.venueId, station);
  }

  @Patch('venues/:venueId/orders/:orderId/status')
  @UseGuards(VenueScopeGuard)
  advanceStatus(
    @CurrentVenue() scope: { venueId: string },
    @Param('orderId') orderId: string,
    @Body() dto: AdvanceStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.advanceStatus(scope.venueId, orderId, dto.status, user.id);
  }

  @Get('venues/:venueId/tables/:tableId/orders')
  @UseGuards(VenueScopeGuard)
  listForTable(@CurrentVenue() scope: { venueId: string }, @Param('tableId') tableId: string) {
    return this.ordersService.listForTable(scope.venueId, tableId);
  }
}

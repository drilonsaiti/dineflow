import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { TableRequestsService } from './table-requests.service';
import { CreateTableRequestDto } from './dto/create-table-request.dto';
import { Public } from '../auth/public.decorator';
import { VenueScopeGuard } from '../common/venue-scope.guard';
import { CurrentUser, CurrentVenue } from '../common/current-user.decorator';
import { AuthenticatedUser } from '../auth/supabase-jwt.strategy';

@Controller()
export class TableRequestsController {
    constructor(private readonly service: TableRequestsService) {}

    @Throttle({ default: { limit: 6, ttl: 60_000 } })
    @Public()
    @Post('public/table-requests')
    create(@Body() dto: CreateTableRequestDto) {
        return this.service.create(dto.tableToken, dto.type, dto.guestCount);
    }

    @Get('venues/:venueId/table-requests')
    @UseGuards(VenueScopeGuard)
    list(@CurrentVenue() scope: { venueId: string }) {
        return this.service.listActive(scope.venueId);
    }

    @Patch('venues/:venueId/table-requests/:id/acknowledge')
    @UseGuards(VenueScopeGuard)
    acknowledge(
        @CurrentVenue() scope: { venueId: string },
        @Param('id') id: string,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.service.acknowledge(scope.venueId, id, user.id);
    }

    @Patch('venues/:venueId/table-requests/:id/resolve')
    @UseGuards(VenueScopeGuard)
    resolve(@CurrentVenue() scope: { venueId: string }, @Param('id') id: string) {
        return this.service.resolve(scope.venueId, id);
    }

    @Public()
    @Get('public/table-requests/:token/active')
    getActive(@Param('token') token: string) {
        return this.service.getActiveForTable(token);
    }
}
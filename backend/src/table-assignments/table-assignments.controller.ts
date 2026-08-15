import {Body, Controller, Delete, Get, Param, Post, UseGuards} from '@nestjs/common';
import {TableAssignmentsService} from './table-assignments.service';
import {VenueScopeGuard} from '../common/venue-scope.guard';
import {CurrentUser, CurrentVenue} from '../common/current-user.decorator';
import {AuthenticatedUser} from '../auth/supabase-jwt.strategy';
import {VenueRole} from '@prisma/client';

@Controller('venues/:venueId/table-assignments')
@UseGuards(VenueScopeGuard)
export class TableAssignmentsController {
    constructor(private readonly service: TableAssignmentsService) {
    }

    @Get()
    list(@CurrentVenue() scope: { venueId: string }) {
        return this.service.list(scope.venueId);
    }

    @Post()
    claim(
        @CurrentVenue() scope: { venueId: string },
        @Body('tableId') tableId: string,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.service.claim(scope.venueId, tableId, user.id);
    }

    @Delete(':tableId')
    release(
        @CurrentVenue() scope: { venueId: string; role: VenueRole },
        @Param('tableId') tableId: string,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        const isManagerOrOwner = ['OWNER', 'MANAGER'].includes(scope.role as string);
        return this.service.release(scope.venueId, tableId, user.id, isManagerOrOwner);
    }
}
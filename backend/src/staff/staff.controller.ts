import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { StaffService } from './staff.service';
import { InviteStaffDto } from './dto/invite-staff.dto';
import { VenueScopeGuard } from '../common/venue-scope.guard';
import { Roles } from '../common/roles.decorator';
import { CurrentUser, CurrentVenue } from '../common/current-user.decorator';
import { AuthenticatedUser } from '../auth/supabase-jwt.strategy';
import { VenueRole } from '@prisma/client';

@Controller('venues/:venueId/staff')
@UseGuards(VenueScopeGuard)
@Roles(VenueRole.OWNER, VenueRole.MANAGER)
export class StaffController {
    constructor(private readonly staffService: StaffService) {}

    @Get()
    list(@CurrentVenue() scope: { venueId: string }) {
        return this.staffService.list(scope.venueId);
    }

    @Post('invite')
    invite(@CurrentVenue() scope: { venueId: string }, @Body() dto: InviteStaffDto) {
        return this.staffService.invite(scope.venueId, dto);
    }

    @Delete(':userId')
    remove(
        @CurrentVenue() scope: { venueId: string },
        @Param('userId') userId: string,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.staffService.remove(scope.venueId, userId, user.id);
    }
}
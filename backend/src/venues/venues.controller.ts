import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { VenuesService } from './venues.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { CurrentUser, CurrentVenue } from '../common/current-user.decorator';
import { AuthenticatedUser } from '../auth/supabase-jwt.strategy';
import { VenueScopeGuard } from '../common/venue-scope.guard';
import { UpdateVenueSettingsDto } from './dto/update-venue-settings.dto';
import { Roles } from '../common/roles.decorator';
import { VenueRole } from '@prisma/client';


@Controller('venues')
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  // No :venueId yet — this is the onboarding entry point (section 4).
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateVenueDto) {
    return this.venuesService.create(user.id, dto);
  }

  @Get('mine')
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.venuesService.listForUser(user.id);
  }

  @Get(':venueId')
  @UseGuards(VenueScopeGuard)
  getOne(@CurrentVenue() scope: { venueId: string }) {
    return this.venuesService.getById(scope.venueId);
  }

  @Post(':venueId/settings')
  @UseGuards(VenueScopeGuard)
  @Roles(VenueRole.OWNER, VenueRole.MANAGER)
  updateSettings(
      @CurrentVenue() scope: { venueId: string },
      @Body() dto: UpdateVenueSettingsDto,
  ) {
    return this.venuesService.updateSettings(scope.venueId, dto);
  }
}

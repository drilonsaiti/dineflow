import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { VenuesService } from './venues.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { CurrentUser, CurrentVenue } from '../common/current-user.decorator';
import { AuthenticatedUser } from '../auth/supabase-jwt.strategy';
import { VenueScopeGuard } from '../common/venue-scope.guard';

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
}

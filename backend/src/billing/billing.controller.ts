import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { VenueScopeGuard } from '../common/venue-scope.guard';
import { Roles } from '../common/roles.decorator';
import { CurrentUser, CurrentVenue } from '../common/current-user.decorator';
import { AuthenticatedUser } from '../auth/supabase-jwt.strategy';
import { VenueRole } from '@prisma/client';
import { IsIn } from 'class-validator';
import {BillingService} from "./biling.service";

class CreateCheckoutDto {
    @IsIn(['PRO', 'BUSINESS'])
    plan!: 'PRO' | 'BUSINESS';
}

@Controller('venues/:venueId/billing')
@UseGuards(VenueScopeGuard)
@Roles(VenueRole.OWNER) // billing is owner-only, per section 3
export class BillingController {
    constructor(private readonly billingService: BillingService) {}

    @Post('checkout-session')
    createCheckout(
        @CurrentVenue() scope: { venueId: string },
        @Body() dto: CreateCheckoutDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.billingService.createCheckoutSession(scope.venueId, dto.plan, user.email);
    }

    @Post('portal-session')
    createPortal(@CurrentVenue() scope: { venueId: string }) {
        return this.billingService.createPortalSession(scope.venueId);
    }
}
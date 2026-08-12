import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { VenueScopeGuard } from '../common/venue-scope.guard';
import { Roles } from '../common/roles.decorator';
import { CurrentVenue } from '../common/current-user.decorator';
import { VenueRole } from '@prisma/client';

@Controller('venues/:venueId/analytics')
@UseGuards(VenueScopeGuard)
@Roles(VenueRole.OWNER, VenueRole.MANAGER) // section 3: analytics is owner/manager, not floor staff
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) {}

    private parseSince(since?: string): Date | undefined {
        if (!since) return undefined;
        const d = new Date(since);
        return Number.isNaN(d.getTime()) ? undefined : d;
    }

    @Get('summary')
    getSummary(@CurrentVenue() scope: { venueId: string }) {
        return this.analyticsService.getSummary(scope.venueId);
    }

    @Get('avg-time-to-ready')
    getAvgTimeToReady(@CurrentVenue() scope: { venueId: string }, @Query('since') since?: string) {
        return this.analyticsService.getAvgTimeToReady(scope.venueId, this.parseSince(since));
    }

    @Get('best-sellers')
    getBestSellers(@CurrentVenue() scope: { venueId: string }, @Query('since') since?: string) {
        return this.analyticsService.getBestSellers(scope.venueId, this.parseSince(since));
    }

    @Get('busiest-tables')
    getBusiestTables(@CurrentVenue() scope: { venueId: string }, @Query('since') since?: string) {
        return this.analyticsService.getBusiestTables(scope.venueId, this.parseSince(since));
    }

    @Get('busiest-hours')
    getBusiestHours(@CurrentVenue() scope: { venueId: string }, @Query('since') since?: string) {
        return this.analyticsService.getBusiestHours(scope.venueId, this.parseSince(since));
    }
}
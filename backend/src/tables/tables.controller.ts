import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Res,
    UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { TablesService } from './tables.service';
import { CreateAreaDto, CreateTableDto, UpdateTableDto } from './dto/table.dto';
import { VenueScopeGuard } from '../common/venue-scope.guard';
import { Roles } from '../common/roles.decorator';
import { CurrentVenue } from '../common/current-user.decorator';
import { Public } from '../auth/public.decorator';
import { VenueRole } from '@prisma/client';

@Controller('venues/:venueId')
@UseGuards(VenueScopeGuard)
export class TablesController {
    constructor(private readonly tablesService: TablesService) {}

    @Get('areas')
    listAreas(@CurrentVenue() scope: { venueId: string }) {
        return this.tablesService.listAreas(scope.venueId);
    }

    @Post('areas')
    @Roles(VenueRole.OWNER, VenueRole.MANAGER)
    createArea(@CurrentVenue() scope: { venueId: string }, @Body() dto: CreateAreaDto) {
        return this.tablesService.createArea(scope.venueId, dto);
    }

    @Delete('areas/:areaId')
    @Roles(VenueRole.OWNER, VenueRole.MANAGER)
    deleteArea(@CurrentVenue() scope: { venueId: string }, @Param('areaId') areaId: string) {
        return this.tablesService.deleteArea(scope.venueId, areaId);
    }

    @Get('tables')
    listTables(@CurrentVenue() scope: { venueId: string }) {
        return this.tablesService.listTables(scope.venueId);
    }

    @Post('tables')
    @Roles(VenueRole.OWNER, VenueRole.MANAGER)
    createTable(@CurrentVenue() scope: { venueId: string }, @Body() dto: CreateTableDto) {
        return this.tablesService.createTable(scope.venueId, dto);
    }

    @Patch('tables/:tableId')
    @Roles(VenueRole.OWNER, VenueRole.MANAGER)
    updateTable(
        @CurrentVenue() scope: { venueId: string },
        @Param('tableId') tableId: string,
        @Body() dto: UpdateTableDto,
    ) {
        return this.tablesService.updateTable(scope.venueId, tableId, dto);
    }

    @Patch('tables/:tableId/deactivate')
    @Roles(VenueRole.OWNER, VenueRole.MANAGER)
    deactivateTable(@CurrentVenue() scope: { venueId: string }, @Param('tableId') tableId: string) {
        return this.tablesService.deactivateTable(scope.venueId, tableId);
    }

    @Patch('tables/:tableId/reactivate')
    @Roles(VenueRole.OWNER, VenueRole.MANAGER)
    reactivateTable(@CurrentVenue() scope: { venueId: string }, @Param('tableId') tableId: string) {
        return this.tablesService.reactivateTable(scope.venueId, tableId);
    }

    @Post('tables/:tableId/regenerate-token')
    @Roles(VenueRole.OWNER, VenueRole.MANAGER)
    regenerateToken(@CurrentVenue() scope: { venueId: string }, @Param('tableId') tableId: string) {
        return this.tablesService.regenerateToken(scope.venueId, tableId);
    }

    @Get('tables/:tableId/qr.png')
    @Roles(VenueRole.OWNER, VenueRole.MANAGER)
    async downloadPng(
        @CurrentVenue() scope: { venueId: string },
        @Param('tableId') tableId: string,
        @Res() res: Response,
    ) {
        const { buffer, filename } = await this.tablesService.getQrPng(scope.venueId, tableId);
        res.set({ 'Content-Type': 'image/png', 'Content-Disposition': `attachment; filename="${filename}"` });
        res.send(buffer);
    }

    @Get('tables/:tableId/qr.svg')
    @Roles(VenueRole.OWNER, VenueRole.MANAGER)
    async downloadSvg(
        @CurrentVenue() scope: { venueId: string },
        @Param('tableId') tableId: string,
        @Res() res: Response,
    ) {
        const { svg, filename } = await this.tablesService.getQrSvg(scope.venueId, tableId);
        res.set({ 'Content-Type': 'image/svg+xml', 'Content-Disposition': `attachment; filename="${filename}"` });
        res.send(svg);
    }

    @Get('tables/qr-bulk.zip')
    @Roles(VenueRole.OWNER, VenueRole.MANAGER)
    async downloadBulkZip(@CurrentVenue() scope: { venueId: string }, @Res() res: Response) {
        const stream = await this.tablesService.getBulkQrZipStream(scope.venueId);
        res.set({
            'Content-Type': 'application/zip',
            'Content-Disposition': 'attachment; filename="qr-codes.zip"',
        });
        stream.pipe(res);
    }
}

// Public: resolves a scanned QR's token into venue/table info for the
// customer landing page ("You're ordering for Table 4" — section 7). No
// venueId param, no VenueScopeGuard — the token itself is the authority.
@Controller('public/tables')
export class PublicTablesController {
    constructor(private readonly tablesService: TablesService) {}

    @Public()
    @Get(':token')
    async resolve(@Param('token') token: string) {
        const table = await this.tablesService.resolveByToken(token);
        return {
            table: { id: table.id, label: table.label },
            venue: {
                slug: table.venue.slug,
                name: table.venue.name,
                logoUrl: table.venue.logoUrl,
                brandColor: table.venue.brandColor,
                currency: table.venue.currency,
            },
            area: table.area ? { name: table.area.name } : null,
        };
    }
}
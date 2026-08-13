import {
    BadRequestException,
    GoneException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import archiver from 'archiver';
import { PassThrough } from 'stream';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAreaDto, CreateTableDto, UpdateTableDto } from './dto/table.dto';

@Injectable()
export class TablesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly config: ConfigService,
    ) {}

    // ---------- URL construction ----------

    /** Encodes both venue and table unambiguously (section 6) in one opaque
     * URL: human-readable slug for the venue, unguessable token for the
     * table. The token alone is what actually authorizes anything server-side
     * (see TablesService.resolveByToken) — the slug in the URL is only for
     * a nicer link/branding, never trusted on its own. */
    buildTableUrl(venueSlug: string, token: string): string {
        const base = this.config.get<string>('PUBLIC_APP_URL') ?? 'http://localhost:3000';
        return `${base}/r/${venueSlug}/t/${token}`;
    }

    private async qrDataUrl(venueSlug: string, token: string): Promise<string> {
        return QRCode.toDataURL(this.buildTableUrl(venueSlug, token), {
            margin: 1,
            width: 400,
        });
    }

    // ---------- Areas ----------

    listAreas(venueId: string) {
        return this.prisma.withVenueScope(venueId, (tx) =>
            tx.area.findMany({ where: { venueId }, orderBy: { name: 'asc' } }),
        );
    }

    createArea(venueId: string, dto: CreateAreaDto) {
        return this.prisma.withVenueScope(venueId, (tx) =>
            tx.area.create({ data: { venueId, name: dto.name } }),
        );
    }

    async deleteArea(venueId: string, areaId: string) {
        return this.prisma.withVenueScope(venueId, async (tx) => {
            const area = await tx.area.findUnique({ where: { id: areaId } });
            if (!area || area.venueId !== venueId) throw new NotFoundException('Area not found');
            // Un-group any tables rather than blocking the delete or cascading
            // into deleting tables (section 6 areas are organizational, not
            // load-bearing for a table's identity/order history).
            await tx.table.updateMany({ where: { areaId }, data: { areaId: null } });
            return tx.area.delete({ where: { id: areaId } });
        });
    }

    // ---------- Tables ----------

    async listTables(venueId: string) {
        return this.prisma.withVenueScope(venueId, async (tx) => {
            const venue = await tx.venue.findUniqueOrThrow({ where: { id: venueId } });
            const tables = await tx.table.findMany({
                where: { venueId },
                include: { area: true },
                orderBy: { label: 'asc' },
            });
            return Promise.all(
                tables.map(async (t) => ({
                    ...t,
                    orderingUrl: this.buildTableUrl(venue.slug, t.token),
                    qrDataUrl: await this.qrDataUrl(venue.slug, t.token),
                })),
            );
        });
    }

    async createTable(venueId: string, dto: CreateTableDto) {
        return this.prisma.withVenueScope(venueId, async (tx) => {
            const venue = await tx.venue.findUniqueOrThrow({ where: { id: venueId } });

            // Plan-gated seam from section 16, made real rather than decorative:
            // FREE plan caps active tables at venue.maxTables.
            const activeCount = await tx.table.count({ where: { venueId, isActive: true } });
            if (activeCount >= venue.maxTables) {
                throw new BadRequestException(
                    `Your plan (${venue.plan}) allows up to ${venue.maxTables} tables. ` +
                    `Upgrade to add more.`,
                );
            }

            if (dto.areaId) {
                const area = await tx.area.findUnique({ where: { id: dto.areaId } });
                if (!area || area.venueId !== venueId) throw new NotFoundException('Area not found');
            }

            const table = await tx.table.create({
                data: { venueId, label: dto.label, areaId: dto.areaId },
            });
            return { ...table, orderingUrl: this.buildTableUrl(venue.slug, table.token) };
        });
    }

    async updateTable(venueId: string, tableId: string, dto: UpdateTableDto) {
        return this.prisma.withVenueScope(venueId, async (tx) => {
            await this.assertTableInVenue(tx, venueId, tableId);
            if (dto.areaId) {
                const area = await tx.area.findUnique({ where: { id: dto.areaId } });
                if (!area || area.venueId !== venueId) throw new NotFoundException('Area not found');
            }
            return tx.table.update({
                where: { id: tableId },
                data: { label: dto.label, areaId: dto.areaId },
            });
        });
    }

    /** Soft-remove from the floor (section 6) — order history for this table
     * is preserved, and a scan of its old QR code shows a clear "no longer
     * active" message (section 18) instead of a crash. */
    async deactivateTable(venueId: string, tableId: string) {
        return this.prisma.withVenueScope(venueId, async (tx) => {
            await this.assertTableInVenue(tx, venueId, tableId);
            return tx.table.update({ where: { id: tableId }, data: { isActive: false } });
        });
    }

    async reactivateTable(venueId: string, tableId: string) {
        return this.prisma.withVenueScope(venueId, async (tx) => {
            await this.assertTableInVenue(tx, venueId, tableId);
            return tx.table.update({ where: { id: tableId }, data: { isActive: true } });
        });
    }

    /** New opaque token = old printed QR code stops working immediately
     * (section 6: "regenerate a table's QR code if needed, invalidating the
     * old one" — e.g. a stolen/misused code). */
    async regenerateToken(venueId: string, tableId: string) {
        return this.prisma.withVenueScope(venueId, async (tx) => {
            await this.assertTableInVenue(tx, venueId, tableId);
            const venue = await tx.venue.findUniqueOrThrow({ where: { id: venueId } });
            const table = await tx.table.update({
                where: { id: tableId },
                data: { token: crypto.randomUUID() },
            });
            return {
                ...table,
                orderingUrl: this.buildTableUrl(venue.slug, table.token),
                qrDataUrl: await this.qrDataUrl(venue.slug, table.token),
            };
        });
    }

    private async assertTableInVenue(tx: any, venueId: string, tableId: string) {
        const table = await tx.table.findUnique({ where: { id: tableId } });
        if (!table || table.venueId !== venueId) throw new NotFoundException('Table not found');
    }

    // ---------- QR file output ----------

    async getQrPng(venueId: string, tableId: string): Promise<{ buffer: Buffer; filename: string }> {
        return this.prisma.withVenueScope(venueId, async (tx) => {
            await this.assertTableInVenue(tx, venueId, tableId);
            const venue = await tx.venue.findUniqueOrThrow({ where: { id: venueId } });
            const table = await tx.table.findUniqueOrThrow({ where: { id: tableId }, include: { area: true } });
            const buffer = await QRCode.toBuffer(this.buildTableUrl(venue.slug, table.token), {
                margin: 1,
                width: 800,
            });
            return { buffer, filename: this.qrFilename(table, 'png') };
        });
    }

    async getQrSvg(venueId: string, tableId: string): Promise<{ svg: string; filename: string }> {
        return this.prisma.withVenueScope(venueId, async (tx) => {
            await this.assertTableInVenue(tx, venueId, tableId);
            const venue = await tx.venue.findUniqueOrThrow({ where: { id: venueId } });
            const table = await tx.table.findUniqueOrThrow({ where: { id: tableId }, include: { area: true } });
            const svg = await QRCode.toString(this.buildTableUrl(venue.slug, table.token), {
                type: 'svg',
                margin: 1,
            });
            return { svg, filename: this.qrFilename(table, 'svg') };
        });
    }

    /** Bulk download (section 6: "download all as a zip") — one PNG per
     * active table, streamed as a zip. Returns a readable stream so the
     * controller can pipe it straight to the HTTP response without buffering
     * the whole archive in memory. */
    async getBulkQrZipStream(venueId: string): Promise<PassThrough> {
        return this.prisma.withVenueScope(venueId, async (tx) => {
            const venue = await tx.venue.findUniqueOrThrow({ where: { id: venueId } });
            const tables = await tx.table.findMany({ where: { venueId, isActive: true } });

            const output = new PassThrough();
            const archive = archiver('zip', { zlib: { level: 9 } });
            archive.pipe(output);

            for (const table of tables) {
                const png = await QRCode.toBuffer(this.buildTableUrl(venue.slug, table.token), {
                    margin: 1,
                    width: 800,
                });
                const safeName = table.label.replace(/[^a-z0-9-_]+/gi, '_');
                archive.append(png, { name: `${safeName}.png` });
            }

            archive.finalize();
            return output;
        });
    }

    // ---------- Public resolution (used by the customer flow) ----------

    /** The single place a table token is resolved to (venue, table) —
     * OrdersService.placeOrder and the public landing page both go through
     * this, so the "deactivated table" edge case (section 18) is handled
     * once, not duplicated. */
    async resolveByToken(token: string) {
        const table = await this.prisma.table.findUnique({
            where: { token },
            include: { venue: true, area: true },
        });
        if (!table) throw new NotFoundException('This QR code is not recognized.');
        if (!table.isActive) {
            throw new GoneException('This table is no longer active. Please ask staff for help.');
        }
        return table;
    }

    private qrFilename(table: { label: string; area?: { name: string } | null }, ext: 'png' | 'svg'): string {
        const parts = [table.area?.name, table.label].filter(Boolean);
        const safe = parts.join('-').replace(/[^a-z0-9-_]+/gi, '_').toLowerCase();
        return `${safe || 'table'}.${ext}`;
    }
}
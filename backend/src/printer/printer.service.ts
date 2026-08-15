import {Injectable, Logger} from '@nestjs/common';
import {PrismaService} from '../prisma/prisma.service';

/**
 * Pushes a ticket to the venue's configured ESC/POS bridge, if set.
 * This service does NOT talk raw ESC/POS itself — browsers/Node's fetch
 * can't open a raw TCP socket to a thermal printer's port 9100 the way a
 * native app can. It POSTs a plain JSON ticket to printerBridgeUrl, and
 * expects a small always-on program on the venue's local network (see
 * printer-bridge/README.md at the repo root) to receive that JSON and
 * translate it into actual ESC/POS commands sent to the physical printer.
 * If printerBridgeUrl isn't set, this silently no-ops — Tier 1 (the
 * browser print ticket) is what most venues will actually use.
 */
@Injectable()
export class PrinterService {
    private readonly logger = new Logger(PrinterService.name);

    constructor(private readonly prisma: PrismaService) {
    }

    async printOrderTicket(venueId: string, orderId: string) {
        const venue = await this.prisma.venue.findUnique({where: {id: venueId}});
        if (!venue?.printerBridgeUrl) return;

        const order = await this.prisma.order.findUnique({
            where: {id: orderId},
            include: {items: {include: {menuItem: true, modifiers: {include: {modifierOption: true}}}}, table: true},
        });
        if (!order) return;

        try {
            await fetch(venue.printerBridgeUrl, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    orderNumber: order.dailyNumber,
                    table: order.table.label,
                    items: order.items.map((i) => ({
                        quantity: i.quantity,
                        name: i.menuItem.name,
                        note: i.note,
                        modifiers: i.modifiers.map((m) => m.modifierOption.name),
                    })),
                }),
            });
        } catch (err) {
            this.logger.warn(`Printer bridge unreachable for venue ${venueId}: ${(err as Error).message}`);
            // Non-fatal by design — a printer being offline should never block
            // an order from being placed or shown on the dashboard.
        }
    }
}
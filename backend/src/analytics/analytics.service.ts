import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

function startOfDay(d = new Date()) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}
function startOfWeek(d = new Date()) {
    const x = startOfDay(d);
    const day = x.getDay(); // 0 = Sunday
    x.setDate(x.getDate() - day);
    return x;
}

@Injectable()
export class AnalyticsService {
    constructor(private readonly prisma: PrismaService) {}

    /** Clamps any caller-requested range to the venue's plan-gated analytics
     * history window (section 16 — the seam Stripe Billing plugs into later:
     * upgrading a plan raises `analyticsHistoryDays`, nothing else changes). */
    private async clampSince(venueId: string, requestedSince?: Date): Promise<Date> {
        const venue = await this.prisma.venue.findUniqueOrThrow({ where: { id: venueId } });
        const earliestAllowed = new Date();
        earliestAllowed.setDate(earliestAllowed.getDate() - venue.analyticsHistoryDays);
        if (!requestedSince || requestedSince < earliestAllowed) return earliestAllowed;
        return requestedSince;
    }

    async getSummary(venueId: string) {
        return this.prisma.withVenueScope(venueId, async (tx) => {
            const today = startOfDay();
            const weekStart = startOfWeek();
            const completedFilter = { status: { notIn: [OrderStatus.CANCELLED] } };

            const [todayAgg, weekAgg] = await Promise.all([
                tx.order.aggregate({
                    where: { venueId, createdAt: { gte: today }, ...completedFilter },
                    _count: true,
                    _sum: { totalCents: true },
                }),
                tx.order.aggregate({
                    where: { venueId, createdAt: { gte: weekStart }, ...completedFilter },
                    _count: true,
                    _sum: { totalCents: true },
                }),
            ]);

            return {
                ordersToday: todayAgg._count,
                revenueTodayCents: todayAgg._sum.totalCents ?? 0,
                ordersThisWeek: weekAgg._count,
                revenueThisWeekCents: weekAgg._sum.totalCents ?? 0,
            };
        });
    }

    /** Average minutes from RECEIVED to READY (kitchen speed — section 17),
     * computed from the OrderStatusEvent audit trail rather than approximated
     * from Order timestamps, since that trail is exactly what it exists for. */
    async getAvgTimeToReady(venueId: string, since?: Date) {
        const clampedSince = await this.clampSince(venueId, since);

        return this.prisma.withVenueScope(venueId, async (tx) => {
            const orders = await tx.order.findMany({
                where: { venueId, createdAt: { gte: clampedSince }, status: { notIn: ['CANCELLED'] } },
                select: {
                    statusEvents: { select: { status: true, changedAt: true } },
                },
            });

            const durationsMinutes: number[] = [];
            for (const order of orders) {
                const received = order.statusEvents.find((e) => e.status === 'RECEIVED');
                const ready = order.statusEvents.find((e) => e.status === 'READY');
                if (received && ready) {
                    const minutes = (ready.changedAt.getTime() - received.changedAt.getTime()) / 60000;
                    if (minutes >= 0) durationsMinutes.push(minutes);
                }
            }

            if (durationsMinutes.length === 0) return { avgMinutes: null, sampleSize: 0 };
            const avg = durationsMinutes.reduce((a, b) => a + b, 0) / durationsMinutes.length;
            return { avgMinutes: Math.round(avg * 10) / 10, sampleSize: durationsMinutes.length };
        });
    }

    async getBestSellers(venueId: string, since?: Date, limit = 10) {
        const clampedSince = await this.clampSince(venueId, since);

        return this.prisma.withVenueScope(venueId, async (tx) => {
            const grouped = await tx.orderItem.groupBy({
                by: ['menuItemId'],
                where: {
                    order: { venueId, createdAt: { gte: clampedSince }, status: { notIn: ['CANCELLED'] } },
                },
                _sum: { quantity: true, lineTotalCents: true },
                orderBy: { _sum: { quantity: 'desc' } },
                take: limit,
            });

            const menuItems = await tx.menuItem.findMany({
                where: { id: { in: grouped.map((g) => g.menuItemId) } },
                select: { id: true, name: true },
            });
            const nameById = new Map(menuItems.map((m) => [m.id, m.name]));

            return grouped.map((g) => ({
                menuItemId: g.menuItemId,
                name: nameById.get(g.menuItemId) ?? 'Deleted item',
                quantitySold: g._sum.quantity ?? 0,
                revenueCents: g._sum.lineTotalCents ?? 0,
            }));
        });
    }

    async getBusiestTables(venueId: string, since?: Date, limit = 10) {
        const clampedSince = await this.clampSince(venueId, since);

        return this.prisma.withVenueScope(venueId, async (tx) => {
            const grouped = await tx.order.groupBy({
                by: ['tableId'],
                where: { venueId, createdAt: { gte: clampedSince }, status: { notIn: ['CANCELLED'] } },
                _count: true,
                orderBy: { _count: { tableId: 'desc' } },
                take: limit,
            });

            const tables = await tx.table.findMany({
                where: { id: { in: grouped.map((g) => g.tableId) } },
                select: { id: true, label: true },
            });
            const labelById = new Map(tables.map((t) => [t.id, t.label]));

            return grouped.map((g) => ({
                tableId: g.tableId,
                label: labelById.get(g.tableId) ?? 'Deleted table',
                orderCount: g._count,
            }));
        });
    }

    /** Orders bucketed by hour-of-day (venue local time is out of scope for
     * this raw query — bucketed in UTC; acceptable for a v1 "busiest times"
     * shape indicator, revisit if venues span very different timezones). */
    async getBusiestHours(venueId: string, since?: Date) {
        const clampedSince = await this.clampSince(venueId, since);

        return this.prisma.withVenueScope(venueId, async (tx) => {
            const rows = await tx.$queryRaw<{ hour: number; count: bigint }[]>`
                SELECT EXTRACT(HOUR FROM "createdAt")::int AS hour, COUNT(*)::bigint AS count
                FROM "Order"
                WHERE "venueId" = ${venueId}::uuid
                  AND "createdAt" >= ${clampedSince}
                  AND "status" != 'CANCELLED'
                GROUP BY hour
                ORDER BY hour ASC
            `;

            // Fill every hour 0-23 so the frontend can render a full 24-bar chart
            // without gaps for quiet hours.
            const byHour = new Map(rows.map((r) => [r.hour, Number(r.count)]));
            return Array.from({ length: 24 }, (_, hour) => ({ hour, count: byHour.get(hour) ?? 0 }));
        });
    }

    async getFeedbackSummary(venueId: string, since?: Date) {
        const clampedSince = await this.clampSince(venueId, since);
        return this.prisma.withVenueScope(venueId, async (tx) => {
            const feedback = await tx.orderFeedback.findMany({
                where: { order: { venueId, createdAt: { gte: clampedSince } } },
                include: { order: { select: { dailyNumber: true } } },
                orderBy: { createdAt: 'desc' },
                take: 50,
            });
            const avgRating = feedback.length
                ? Math.round((feedback.reduce((s, f) => s + f.rating, 0) / feedback.length) * 10) / 10
                : null;
            return {
                avgRating,
                totalRatings: feedback.length,
                recent: feedback.slice(0, 10).map((f) => ({
                    orderNumber: f.order.dailyNumber,
                    rating: f.rating,
                    comment: f.comment,
                    createdAt: f.createdAt,
                })),
            };
        });
    }

    async getZReport(venueId: string, date?: Date) {
        const venue = await this.prisma.venue.findUniqueOrThrow({ where: { id: venueId } });
        const day = date ?? new Date();
        const start = new Date(day);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);

        return this.prisma.withVenueScope(venueId, async (tx) => {
            const [nonCancelled, cancelled, bestSeller, busiestHourRow] = await Promise.all([
                tx.order.aggregate({
                    where: { venueId, createdAt: { gte: start, lt: end }, status: { not: 'CANCELLED' } },
                    _count: true,
                    _sum: { totalCents: true },
                }),
                tx.order.count({ where: { venueId, createdAt: { gte: start, lt: end }, status: 'CANCELLED' } }),
                tx.orderItem.groupBy({
                    by: ['menuItemId'],
                    where: { order: { venueId, createdAt: { gte: start, lt: end }, status: { not: 'CANCELLED' } } },
                    _sum: { quantity: true },
                    orderBy: { _sum: { quantity: 'desc' } },
                    take: 1,
                }),
                tx.$queryRaw<{ hour: number; count: bigint }[]>`
          SELECT EXTRACT(HOUR FROM "createdAt")::int AS hour, COUNT(*)::bigint AS count
          FROM "Order"
          WHERE "venueId" = ${venueId}::uuid AND "createdAt" >= ${start} AND "createdAt" < ${end} AND "status" != 'CANCELLED'
          GROUP BY hour ORDER BY count DESC LIMIT 1
        `,
            ]);

            const grossSalesCents = nonCancelled._sum.totalCents ?? 0;
            const ordersCount = nonCancelled._count;

            let taxCents: number | null = null;
            let netSalesCents = grossSalesCents;
            if (venue.taxRatePercent != null) {
                taxCents = venue.taxInclusive
                    ? Math.round(grossSalesCents - grossSalesCents / (1 + venue.taxRatePercent / 100))
                    : Math.round(grossSalesCents * (venue.taxRatePercent / 100));
                netSalesCents = venue.taxInclusive ? grossSalesCents - taxCents : grossSalesCents;
            }

            let bestSellerName: string | null = null;
            if (bestSeller[0]) {
                const item = await tx.menuItem.findUnique({ where: { id: bestSeller[0].menuItemId }, select: { name: true } });
                bestSellerName = item?.name ?? null;
            }

            return {
                date: start.toISOString().slice(0, 10),
                currency: venue.currency,
                ordersCount,
                cancelledCount: cancelled,
                grossSalesCents,
                netSalesCents,
                taxCents,
                taxRatePercent: venue.taxRatePercent,
                averageOrderValueCents: ordersCount > 0 ? Math.round(grossSalesCents / ordersCount) : 0,
                bestSellerName,
                busiestHour: busiestHourRow[0] ? Number(busiestHourRow[0].hour) : null,
                // Known limitation: orders don't currently track payment method
                // (cash vs card), so this report can't break sales out by tender
                // type — flagging rather than fabricating a number.
                note: 'Payment-method breakdown is not available — orders are not currently tagged by tender type.',
            };
        });
    }
}
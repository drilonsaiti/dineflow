'use client';

import { use, useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '@/lib/api';
import { formatCents } from '@/lib/money';
import {AnalyticsSummary, BestSeller, BusiestTable, BusiestHour} from "@/types/analytic";

export default function AnalyticsPage({ params }: { params: Promise<{ venueId: string }> }) {
    const { venueId } = use(params);
    const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
    const [avgReady, setAvgReady] = useState<{ avgMinutes: number | null; sampleSize: number } | null>(null);
    const [bestSellers, setBestSellers] = useState<BestSeller[]>([]);
    const [busiestTables, setBusiestTables] = useState<BusiestTable[]>([]);
    const [busiestHours, setBusiestHours] = useState<BusiestHour[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            api.get<AnalyticsSummary>(`/venues/${venueId}/analytics/summary`),
            api.get<{ avgMinutes: number | null; sampleSize: number }>(
                `/venues/${venueId}/analytics/avg-time-to-ready`,
            ),
            api.get<BestSeller[]>(`/venues/${venueId}/analytics/best-sellers`),
            api.get<BusiestTable[]>(`/venues/${venueId}/analytics/busiest-tables`),
            api.get<BusiestHour[]>(`/venues/${venueId}/analytics/busiest-hours`),
        ]).then(([s, a, bs, bt, bh]) => {
            setSummary(s);
            setAvgReady(a);
            setBestSellers(bs);
            setBusiestTables(bt);
            setBusiestHours(bh);
            setLoading(false);
        });
    }, [venueId]);

    if (loading || !summary) return <div className="p-8 text-gray-500">Loading analytics…</div>;

    return (
        <div className="mx-auto max-w-4xl space-y-8 p-6">
            <h1 className="text-2xl font-semibold">Analytics</h1>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <StatCard label="Orders today" value={summary.ordersToday.toString()} />
                <StatCard label="Revenue today" value={formatCents(summary.revenueTodayCents)} />
                <StatCard label="Orders this week" value={summary.ordersThisWeek.toString()} />
                <StatCard label="Revenue this week" value={formatCents(summary.revenueThisWeekCents)} />
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                <h2 className="text-sm font-medium text-gray-500">Avg. time from Received to Ready</h2>
                <p className="mt-1 text-3xl font-semibold">
                    {avgReady?.avgMinutes != null ? `${avgReady.avgMinutes} min` : '—'}
                </p>
                {avgReady && avgReady.sampleSize > 0 && (
                    <p className="text-xs text-gray-400">based on {avgReady.sampleSize} orders</p>
                )}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                <h2 className="text-sm font-medium text-gray-500">Best-selling items</h2>
                {bestSellers.length === 0 ? (
                    <p className="mt-2 text-sm text-gray-400">No orders yet.</p>
                ) : (
                    <ul className="mt-3 divide-y divide-gray-100">
                        {bestSellers.map((item, i) => (
                            <li key={item.menuItemId} className="flex items-center justify-between py-2">
                <span className="text-sm">
                  <span className="text-gray-400 mr-2">#{i + 1}</span>
                    {item.name}
                </span>
                                <span className="text-sm text-gray-500">
                  {item.quantitySold} sold · {formatCents(item.revenueCents)}
                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                <h2 className="text-sm font-medium text-gray-500">Busiest tables</h2>
                {busiestTables.length === 0 ? (
                    <p className="mt-2 text-sm text-gray-400">No orders yet.</p>
                ) : (
                    <ul className="mt-3 divide-y divide-gray-100">
                        {busiestTables.map((t) => (
                            <li key={t.tableId} className="flex items-center justify-between py-2 text-sm">
                                <span>{t.label}</span>
                                <span className="text-gray-500">{t.orderCount} orders</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                <h2 className="text-sm font-medium text-gray-500">Orders by hour of day</h2>
                <div className="mt-3 h-56">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={busiestHours}>
                            <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} fontSize={11} />
                            <YAxis allowDecimals={false} fontSize={11} />
                            <Tooltip labelFormatter={(h) => `${h}:00`} />
                            <Bar dataKey="count" fill="var(--brand-color, #111827)" radius={[3, 3, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs font-medium text-gray-500">{label}</p>
            <p className="mt-1 text-2xl font-semibold">{value}</p>
        </div>
    );
}
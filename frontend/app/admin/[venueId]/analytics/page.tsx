'use client';

import { use, useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Star } from 'lucide-react';
import { api } from '@/lib/api';
import { formatCents } from '@/lib/money';
import {AnalyticsSummary, BestSeller, BusiestTable, BusiestHour} from "@/types/analytic";
import {FeedbackSummary} from "@/types/feedback";

export default function AnalyticsPage({ params }: { params: Promise<{ venueId: string }> }) {
    const { venueId } = use(params);
    const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
    const [avgReady, setAvgReady] = useState<{ avgMinutes: number | null; sampleSize: number } | null>(null);
    const [bestSellers, setBestSellers] = useState<BestSeller[]>([]);
    const [busiestTables, setBusiestTables] = useState<BusiestTable[]>([]);
    const [busiestHours, setBusiestHours] = useState<BusiestHour[]>([]);
    const [feedback, setFeedback] = useState<FeedbackSummary | null>(null);
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
            api.get<FeedbackSummary>(`/venues/${venueId}/analytics/feedback`)
        ]).then(([s, a, bs, bt, bh,fs]) => {
            setSummary(s);
            setAvgReady(a);
            setBestSellers(bs);
            setBusiestTables(bt);
            setBusiestHours(bh);
            setFeedback(fs)
            setLoading(false);
        });
    }, [venueId]);

    if (loading || !summary) return <div className="p-8 text-muted-soft">Loading analytics…</div>;

    return (
        <div className="mx-auto max-w-4xl space-y-8 p-6">
            <h1 className="text-2xl">Analytics</h1>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <StatCard label="Orders today" value={summary.ordersToday.toString()} />
                <StatCard label="Revenue today" value={formatCents(summary.revenueTodayCents)} />
                <StatCard label="Orders this week" value={summary.ordersThisWeek.toString()} />
                <StatCard label="Revenue this week" value={formatCents(summary.revenueThisWeekCents)} />
            </div>

            <div className="card">
                <h2 className="text-sm font-medium text-muted">Avg. time from Received to Ready</h2>
                <p className="mt-1 text-3xl font-semibold text-ink dark:text-white">
                    {avgReady?.avgMinutes != null ? `${avgReady.avgMinutes} min` : '—'}
                </p>
                {avgReady && avgReady.sampleSize > 0 && (
                    <p className="text-xs text-muted-soft">based on {avgReady.sampleSize} orders</p>
                )}
            </div>

            <div className="card">
                <h2 className="text-sm font-medium text-muted">Best-selling items</h2>
                {bestSellers.length === 0 ? (
                    <p className="mt-2 text-sm text-muted-soft">No orders yet.</p>
                ) : (
                    <ul className="mt-3 divide-y divide-hairline-soft dark:divide-gray-800">
                        {bestSellers.map((item, i) => (
                            <li key={item.menuItemId} className="flex items-center justify-between py-2">
                <span className="text-sm text-ink dark:text-gray-100">
                  <span className="text-muted-soft mr-2">#{i + 1}</span>
                    {item.name}
                </span>
                                <span className="text-sm text-muted">
                  {item.quantitySold} sold · {formatCents(item.revenueCents)}
                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="card">
                <h2 className="text-sm font-medium text-muted">Busiest tables</h2>
                {busiestTables.length === 0 ? (
                    <p className="mt-2 text-sm text-muted-soft">No orders yet.</p>
                ) : (
                    <ul className="mt-3 divide-y divide-hairline-soft dark:divide-gray-800">
                        {busiestTables.map((t) => (
                            <li key={t.tableId} className="flex items-center justify-between py-2 text-sm text-ink dark:text-gray-100">
                                <span>{t.label}</span>
                                <span className="text-muted">{t.orderCount} orders</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="card">
                <h2 className="text-sm font-medium text-muted">Guest satisfaction</h2>
                <div className="mt-1 flex items-center gap-2">
                    <span className="text-3xl font-semibold text-ink dark:text-white">
                        {feedback?.avgRating ?? '—'}
                    </span>
                    <Star className="h-6 w-6 text-warning" style={{ fill: 'currentColor' }} aria-hidden />
                </div>
                {(feedback?.totalRatings ?? 0) > 0 && (
                    <p className="text-xs text-muted-soft">from {feedback!.totalRatings} ratings</p>
                )}
                {feedback?.recent && feedback.recent.length > 0 && (
                    <ul className="mt-3 space-y-2 divide-y divide-hairline-soft dark:divide-gray-800">
                        {feedback.recent.map((r: any, i: number) => (
                            <li key={i} className="pt-2 text-sm first:pt-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-ink dark:text-white">#{r.orderNumber}</span>
                                    <span className="flex items-center gap-0.5">
                                        {Array.from({ length: 5 }).map((_, si) => (
                                            <Star
                                                key={si}
                                                className={`h-3.5 w-3.5 ${si < r.rating ? 'text-warning' : 'text-surface-strong dark:text-gray-700'}`}
                                                style={si < r.rating ? { fill: 'currentColor' } : undefined}
                                                aria-hidden
                                            />
                                        ))}
                                    </span>
                                </div>
                                {r.comment && <p className="mt-0.5 text-muted">"{r.comment}"</p>}
                            </li>
                        ))}
                    </ul>
                )}
                {(!feedback?.recent || feedback.recent.length === 0) && (
                    <p className="mt-2 text-sm text-muted-soft">No ratings yet.</p>
                )}
            </div>

            <div className="card">
                <h2 className="text-sm font-medium text-muted">Orders by hour of day</h2>
                <div className="mt-3 h-56">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={busiestHours}>
                            <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} fontSize={11} stroke="currentColor" className="text-muted-soft" />
                            <YAxis allowDecimals={false} fontSize={11} stroke="currentColor" className="text-muted-soft" />
                            <Tooltip labelFormatter={(h) => `${h}:00`} />
                            <Bar dataKey="count" fill="#111111" radius={[3, 3, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="card !p-4">
            <p className="text-xs font-medium text-muted">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-ink dark:text-white">{value}</p>
        </div>
    );
}
'use client';

import {use} from 'react';
import {Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis,} from 'recharts';
import {Star} from 'lucide-react';

import {useAnalytics} from '@/hooks/useAnalytics';
import {useVenueCurrency} from '@/hooks/useVenueCurrency';
import {formatCents} from '@/lib/money';
import {RequireOwnerOrManager} from "@/components/RequireOwnerOrManager";

export default function AnalyticsPage({
                                          params,
                                      }: {
    params: Promise<{ venueId: string }>;
}) {
    const {venueId} = use(params);

    const currency = useVenueCurrency(venueId);

    const {
        isLoading,
        summary,
        avgReady,
        bestSellers,
        busiestTables,
        busiestHours,
        feedback,
    } = useAnalytics(venueId);

    if (isLoading || !summary) {
        return (
            <div className="p-8 text-muted-soft">
                Loading analytics…
            </div>
        );
    }

    return (
        <RequireOwnerOrManager venueId={venueId}>
            <div className="mx-auto max-w-4xl space-y-8 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl">Analytics</h1>

                    <a
                        href={`${process.env.NEXT_PUBLIC_API_URL}/venues/${venueId}/analytics/export.csv`}
                        className="btn-secondary"
                    >
                        Export CSV
                    </a>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <StatCard
                        label="Orders today"
                        value={summary.ordersToday.toString()}
                    />

                    <StatCard
                        label="Revenue today"
                        value={formatCents(
                            summary.revenueTodayCents,
                            currency
                        )}
                    />

                    <StatCard
                        label="Orders this week"
                        value={summary.ordersThisWeek.toString()}
                    />

                    <StatCard
                        label="Revenue this week"
                        value={formatCents(
                            summary.revenueThisWeekCents,
                            currency
                        )}
                    />
                </div>

                {/* Average ready time */}
                <div className="card">
                    <h2 className="text-sm font-medium text-muted">
                        Avg. time from Received to Ready
                    </h2>

                    <p className="mt-1 text-3xl font-semibold text-ink dark:text-white">
                        {avgReady?.avgMinutes != null
                            ? `${avgReady.avgMinutes} min`
                            : '—'}
                    </p>

                    {avgReady && avgReady.sampleSize > 0 && (
                        <p className="text-xs text-muted-soft">
                            based on {avgReady.sampleSize} orders
                        </p>
                    )}
                </div>

                {/* Guest satisfaction */}
                <div className="card">
                    <h2 className="text-sm font-medium text-muted">
                        Guest satisfaction
                    </h2>

                    <div className="mt-1 flex items-center gap-2">
                    <span className="text-3xl font-semibold text-ink dark:text-white">
                        {feedback?.avgRating ?? '—'}
                    </span>

                        <Star
                            className="h-6 w-6 text-warning"
                            style={{fill: 'currentColor'}}
                            aria-hidden
                        />
                    </div>

                    {(feedback?.totalRatings ?? 0) > 0 && (
                        <p className="text-xs text-muted-soft">
                            from {feedback?.totalRatings} ratings
                        </p>
                    )}

                    {feedback?.recent && feedback.recent.length > 0 ? (
                        <ul className="mt-3 space-y-2 divide-y divide-hairline-soft dark:divide-gray-800">
                            {feedback.recent.map(
                                (rating: any, index: number) => (
                                    <li
                                        key={index}
                                        className="pt-2 text-sm first:pt-0"
                                    >
                                        <div className="flex items-center gap-2">
                                        <span className="font-medium text-ink dark:text-white">
                                            #{rating.orderNumber}
                                        </span>

                                            <span className="flex items-center gap-0.5">
                                            {Array.from({length: 5}).map(
                                                (_, starIndex) => (
                                                    <Star
                                                        key={starIndex}
                                                        className={`h-3.5 w-3.5 ${
                                                            starIndex <
                                                            rating.rating
                                                                ? 'text-warning'
                                                                : 'text-surface-strong dark:text-gray-700'
                                                        }`}
                                                        style={
                                                            starIndex <
                                                            rating.rating
                                                                ? {
                                                                    fill: 'currentColor',
                                                                }
                                                                : undefined
                                                        }
                                                        aria-hidden
                                                    />
                                                )
                                            )}
                                        </span>
                                        </div>

                                        {rating.comment && (
                                            <p className="mt-0.5 text-muted">
                                                "{rating.comment}"
                                            </p>
                                        )}
                                    </li>
                                )
                            )}
                        </ul>
                    ) : (
                        <p className="mt-2 text-sm text-muted-soft">
                            No ratings yet.
                        </p>
                    )}
                </div>

                {/* Best sellers */}
                <div className="card">
                    <h2 className="text-sm font-medium text-muted">
                        Best-selling items
                    </h2>

                    {bestSellers.length === 0 ? (
                        <p className="mt-2 text-sm text-muted-soft">
                            No orders yet.
                        </p>
                    ) : (
                        <ul className="mt-3 divide-y divide-hairline-soft dark:divide-gray-800">
                            {bestSellers.map((item: any, index: number) => (
                                <li
                                    key={item.menuItemId}
                                    className="flex items-center justify-between py-2"
                                >
                                <span className="text-sm text-ink dark:text-gray-100">
                                    <span className="mr-2 text-muted-soft">
                                        #{index + 1}
                                    </span>

                                    {item.name}
                                </span>

                                    <span className="text-sm text-muted">
                                    {item.quantitySold} sold ·{' '}
                                        {formatCents(
                                            item.revenueCents,
                                            currency
                                        )}
                                </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Busiest tables */}
                <div className="card">
                    <h2 className="text-sm font-medium text-muted">
                        Busiest tables
                    </h2>

                    {busiestTables.length === 0 ? (
                        <p className="mt-2 text-sm text-muted-soft">
                            No orders yet.
                        </p>
                    ) : (
                        <ul className="mt-3 divide-y divide-hairline-soft dark:divide-gray-800">
                            {busiestTables.map((table: any) => (
                                <li
                                    key={table.tableId}
                                    className="flex items-center justify-between py-2 text-sm text-ink dark:text-gray-100"
                                >
                                    <span>{table.label}</span>

                                    <span className="text-muted">
                                    {table.orderCount} orders
                                </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Orders by hour */}
                <div className="card">
                    <h2 className="text-sm font-medium text-muted">
                        Orders by hour of day
                    </h2>

                    <div className="mt-3 h-56">
                        <ResponsiveContainer
                            width="100%"
                            height="100%"
                        >
                            <BarChart data={busiestHours}>
                                <XAxis
                                    dataKey="hour"
                                    tickFormatter={(hour) => `${hour}:00`}
                                    fontSize={11}
                                    stroke="currentColor"
                                    className="text-muted-soft"
                                />

                                <YAxis
                                    allowDecimals={false}
                                    fontSize={11}
                                    stroke="currentColor"
                                    className="text-muted-soft"
                                />

                                <Tooltip
                                    labelFormatter={(hour) => `${hour}:00`}
                                />

                                <Bar
                                    dataKey="count"
                                    fill="#111111"
                                    radius={[3, 3, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </RequireOwnerOrManager>
    );
}

function StatCard({
                      label,
                      value,
                  }: {
    label: string;
    value: string;
}) {
    return (
        <div className="card !p-4">
            <p className="text-xs font-medium text-muted">
                {label}
            </p>

            <p className="mt-1 text-2xl font-semibold text-ink dark:text-white">
                {value}
            </p>
        </div>
    );
}
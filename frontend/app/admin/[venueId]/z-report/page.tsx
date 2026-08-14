'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatCents } from '@/lib/money';

interface ZReport {
    date: string;
    currency: string;
    ordersCount: number;
    cancelledCount: number;
    grossSalesCents: number;
    netSalesCents: number;
    taxCents: number | null;
    taxRatePercent: number | null;
    averageOrderValueCents: number;
    bestSellerName: string | null;
    busiestHour: number | null;
    note: string;
}

export default function ZReportPage({ params }: { params: { venueId: string } }) {
    const { venueId } = params;
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [report, setReport] = useState<ZReport | null>(null);

    useEffect(() => {
        api.get<ZReport>(`/venues/${venueId}/analytics/z-report?date=${date}`).then(setReport);
    }, [venueId, date]);

    if (!report) return <div className="p-8 text-gray-500">Loading…</div>;

    return (
        <div className="mx-auto max-w-md p-6">
            <div className="flex items-center justify-between print:hidden">
                <h1 className="text-2xl font-semibold">Z-report</h1>
                <button onClick={() => window.print()} className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white">
                    Print
                </button>
            </div>

            <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm print:hidden"
            />

            <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 font-mono text-sm">
                <p className="text-center font-semibold">DAILY SALES REPORT</p>
                <p className="text-center text-gray-500">{report.date}</p>
                <hr className="my-3 border-dashed" />
                <Row label="Orders" value={report.ordersCount.toString()} />
                <Row label="Cancelled" value={report.cancelledCount.toString()} />
                <Row label="Gross sales" value={formatCents(report.grossSalesCents, report.currency)} />
                {report.taxCents != null && (
                    <>
                        <Row label={`Tax (${report.taxRatePercent}%)`} value={formatCents(report.taxCents, report.currency)} />
                        <Row label="Net sales" value={formatCents(report.netSalesCents, report.currency)} />
                    </>
                )}
                <Row label="Avg order value" value={formatCents(report.averageOrderValueCents, report.currency)} />
                <Row label="Best seller" value={report.bestSellerName ?? '—'} />
                <Row label="Busiest hour" value={report.busiestHour != null ? `${report.busiestHour}:00` : '—'} />
                <hr className="my-3 border-dashed" />
                <p className="text-xs text-gray-400">{report.note}</p>
            </div>
        </div>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between py-0.5">
            <span>{label}</span>
            <span className="font-semibold">{value}</span>
        </div>
    );
}
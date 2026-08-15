'use client';

import {use, useState} from 'react';
import {useZReport} from '@/hooks/useZReport';
import {formatCents} from '@/lib/money';

export default function ZReportPage({params}: { params: Promise<{ venueId: string }> }) {
    const {venueId} = use(params);
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const {data: report} = useZReport(venueId, date);

    if (!report) return <div className="p-8 text-muted-soft">Loading…</div>;

    return (
        <div className="mx-auto max-w-md p-6">
            <div className="flex items-center justify-between print:hidden">
                <h1 className="text-2xl font-semibold">Z-report</h1>
                <button onClick={() => window.print()} className="btn-primary">Print</button>
            </div>

            <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input mt-3 print:hidden"
            />

            <div
                className="mt-6 rounded-xl border border-hairline bg-canvas p-6 font-mono text-sm dark:border-gray-700 dark:bg-surface-dark-elevated">
                <p className="text-center font-semibold">DAILY SALES REPORT</p>
                <p className="text-center text-muted">{report.date}</p>
                <hr className="my-3 border-dashed"/>
                <Row label="Orders" value={report.ordersCount.toString()}/>
                <Row label="Cancelled" value={report.cancelledCount.toString()}/>
                <Row label="Gross sales" value={formatCents(report.grossSalesCents, report.currency)}/>
                {report.taxCents != null && (
                    <>
                        <Row label={`Tax (${report.taxRatePercent}%)`}
                             value={formatCents(report.taxCents, report.currency)}/>
                        <Row label="Net sales" value={formatCents(report.netSalesCents, report.currency)}/>
                    </>
                )}
                <Row label="Avg order value" value={formatCents(report.averageOrderValueCents, report.currency)}/>
                <Row label="Best seller" value={report.bestSellerName ?? '—'}/>
                <Row label="Busiest hour" value={report.busiestHour != null ? `${report.busiestHour}:00` : '—'}/>
                <hr className="my-3 border-dashed"/>
                <p className="text-xs text-muted-soft">{report.note}</p>
            </div>
        </div>
    );
}

function Row({label, value}: { label: string; value: string }) {
    return (
        <div className="flex justify-between py-0.5">
            <span>{label}</span>
            <span className="font-semibold">{value}</span>
        </div>
    );
}
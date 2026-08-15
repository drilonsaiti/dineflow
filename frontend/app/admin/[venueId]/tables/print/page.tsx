'use client';

import {use} from 'react';
import {useTables} from "@/hooks/useTables";

// Printable sheet: browser-native print (Cmd/Ctrl+P) rather than
// server-generated PDF — every browser can already turn this into a PDF via
// "Save as PDF" in the print dialog, so it satisfies the "download/print as
// PDF" requirement (section 6) without a heavier server-side PDF pipeline.
export default function PrintTablesPage({params}: { params: Promise<{ venueId: string }> }) {
    const {venueId} = use(params);
    const {data: allTables = []} = useTables(venueId);
    const tables = allTables.filter((t) => t.isActive);

    return (
        <div className="min-h-screen bg-canvas p-8 dark:bg-surface-dark print:bg-white">
            <div className="mb-6 print:hidden">
                <button onClick={() => window.print()} className="btn-primary">
                    Print / Save as PDF
                </button>
            </div>
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
                {tables.map((table) => (
                    <div
                        key={table.id}
                        className="flex flex-col items-center break-inside-avoid rounded-lg border border-gray-300 p-6 text-center print:border-gray-300"
                    >
                        <img src={table.qrDataUrl} alt={table.label} className="h-40 w-40"/>
                        <p className="mt-3 text-lg font-semibold text-black">{table.label}</p>
                        {table.area && <p className="text-sm text-gray-600">{table.area.name}</p>}
                        <p className="mt-1 text-xs text-gray-500">Scan to order</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
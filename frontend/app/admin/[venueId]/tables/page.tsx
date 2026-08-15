'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    useTables,
    useAreas,
    useCreateArea,
    useCreateTable,
    useDeactivateTable,
    useReactivateTable,
    useRegenerateTableToken,
} from '@/hooks/useTables';

export default function TablesAdminPage({ params }: { params: { venueId: string } }) {
    const { venueId } = params;
    const { data: tables = [], isLoading } = useTables(venueId);
    const { data: areas = [] } = useAreas(venueId);

    const createAreaMutation = useCreateArea(venueId);
    const createTableMutation = useCreateTable(venueId);
    const deactivateMutation = useDeactivateTable(venueId);
    const reactivateMutation = useReactivateTable(venueId);
    const regenerateMutation = useRegenerateTableToken(venueId);

    const [newLabel, setNewLabel] = useState('');
    const [newAreaId, setNewAreaId] = useState('');
    const [newAreaName, setNewAreaName] = useState('');
    const [createError, setCreateError] = useState<string | null>(null);

    async function createTable(e: React.FormEvent) {
        e.preventDefault();
        if (!newLabel.trim()) return;
        setCreateError(null);
        try {
            await createTableMutation.mutateAsync({ label: newLabel, areaId: newAreaId || undefined });
            setNewLabel('');
        } catch (err: any) {
            setCreateError(err.message);
        }
    }

    async function createArea(e: React.FormEvent) {
        e.preventDefault();
        if (!newAreaName.trim()) return;
        await createAreaMutation.mutateAsync(newAreaName);
        setNewAreaName('');
    }

    function deactivate(tableId: string) {
        if (!confirm("Remove this table from the floor? Its QR code stops working; order history is kept.")) return;
        deactivateMutation.mutate(tableId);
    }

    function regenerate(tableId: string) {
        if (!confirm("Regenerate this table's QR code? Any previously printed code will stop working.")) return;
        regenerateMutation.mutate(tableId);
    }

    const API_URL = process.env.NEXT_PUBLIC_API_URL;

    if (isLoading) return <div className="p-8 text-gray-500">Loading tables…</div>;

    return (
        <div className="mx-auto max-w-4xl p-6 space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Tables & QR codes</h1>
                <div className="flex gap-3">
                    <a href={`${API_URL}/venues/${venueId}/tables/qr-bulk.zip`} className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium">
                        Download all (.zip)
                    </a>
                    <Link href={`/admin/${venueId}/tables/print`} className="rounded-md bg-brand px-3 py-2 text-sm font-medium text-white">
                        Printable sheet
                    </Link>
                </div>
            </div>

            <form onSubmit={createArea} className="flex items-end gap-3 rounded-xl border border-dashed border-gray-300 p-4">
                <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-500">New area (optional grouping)</label>
                    <input
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        value={newAreaName}
                        onChange={(e) => setNewAreaName(e.target.value)}
                        placeholder="Patio, Bar, Indoor…"
                    />
                </div>
                <button type="submit" disabled={createAreaMutation.isPending} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium disabled:opacity-50">
                    {createAreaMutation.isPending ? 'Adding…' : 'Add area'}
                </button>
            </form>

            <form onSubmit={createTable} className="flex flex-wrap items-end gap-3 rounded-xl border border-dashed border-gray-300 p-4">
                <div className="flex-1 min-w-[160px]">
                    <label className="block text-xs font-medium text-gray-500">Table label</label>
                    <input
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                        placeholder="Table 4"
                    />
                </div>
                <div className="min-w-[160px]">
                    <label className="block text-xs font-medium text-gray-500">Area (optional)</label>
                    <select className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={newAreaId} onChange={(e) => setNewAreaId(e.target.value)}>
                        <option value="">No area</option>
                        {areas.map((a) => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                    </select>
                </div>
                <button type="submit" disabled={createTableMutation.isPending} className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                    {createTableMutation.isPending ? 'Adding…' : 'Add table'}
                </button>
                {createError && <p className="w-full text-sm text-red-500">{createError}</p>}
            </form>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                {tables.map((table) => (
                    <div key={table.id} className={`rounded-xl border p-4 ${table.isActive ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50 opacity-60'}`}>
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="font-medium">{table.label}</p>
                                {table.area && <p className="text-xs text-gray-500">{table.area.name}</p>}
                                {!table.isActive && <p className="text-xs text-red-500">Inactive</p>}
                            </div>
                            <img src={table.qrDataUrl} alt={`QR for ${table.label}`} className="h-20 w-20" />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-3 text-xs">
                            <a href={`${API_URL}/venues/${venueId}/tables/${table.id}/qr.png`} className="text-brand hover:underline">PNG</a>
                            <a href={`${API_URL}/venues/${venueId}/tables/${table.id}/qr.svg`} className="text-brand hover:underline">SVG</a>
                            <button className="text-brand hover:underline" onClick={() => regenerate(table.id)}>Regenerate</button>
                            {table.isActive ? (
                                <button className="text-red-600 hover:underline" onClick={() => deactivate(table.id)}>Deactivate</button>
                            ) : (
                                <button className="text-green-600 hover:underline" onClick={() => reactivateMutation.mutate(table.id)}>Reactivate</button>
                            )}
                        </div>
                    </div>
                ))}
                {tables.length === 0 && <p className="text-gray-500">No tables yet — add one above.</p>}
            </div>
        </div>
    );
}
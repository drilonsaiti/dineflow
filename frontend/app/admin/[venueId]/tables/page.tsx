'use client';

import { use, useState } from 'react';
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
import { Select, SelectValue, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/Select';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';

export default function TablesAdminPage({ params }: { params: Promise<{ venueId: string }> }) {
    const { venueId } = use(params);
    const { data: tables = [], isLoading } = useTables(venueId);
    const { data: areas = [] } = useAreas(venueId);

    const createAreaMutation = useCreateArea(venueId);
    const createTableMutation = useCreateTable(venueId);
    const deactivateMutation = useDeactivateTable(venueId);
    const reactivateMutation = useReactivateTable(venueId);
    const regenerateMutation = useRegenerateTableToken(venueId);
    const showToast = useToast();

    const [newLabel, setNewLabel] = useState('');
    const [newAreaId, setNewAreaId] = useState('');
    const [newAreaName, setNewAreaName] = useState('');
    const [createError, setCreateError] = useState<string | null>(null);
    const [confirmDeactivate, setConfirmDeactivate] = useState<string | null>(null);
    const [confirmRegenerate, setConfirmRegenerate] = useState<string | null>(null);

    async function createTable(e: React.FormEvent) {
        e.preventDefault();
        if (!newLabel.trim()) return;
        setCreateError(null);
        try {
            await createTableMutation.mutateAsync({ label: newLabel, areaId: newAreaId || undefined });
            setNewLabel('');
            showToast('Table created', 'success');
        } catch (err: any) {
            setCreateError(err.message);
        }
    }

    async function createArea(e: React.FormEvent) {
        e.preventDefault();
        if (!newAreaName.trim()) return;
        await createAreaMutation.mutateAsync(newAreaName);
        setNewAreaName('');
        showToast('Area created', 'success');
    }

    const API_URL = process.env.NEXT_PUBLIC_API_URL;

    if (isLoading) return <div className="p-8 text-muted-soft">Loading tables…</div>;

    return (
        <div className="mx-auto max-w-4xl p-6 space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl">Tables & QR codes</h1>
                <div className="flex gap-3">
                    <a href={`${API_URL}/venues/${venueId}/tables/qr-bulk.zip`} className="btn-secondary">
                        Download all (.zip)
                    </a>
                    <Link href={`/admin/${venueId}/tables/print`} className="btn-primary">
                        Printable sheet
                    </Link>
                </div>
            </div>

            <form onSubmit={createArea} className="flex items-end gap-3 rounded-xl border border-dashed border-hairline p-4 dark:border-gray-700">
                <div className="flex-1">
                    <label className="block text-xs font-medium text-muted">New area (optional grouping)</label>
                    <input
                        className="input mt-1"
                        value={newAreaName}
                        onChange={(e) => setNewAreaName(e.target.value)}
                        placeholder="Patio, Bar, Indoor…"
                    />
                </div>
                <button type="submit" disabled={createAreaMutation.isPending} className="btn-secondary">
                    {createAreaMutation.isPending ? 'Adding…' : 'Add area'}
                </button>
            </form>

            <form onSubmit={createTable} className="flex flex-wrap items-end gap-3 rounded-xl border border-dashed border-hairline p-4 dark:border-gray-700">
                <div className="flex-1 min-w-[160px]">
                    <label className="block text-xs font-medium text-muted">Table label</label>
                    <input
                        className="input mt-1"
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                        placeholder="Table 4"
                    />
                </div>
                <div className="min-w-[160px]">
                    <label className="block text-xs font-medium text-muted">Area (optional)</label>
                    <Select value={newAreaId} onValueChange={setNewAreaId}>
                        <SelectTrigger className="mt-1">
                            <SelectValue placeholder="No area" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">No area</SelectItem>
                            {areas.map((a) => (
                                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <button type="submit" disabled={createTableMutation.isPending} className="btn-primary">
                    {createTableMutation.isPending ? 'Adding…' : 'Add table'}
                </button>
                {createError && <p className="w-full text-sm text-error">{createError}</p>}
            </form>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                {tables.map((table) => (
                    <div
                        key={table.id}
                        className={`rounded-xl border p-4 dark:border-gray-800 dark:bg-surface-dark-elevated ${
                            table.isActive ? 'border-hairline bg-canvas' : 'border-hairline bg-surface-card opacity-60'
                        }`}
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="font-medium text-ink dark:text-white">{table.label}</p>
                                {table.area && <p className="text-xs text-muted">{table.area.name}</p>}
                                {!table.isActive && <p className="text-xs text-error">Inactive</p>}
                            </div>
                            <img src={table.qrDataUrl} alt={`QR for ${table.label}`} className="h-20 w-20" />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-3 text-xs">
                            <a href={`${API_URL}/venues/${venueId}/tables/${table.id}/qr.png`} className="font-medium text-ink hover:underline dark:text-white">PNG</a>
                            <a href={`${API_URL}/venues/${venueId}/tables/${table.id}/qr.svg`} className="font-medium text-ink hover:underline dark:text-white">SVG</a>
                            <button className="font-medium text-ink hover:underline dark:text-white" onClick={() => setConfirmRegenerate(table.id)}>Regenerate</button>
                            {table.isActive ? (
                                <button className="font-medium text-error hover:underline" onClick={() => setConfirmDeactivate(table.id)}>Deactivate</button>
                            ) : (
                                <button className="font-medium text-success hover:underline" onClick={() => reactivateMutation.mutate(table.id)}>Reactivate</button>
                            )}
                        </div>
                    </div>
                ))}
                {tables.length === 0 && <p className="text-muted">No tables yet — add one above.</p>}
            </div>

            <ConfirmDialog
                open={!!confirmDeactivate}
                onOpenChange={(open) => !open && setConfirmDeactivate(null)}
                title="Deactivate this table?"
                description="Its QR code stops working. Order history is kept."
                confirmLabel="Deactivate"
                danger
                onConfirm={() => {
                    if (confirmDeactivate) deactivateMutation.mutate(confirmDeactivate);
                }}
            />

            <ConfirmDialog
                open={!!confirmRegenerate}
                onOpenChange={(open) => !open && setConfirmRegenerate(null)}
                title="Regenerate QR code?"
                description="Any previously printed code will stop working."
                confirmLabel="Regenerate"
                danger
                onConfirm={() => {
                    if (confirmRegenerate) regenerateMutation.mutate(confirmRegenerate);
                }}
            />
        </div>
    );
}
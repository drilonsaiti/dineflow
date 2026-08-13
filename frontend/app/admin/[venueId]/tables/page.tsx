'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Area, TableRow } from '@/types/table';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import {
    Select,
    SelectValue,
    SelectTrigger,
    SelectContent,
    SelectItem,
} from '@/components/ui/Select';

interface Props {
    params: Promise<{
        venueId: string;
    }>;
}

export default function TablesAdminPage({ params }: Props) {
    const { venueId } = use(params);

    const [tables, setTables] = useState<TableRow[]>([]);
    const [areas, setAreas] = useState<Area[]>([]);
    const [loading, setLoading] = useState(true);

    const [confirmDeactivate, setConfirmDeactivate] = useState<string | null>(
        null
    );
    const [confirmRegenerate, setConfirmRegenerate] = useState<string | null>(
        null
    );

    const [newLabel, setNewLabel] = useState('');
    const [newAreaId, setNewAreaId] = useState('');
    const [newAreaName, setNewAreaName] = useState('');

    const API_URL = process.env.NEXT_PUBLIC_API_URL;
    const showToast = useToast();

    async function refresh() {
        try {
            setLoading(true);

            const [tablesRes, areasRes] = await Promise.all([
                api.get<TableRow[]>(`/venues/${venueId}/tables`),
                api.get<Area[]>(`/venues/${venueId}/areas`),
            ]);

            setTables(tablesRes);
            setAreas(areasRes);
        } catch (err: unknown) {
            showToast(
                err instanceof Error
                    ? err.message
                    : 'Failed to load tables',
                'error'
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [venueId]);

    async function createTable(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        if (!newLabel.trim()) return;

        try {
            await api.post(`/venues/${venueId}/tables`, {
                label: newLabel.trim(),
                areaId: newAreaId || undefined,
            });

            setNewLabel('');
            setNewAreaId('');

            await refresh();

            showToast('Table created', 'success');
        } catch (err: unknown) {
            showToast(
                err instanceof Error
                    ? err.message
                    : 'Failed to create table',
                'error'
            );
        }
    }

    async function createArea(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        if (!newAreaName.trim()) return;

        try {
            await api.post(`/venues/${venueId}/areas`, {
                name: newAreaName.trim(),
            });

            setNewAreaName('');

            await refresh();

            showToast('Area created', 'success');
        } catch (err: unknown) {
            showToast(
                err instanceof Error
                    ? err.message
                    : 'Failed to create area',
                'error'
            );
        }
    }

    async function deactivate(tableId: string) {
        try {
            await api.patch(
                `/venues/${venueId}/tables/${tableId}/deactivate`
            );

            await refresh();

            showToast('Table deactivated', 'success');
        } catch (err: unknown) {
            showToast(
                err instanceof Error
                    ? err.message
                    : 'Failed to deactivate table',
                'error'
            );
        }
    }

    async function reactivate(tableId: string) {
        try {
            await api.patch(
                `/venues/${venueId}/tables/${tableId}/reactivate`
            );

            await refresh();

            showToast('Table reactivated', 'success');
        } catch (err: unknown) {
            showToast(
                err instanceof Error
                    ? err.message
                    : 'Failed to reactivate table',
                'error'
            );
        }
    }

    async function regenerate(tableId: string) {
        try {
            await api.post(
                `/venues/${venueId}/tables/${tableId}/regenerate-token`
            );

            await refresh();

            showToast('QR code regenerated', 'success');
        } catch (err: unknown) {
            showToast(
                err instanceof Error
                    ? err.message
                    : 'Failed to regenerate QR code',
                'error'
            );
        }
    }

    if (loading) {
        return (
            <div className="p-8 text-muted-soft">
                Loading tables…
            </div>
        );
    }

    const apiUrl = API_URL?.replace(/\/$/, '');

    return (
        <div className="mx-auto max-w-4xl space-y-8 p-6">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <h1 className="text-2xl">Tables & QR codes</h1>

                <div className="flex gap-3">
                    {apiUrl && (
                        <a
                            href={`${apiUrl}/venues/${venueId}/tables/qr-bulk.zip`}
                            className="btn-secondary"
                        >
                            Download all (.zip)
                        </a>
                    )}

                    <Link
                        href={`/admin/${venueId}/tables/print`}
                        className="btn-primary"
                    >
                        Printable sheet
                    </Link>
                </div>
            </div>

            {/* Create area */}
            <form
                onSubmit={createArea}
                className="flex items-end gap-3 rounded-xl border border-dashed border-hairline p-4 dark:border-gray-700"
            >
                <div className="flex-1">
                    <label
                        htmlFor="area-name"
                        className="block text-xs font-medium text-muted"
                    >
                        New area (optional grouping)
                    </label>

                    <input
                        id="area-name"
                        type="text"
                        className="input mt-1"
                        value={newAreaName}
                        onChange={(e) => setNewAreaName(e.target.value)}
                        placeholder="Patio, Bar, Indoor…"
                    />
                </div>

                <button
                    type="submit"
                    className="btn-secondary"
                >
                    Add area
                </button>
            </form>

            {/* Create table */}
            <form
                onSubmit={createTable}
                className="flex flex-wrap items-end gap-3 rounded-xl border border-dashed border-hairline p-4 dark:border-gray-700"
            >
                <div className="min-w-[160px] flex-1">
                    <label
                        htmlFor="table-label"
                        className="block text-xs font-medium text-muted"
                    >
                        Table label
                    </label>

                    <input
                        id="table-label"
                        type="text"
                        className="input mt-1"
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                        placeholder="Table 4"
                    />
                </div>

                <div className="min-w-[160px]">
                    <label
                        htmlFor="table-area"
                        className="block text-xs font-medium text-muted"
                    >
                        Area (optional)
                    </label>

                    <Select
                        value={newAreaId}
                        onValueChange={setNewAreaId}
                    >
                        <SelectTrigger className="mt-1">
                            <SelectValue placeholder="No area" />
                        </SelectTrigger>

                        <SelectContent>
                            {areas.map((area) => (
                                <SelectItem
                                    key={area.id}
                                    value={area.id}
                                >
                                    {area.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <button
                    type="submit"
                    className="btn-primary"
                >
                    Add table
                </button>
            </form>

            {/* Tables */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                {tables.map((table) => (
                    <div
                        key={table.id}
                        className={`rounded-xl border p-4 dark:border-gray-800 dark:bg-surface-dark-elevated ${
                            table.isActive
                                ? 'border-hairline bg-canvas'
                                : 'border-hairline bg-surface-card opacity-60'
                        }`}
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="font-medium text-ink dark:text-white">
                                    {table.label}
                                </p>

                                {table.area && (
                                    <p className="text-xs text-muted">
                                        {table.area.name}
                                    </p>
                                )}

                                {!table.isActive && (
                                    <p className="text-xs text-error">
                                        Inactive
                                    </p>
                                )}
                            </div>

                            {table.qrDataUrl && (
                                <img
                                    src={table.qrDataUrl}
                                    alt={`QR for ${table.label}`}
                                    className="h-20 w-20"
                                />
                            )}
                        </div>

                        <div className="mt-3 flex flex-wrap gap-3 text-xs">
                            {apiUrl && (
                                <>
                                    <a
                                        href={`${apiUrl}/venues/${venueId}/tables/${table.id}/qr.png`}
                                        className="font-medium text-ink hover:underline dark:text-white"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        PNG
                                    </a>

                                    <a
                                        href={`${apiUrl}/venues/${venueId}/tables/${table.id}/qr.svg`}
                                        className="font-medium text-ink hover:underline dark:text-white"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        SVG
                                    </a>
                                </>
                            )}

                            <button
                                type="button"
                                className="font-medium text-ink hover:underline dark:text-white"
                                onClick={() =>
                                    setConfirmRegenerate(table.id)
                                }
                            >
                                Regenerate
                            </button>

                            {table.isActive ? (
                                <button
                                    type="button"
                                    className="font-medium text-error hover:underline"
                                    onClick={() =>
                                        setConfirmDeactivate(table.id)
                                    }
                                >
                                    Deactivate
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="font-medium text-success hover:underline"
                                    onClick={() =>
                                        reactivate(table.id)
                                    }
                                >
                                    Reactivate
                                </button>
                            )}
                        </div>
                    </div>
                ))}

                {tables.length === 0 && (
                    <p className="text-muted">
                        No tables yet — add one above.
                    </p>
                )}
            </div>

            {/* Deactivate confirmation */}
            <ConfirmDialog
                open={!!confirmDeactivate}
                onOpenChange={(open) => {
                    if (!open) {
                        setConfirmDeactivate(null);
                    }
                }}
                title="Deactivate this table?"
                description="Its QR code stops working. Order history is kept."
                confirmLabel="Deactivate"
                danger
                onConfirm={async () => {
                    if (!confirmDeactivate) return;

                    const tableId = confirmDeactivate;
                    setConfirmDeactivate(null);

                    await deactivate(tableId);
                }}
            />

            {/* Regenerate confirmation */}
            <ConfirmDialog
                open={!!confirmRegenerate}
                onOpenChange={(open) => {
                    if (!open) {
                        setConfirmRegenerate(null);
                    }
                }}
                title="Regenerate QR code?"
                description="The current QR code will stop working immediately. Any previously printed QR code will no longer work."
                confirmLabel="Regenerate"
                danger
                onConfirm={async () => {
                    if (!confirmRegenerate) return;

                    const tableId = confirmRegenerate;
                    setConfirmRegenerate(null);

                    await regenerate(tableId);
                }}
            />
        </div>
    );
}
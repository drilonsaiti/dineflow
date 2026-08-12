'use client';

import { use,useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import {Area, TableRow} from "@/types/table";

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

    const [newLabel, setNewLabel] = useState('');
    const [newAreaId, setNewAreaId] = useState('');
    const [newAreaName, setNewAreaName] = useState('');

    const API_URL = process.env.NEXT_PUBLIC_API_URL;

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
            const message =
                err instanceof Error ? err.message : 'Failed to load tables';

            alert(message);
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
        } catch (err: unknown) {
            const message =
                err instanceof Error ? err.message : 'Failed to create table';

            alert(message);
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
        } catch (err: unknown) {
            const message =
                err instanceof Error ? err.message : 'Failed to create area';

            alert(message);
        }
    }

    async function deactivate(tableId: string) {
        const confirmed = confirm(
            'Remove this table from the floor? Its QR code stops working; order history is kept.'
        );

        if (!confirmed) return;

        try {
            await api.patch(
                `/venues/${venueId}/tables/${tableId}/deactivate`
            );

            await refresh();
        } catch (err: unknown) {
            const message =
                err instanceof Error
                    ? err.message
                    : 'Failed to deactivate table';

            alert(message);
        }
    }

    async function reactivate(tableId: string) {
        try {
            await api.patch(
                `/venues/${venueId}/tables/${tableId}/reactivate`
            );

            await refresh();
        } catch (err: unknown) {
            const message =
                err instanceof Error
                    ? err.message
                    : 'Failed to reactivate table';

            alert(message);
        }
    }

    async function regenerate(tableId: string) {
        const confirmed = confirm(
            "Regenerate this table's QR code? Any previously printed code will stop working."
        );

        if (!confirmed) return;

        try {
            await api.post(
                `/venues/${venueId}/tables/${tableId}/regenerate-token`
            );

            await refresh();
        } catch (err: unknown) {
            const message =
                err instanceof Error
                    ? err.message
                    : 'Failed to regenerate QR code';

            alert(message);
        }
    }

    if (loading) {
        return (
            <div className="p-8 text-gray-500">
                Loading tables…
            </div>
        );
    }

    const apiUrl = API_URL?.replace(/\/$/, '');

    return (
        <div className="mx-auto max-w-4xl space-y-8 p-6">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <h1 className="text-2xl font-semibold">
                    Tables & QR codes
                </h1>

                <div className="flex gap-3">
                    {apiUrl && (
                        <a
                            href={`${apiUrl}/venues/${venueId}/tables/qr-bulk.zip`}
                            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50"
                        >
                            Download all (.zip)
                        </a>
                    )}

                    <Link
                        href={`/admin/${venueId}/tables/print`}
                        className="rounded-md bg-brand px-3 py-2 text-sm font-medium text-white hover:opacity-90"
                    >
                        Printable sheet
                    </Link>
                </div>
            </div>

            {/* Create area */}
            <form
                onSubmit={createArea}
                className="flex items-end gap-3 rounded-xl border border-dashed border-gray-300 p-4"
            >
                <div className="flex-1">
                    <label
                        htmlFor="area-name"
                        className="block text-xs font-medium text-gray-500"
                    >
                        New area (optional grouping)
                    </label>

                    <input
                        id="area-name"
                        type="text"
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        value={newAreaName}
                        onChange={(e) => setNewAreaName(e.target.value)}
                        placeholder="Patio, Bar, Indoor…"
                    />
                </div>

                <button
                    type="submit"
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
                >
                    Add area
                </button>
            </form>

            {/* Create table */}
            <form
                onSubmit={createTable}
                className="flex flex-wrap items-end gap-3 rounded-xl border border-dashed border-gray-300 p-4"
            >
                <div className="min-w-[160px] flex-1">
                    <label
                        htmlFor="table-label"
                        className="block text-xs font-medium text-gray-500"
                    >
                        Table label
                    </label>

                    <input
                        id="table-label"
                        type="text"
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                        placeholder="Table 4"
                    />
                </div>

                <div className="min-w-[160px]">
                    <label
                        htmlFor="table-area"
                        className="block text-xs font-medium text-gray-500"
                    >
                        Area (optional)
                    </label>

                    <select
                        id="table-area"
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        value={newAreaId}
                        onChange={(e) => setNewAreaId(e.target.value)}
                    >
                        <option value="">No area</option>

                        {areas.map((area) => (
                            <option key={area.id} value={area.id}>
                                {area.name}
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    type="submit"
                    className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                >
                    Add table
                </button>
            </form>

            {/* Tables */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                {tables.map((table) => (
                    <div
                        key={table.id}
                        className={`rounded-xl border p-4 ${
                            table.isActive
                                ? 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900'
                                : 'border-gray-200 bg-gray-50 opacity-60 dark:border-gray-800 dark:bg-gray-900'
                        }`}
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="font-medium">
                                    {table.label}
                                </p>

                                {table.area && (
                                    <p className="text-xs text-gray-500">
                                        {table.area.name}
                                    </p>
                                )}

                                {!table.isActive && (
                                    <p className="text-xs text-red-500">
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
                                        className="text-brand hover:underline"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        PNG
                                    </a>

                                    <a
                                        href={`${apiUrl}/venues/${venueId}/tables/${table.id}/qr.svg`}
                                        className="text-brand hover:underline"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        SVG
                                    </a>
                                </>
                            )}

                            <button
                                type="button"
                                className="text-brand hover:underline"
                                onClick={() => regenerate(table.id)}
                            >
                                Regenerate
                            </button>

                            {table.isActive ? (
                                <button
                                    type="button"
                                    className="text-red-600 hover:underline"
                                    onClick={() => deactivate(table.id)}
                                >
                                    Deactivate
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="text-green-600 hover:underline"
                                    onClick={() => reactivate(table.id)}
                                >
                                    Reactivate
                                </button>
                            )}
                        </div>
                    </div>
                ))}

                {tables.length === 0 && (
                    <p className="text-gray-500">
                        No tables yet — add one above.
                    </p>
                )}
            </div>
        </div>
    );
}
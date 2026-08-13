'use client';

import {use, useEffect, useState} from 'react';
import { api } from '@/lib/api';
import { StaffOrder } from '../dashboard/page';
import { formatCents } from '@/lib/money';
import { formatElapsed } from '@/lib/elapsed';
import {TableRow} from "@/types/table";

export default function TablesLivePage({ params }: { params: Promise<{ venueId: string }> }) {
    const { venueId } = use(params);
    const [tables, setTables] = useState<TableRow[]>([]);
    const [activeOrders, setActiveOrders] = useState<StaffOrder[]>([]);
    const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
    const [tableOrders, setTableOrders] = useState<StaffOrder[]>([]);

    async function refreshOverview() {
        const [tablesRes, ordersRes] = await Promise.all([
            api.get<TableRow[]>(`/venues/${venueId}/tables`),
            api.get<StaffOrder[]>(`/venues/${venueId}/orders`),
        ]);
        setTables(tablesRes.filter((t) => t.isActive));
        setActiveOrders(ordersRes);
    }

    useEffect(() => {
        refreshOverview();
        const interval = setInterval(refreshOverview, 15_000); // light polling backup alongside whatever socket state the dashboard tab already has live
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [venueId]);

    async function openTable(tableId: string) {
        setSelectedTableId(tableId);
        setTableOrders(await api.get<StaffOrder[]>(`/venues/${venueId}/tables/${tableId}/orders`));
    }

    const activeCountByTable = activeOrders.reduce<Record<string, number>>((acc, o) => {
        acc[(o as any).tableId ?? o.table?.label] = (acc[(o as any).tableId ?? o.table?.label] ?? 0) + 1;
        return acc;
    }, {});

    const selectedTable = tables.find((t) => t.id === selectedTableId);

    return (
        <div className="mx-auto max-w-5xl p-6">
            <h1 className="text-2xl font-semibold">Tables</h1>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {tables.map((table) => {
                    const count = activeCountByTable[table.id] ?? 0;
                    return (
                        <button
                            key={table.id}
                            onClick={() => openTable(table.id)}
                            className={`rounded-xl border p-4 text-left ${
                                count > 0 ? 'border-brand bg-brand/5' : 'border-gray-200 bg-white'
                            }`}
                        >
                            <p className="font-medium">{table.label}</p>
                            {table.area && <p className="text-xs text-gray-500">{table.area.name}</p>}
                            {count > 0 && (
                                <p className="mt-1 text-sm font-semibold text-brand">{count} active order{count === 1 ? '' : 's'}</p>
                            )}
                        </button>
                    );
                })}
            </div>

            {selectedTableId && (
                <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setSelectedTableId(null)}>
                    <div
                        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold">{selectedTable?.label}</h2>
                            <button onClick={() => setSelectedTableId(null)} className="h-9 w-9 rounded-full text-lg">✕</button>
                        </div>

                        <div className="mt-4 space-y-4">
                            {tableOrders.length === 0 && <p className="text-sm text-gray-400">No orders yet for this table.</p>}
                            {tableOrders.map((order) => (
                                <div key={order.id} className="rounded-lg border border-gray-200 p-3">
                                    <div className="flex items-center justify-between">
                    <span className="font-semibold">
                      #{order.dailyNumber} · {order.status}
                    </span>
                                        <span className="text-xs text-gray-400">{formatElapsed(order.createdAt)}</span>
                                    </div>
                                    {order.customerName && <p className="text-sm text-gray-500">{order.customerName}</p>}
                                    <ul className="mt-2 space-y-1 text-sm">
                                        {order.items.map((item) => (
                                            <li key={item.id}>
                                                {item.quantity}× {item?.menuItem?.name ?? ''}
                                                {item.modifiers.length > 0 && (
                                                    <span className="text-gray-400">
                            {' '}
                                                        ({item.modifiers.map((m: any) => m.modifierOption?.name).filter(Boolean).join(', ')})
                          </span>
                                                )}
                                                {item.note && <div className="text-xs text-amber-600">Note: {item.note}</div>}
                                            </li>
                                        ))}
                                    </ul>
                                    <p className="mt-2 text-right text-sm font-semibold">{formatCents(order.totalCents)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
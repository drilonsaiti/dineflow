'use client';

import {use, useEffect, useState} from 'react';
import { X } from 'lucide-react';
import { api } from '@/lib/api';
import { StaffOrder } from '../dashboard/page';
import { formatCents } from '@/lib/money';
import { formatElapsed } from '@/lib/elapsed';
import {TableRow} from "@/types/table";
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/Dialog';

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
            <h1 className="text-2xl">Tables</h1>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {tables.map((table) => {
                    const count = activeCountByTable[table.id] ?? 0;
                    return (
                        <button
                            key={table.id}
                            onClick={() => openTable(table.id)}
                            className={`rounded-xl border p-4 text-left transition-colors ${
                                count > 0
                                    ? 'border-ink bg-surface-card dark:border-white dark:bg-surface-dark-elevated'
                                    : 'border-hairline bg-canvas dark:border-gray-800 dark:bg-surface-dark-elevated'
                            }`}
                        >
                            <p className="font-medium text-ink dark:text-white">{table.label}</p>
                            {table.area && <p className="text-xs text-muted">{table.area.name}</p>}
                            {count > 0 && (
                                <p className="mt-1 text-sm font-semibold text-ink dark:text-white">{count} active order{count === 1 ? '' : 's'}</p>
                            )}
                        </button>
                    );
                })}
            </div>

            <Dialog open={!!selectedTableId} onOpenChange={(open) => !open && setSelectedTableId(null)}>
                <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
                    <div className="flex items-center justify-between">
                        <DialogTitle>{selectedTable?.label}</DialogTitle>
                        <button
                            onClick={() => setSelectedTableId(null)}
                            className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface-card dark:hover:bg-surface-dark"
                            aria-label="Close"
                        >
                            <X className="h-4 w-4" aria-hidden />
                        </button>
                    </div>

                    <div className="mt-4 space-y-4">
                        {tableOrders.length === 0 && <p className="text-sm text-muted-soft">No orders yet for this table.</p>}
                        {tableOrders.map((order) => (
                            <div key={order.id} className="card !p-3">
                                <div className="flex items-center justify-between">
                    <span className="font-semibold text-ink dark:text-white">
                      #{order.dailyNumber} · {order.status}
                    </span>
                                    <span className="text-xs text-muted-soft">{formatElapsed(order.createdAt)}</span>
                                </div>
                                {order.customerName && <p className="text-sm text-muted">{order.customerName}</p>}
                                <ul className="mt-2 space-y-1 text-sm text-ink dark:text-gray-100">
                                    {order.items.map((item) => (
                                        <li key={item.id}>
                                            {item.quantity}× {item?.menuItem?.name ?? ''}
                                            {item.modifiers.length > 0 && (
                                                <span className="text-muted">
                            {' '}
                                                    ({item.modifiers.map((m: any) => m.modifierOption?.name).filter(Boolean).join(', ')})
                          </span>
                                            )}
                                            {item.note && <div className="text-xs text-warning">Note: {item.note}</div>}
                                        </li>
                                    ))}
                                </ul>
                                <p className="mt-2 text-right text-sm font-semibold text-ink dark:text-white">{formatCents(order.totalCents)}</p>
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
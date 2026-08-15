'use client';

import { useState } from 'react';
import { useTables } from '@/hooks/useTables';
import { useOrders, useOrdersForTable } from '@/hooks/useOrders';
import { useTableAssignments, useClaimTable, useReleaseTable } from '@/hooks/useTableAssignments';
import { useCurrentUserId } from '@/hooks/useCurrentUser';
import { useVenueCurrency } from '@/hooks/useVenueCurrency';
import { formatCents } from '@/lib/money';
import { formatElapsed } from '@/lib/elapsed';

export default function TablesLivePage({ params }: { params: { venueId: string } }) {
    const { venueId } = params;
    const currency = useVenueCurrency(venueId);
    const currentUserId = useCurrentUserId();

    const { data: allTables = [] } = useTables(venueId);
    const tables = allTables.filter((t) => t.isActive);
    const { data: activeOrders = [] } = useOrders(venueId); // React Query polls/refetches automatically per its default staleTime — no manual setInterval needed
    const { data: assignments = [] } = useTableAssignments(venueId);
    const claimMutation = useClaimTable(venueId);
    const releaseMutation = useReleaseTable(venueId);

    const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
    const { data: tableOrders = [] } = useOrdersForTable(venueId, selectedTableId);

    const activeCountByTable = activeOrders.reduce<Record<string, number>>((acc, o: any) => {
        acc[o.tableId] = (acc[o.tableId] ?? 0) + 1;
        return acc;
    }, {});

    const selectedTable = tables.find((t) => t.id === selectedTableId);

    return (
        <div className="mx-auto max-w-5xl p-6">
            <h1 className="text-2xl font-semibold">Tables</h1>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {tables.map((table) => {
                    const count = activeCountByTable[table.id] ?? 0;
                    const assignment = assignments.find((a) => a.tableId === table.id);
                    return (
                        <div key={table.id} className={`rounded-xl border p-4 ${count > 0 ? 'border-brand bg-brand/5' : 'border-gray-200 bg-white'}`}>
                            <button onClick={() => setSelectedTableId(table.id)} className="w-full text-left">
                                <p className="font-medium">{table.label}</p>
                                {table.area && <p className="text-xs text-gray-500">{table.area.name}</p>}
                                {count > 0 && <p className="mt-1 text-sm font-semibold text-brand">{count} active order{count === 1 ? '' : 's'}</p>}
                            </button>
                            <div className="mt-2 flex items-center justify-between text-xs">
                                <span className="text-gray-500">{assignment ? `Claimed: ${assignment.user.fullName ?? assignment.user.email}` : 'Unclaimed'}</span>
                                {assignment?.userId === currentUserId ? (
                                    <button onClick={() => releaseMutation.mutate(table.id)} className="text-red-500 underline">Release</button>
                                ) : (
                                    <button onClick={() => claimMutation.mutate(table.id)} className="text-brand underline">Claim</button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {selectedTableId && (
                <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setSelectedTableId(null)}>
                    <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold">{selectedTable?.label}</h2>
                            <button onClick={() => setSelectedTableId(null)} className="h-9 w-9 rounded-full text-lg">✕</button>
                        </div>

                        <div className="mt-4 space-y-4">
                            {tableOrders.length === 0 && <p className="text-sm text-gray-400">No orders yet for this table.</p>}
                            {tableOrders.map((order: any) => (
                                <div key={order.id} className="rounded-lg border border-gray-200 p-3">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold">#{order.dailyNumber} · {order.status}</span>
                                        <span className="text-xs text-gray-400">{formatElapsed(order.createdAt)}</span>
                                    </div>
                                    {order.customerName && <p className="text-sm text-gray-500">{order.customerName}</p>}
                                    <ul className="mt-2 space-y-1 text-sm">
                                        {order.items.map((item: any) => (
                                            <li key={item.id}>
                                                {item.quantity}× {item.menuItem.name}
                                                {item.modifiers.length > 0 && (
                                                    <span className="text-gray-400"> ({item.modifiers.map((m: any) => m.modifierOption?.name).filter(Boolean).join(', ')})</span>
                                                )}
                                                {item.note && <div className="text-xs text-amber-600">Note: {item.note}</div>}
                                            </li>
                                        ))}
                                    </ul>
                                    <p className="mt-2 text-right text-sm font-semibold">{formatCents(order.totalCents, currency)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
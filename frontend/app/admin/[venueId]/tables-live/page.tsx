'use client';

import {use, useState} from 'react';
import {X} from 'lucide-react';
import {useTables} from '@/hooks/useTables';
import {useOrders, useOrdersForTable} from '@/hooks/useOrders';
import {useClaimTable, useReleaseTable, useTableAssignments} from '@/hooks/useTableAssignments';
import {useCurrentUserId} from '@/hooks/useCurrentUser';
import {useVenueCurrency} from '@/hooks/useVenueCurrency';
import {formatCents} from '@/lib/money';
import {formatElapsed} from '@/lib/elapsed';
import {Checkbox} from '@/components/ui/Checkbox';
import {Dialog, DialogContent, DialogTitle} from '@/components/ui/Dialog';

export default function TablesLivePage({params}: { params: Promise<{ venueId: string }> }) {
    const {venueId} = use(params);
    const currency = useVenueCurrency(venueId);
    const currentUserId = useCurrentUserId();

    const {data: allTables = []} = useTables(venueId);
    const tables = allTables.filter((t) => t.isActive);
    const {data: activeOrders = []} = useOrders(venueId); // React Query polls/refetches automatically per its default staleTime — no manual setInterval needed
    const {data: assignments = []} = useTableAssignments(venueId);
    const claimMutation = useClaimTable(venueId);
    const releaseMutation = useReleaseTable(venueId);

    const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
    const [myTablesOnly, setMyTablesOnly] = useState(false);
    const {data: tableOrders = []} = useOrdersForTable(venueId, selectedTableId);

    const activeCountByTable = activeOrders.reduce<Record<string, number>>((acc, o: any) => {
        acc[o.tableId] = (acc[o.tableId] ?? 0) + 1;
        return acc;
    }, {});

    const selectedTable = tables.find((t) => t.id === selectedTableId);

    const visibleTables = tables.filter((table) => {
        if (!myTablesOnly) return true;
        const assignment = assignments.find((a) => a.tableId === table.id);
        return assignment?.userId === currentUserId;
    });

    return (
        <div className="mx-auto max-w-5xl p-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl">Tables</h1>
                <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-ink dark:text-white">
                    <Checkbox
                        checked={myTablesOnly}
                        onCheckedChange={(checked) => setMyTablesOnly(checked === true)}
                    />
                    My tables only
                </label>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {visibleTables.map((table) => {
                    const count = activeCountByTable[table.id] ?? 0;
                    const assignment = assignments.find((a) => a.tableId === table.id);
                    return (
                        <div
                            key={table.id}
                            className={`rounded-xl border p-4 transition-colors ${
                                count > 0
                                    ? 'border-ink bg-surface-card dark:border-white dark:bg-surface-dark-elevated'
                                    : 'border-hairline bg-canvas dark:border-gray-800 dark:bg-surface-dark-elevated'
                            }`}
                        >
                            <button onClick={() => setSelectedTableId(table.id)} className="w-full text-left">
                                <p className="font-medium text-ink dark:text-white">{table.label}</p>
                                {table.area && <p className="text-xs text-muted">{table.area.name}</p>}
                                {count > 0 && (
                                    <p className="mt-1 text-sm font-semibold text-ink dark:text-white">
                                        {count} active order{count === 1 ? '' : 's'}
                                    </p>
                                )}
                            </button>
                            <div className="mt-2 flex items-center justify-between text-xs">
                                <span className="text-muted">
                                    {assignment ? `Claimed: ${assignment.user.fullName ?? assignment.user.email}` : 'Unclaimed'}
                                </span>
                                {assignment?.userId === currentUserId ? (
                                    <button onClick={() => releaseMutation.mutate(table.id)}
                                            className="font-medium text-error hover:underline">
                                        Release
                                    </button>
                                ) : (
                                    <button onClick={() => claimMutation.mutate(table.id)}
                                            className="font-medium text-ink hover:underline dark:text-white">
                                        Claim
                                    </button>
                                )}
                            </div>
                        </div>
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
                            <X className="h-4 w-4" aria-hidden/>
                        </button>
                    </div>

                    <div className="mt-4 space-y-4">
                        {tableOrders.length === 0 &&
                            <p className="text-sm text-muted-soft">No orders yet for this table.</p>}
                        {tableOrders.map((order: any) => (
                            <div key={order.id} className="card !p-3">
                                <div className="flex items-center justify-between">
                                    <span
                                        className="font-semibold text-ink dark:text-white">#{order.dailyNumber} · {order.status}</span>
                                    <span className="text-xs text-muted-soft">{formatElapsed(order.createdAt)}</span>
                                </div>
                                {order.customerName && <p className="text-sm text-muted">{order.customerName}</p>}
                                <ul className="mt-2 space-y-1 text-sm text-ink dark:text-gray-100">
                                    {order.items.map((item: any) => (
                                        <li key={item.id}>
                                            {item.quantity}× {item.menuItem.name}
                                            {item.modifiers.length > 0 && (
                                                <span
                                                    className="text-muted"> ({item.modifiers.map((m: any) => m.modifierOption?.name).filter(Boolean).join(', ')})</span>
                                            )}
                                            {item.note && <div className="text-xs text-warning">Note: {item.note}</div>}
                                        </li>
                                    ))}
                                </ul>
                                <p className="mt-2 text-right text-sm font-semibold text-ink dark:text-white">{formatCents(order.totalCents, currency)}</p>
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
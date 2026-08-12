'use client';

import { useEffect, useState } from 'react';
import { formatElapsed, elapsedMinutes } from '@/lib/elapsed';
import {StaffOrder} from "@/app/admin/[venueId]/dashboard/page";

// Sequential-only transitions, mirroring the backend state machine
// (order-status.machine.ts) — the "forward" and "back" buttons shown here
// are always exactly one step, never a jump, so the UI can't submit a
// transition the server would reject anyway.
const NEXT: Record<string, string | null> = {
    RECEIVED: 'VIEWED',
    VIEWED: 'PREPARING',
    PREPARING: 'READY',
    READY: 'SERVED',
};
const PREV: Record<string, string | null> = {
    VIEWED: 'RECEIVED',
    PREPARING: 'VIEWED',
    READY: 'PREPARING',
};

export function OrderCard({
                              order,
                              lateThresholdMinutes,
                              onAdvance,
                          }: {
    order: StaffOrder;
    lateThresholdMinutes: number;
    onAdvance: (toStatus: any) => void;
}) {
    // Re-render every 30s so elapsed time and the "late" flag stay accurate
    // without needing a new order event.
    const [, forceTick] = useState(0);
    useEffect(() => {
        const id = setInterval(() => forceTick((n) => n + 1), 30000);
        return () => clearInterval(id);
    }, []);

    const isLate = elapsedMinutes(order.createdAt) >= lateThresholdMinutes;
    const next = NEXT[order.status];
    const prev = PREV[order.status];

    return (
        <div
            className={`rounded-lg border p-3 ${
                isLate ? 'border-red-500 bg-red-950/40' : 'border-gray-700 bg-gray-900'
            }`}
        >
            <div className="flex items-center justify-between">
                <span className="text-lg font-bold">#{order.dailyNumber}</span>
                <span className={`text-sm font-medium ${isLate ? 'text-red-400' : 'text-gray-400'}`}>
          {formatElapsed(order.createdAt)}
        </span>
            </div>
            <p className="text-sm text-gray-300">
                {order.table.label}
                {order.customerName ? ` · ${order.customerName}` : ''}
            </p>

            {order.statusEvents[0]?.changedBy && (
                <p className="text-xs text-gray-500">
                    last updated by {order.statusEvents[0].changedBy.fullName ?? order.statusEvents[0].changedBy.email}
                </p>
            )}

            <ul className="mt-2 space-y-1 text-sm">
                {order.items.map((item) => (
                    <li key={item.id}>
                        <span className="font-medium">{item.quantity}× {item.menuItem.name}</span>
                        {item.modifiers.length > 0 && (
                            <span className="text-gray-400">
                {' '}
                                ({item.modifiers.map((m) => m.modifierOption?.name).filter(Boolean).join(', ')})
              </span>
                        )}
                        {item.note && <div className="text-xs text-amber-400">Note: {item.note}</div>}
                    </li>
                ))}
            </ul>

            <div className="mt-3 flex gap-2">
                {prev && (
                    <button
                        onClick={() => onAdvance(prev)}
                        className="min-h-[44px] flex-1 rounded-md border border-gray-600 text-sm font-medium"
                    >
                        ← Back
                    </button>
                )}
                {next && (
                    <button
                        onClick={() => onAdvance(next)}
                        className="min-h-[44px] flex-[2] rounded-md bg-brand text-sm font-semibold"
                    >
                        {next === 'VIEWED' && 'Mark seen →'}
                        {next === 'PREPARING' && 'Start preparing →'}
                        {next === 'READY' && 'Mark ready →'}
                        {next === 'SERVED' && 'Mark served ✓'}
                    </button>
                )}
            </div>
        </div>
    );
}
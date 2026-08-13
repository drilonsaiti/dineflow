'use client';

import { useEffect, useState } from 'react';
import { formatElapsed, elapsedMinutes } from '@/lib/elapsed';
import {StaffOrder} from "@/app/admin/[venueId]/dashboard/page";
import { NEXT, PREV } from '@/lib/order-transitions';


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
                isLate
                    ? 'border-error bg-error/5 dark:bg-error/10'
                    : 'border-hairline bg-canvas dark:border-gray-700 dark:bg-surface-dark-elevated'
            }`}
        >
            <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-ink dark:text-white">#{order.dailyNumber}</span>
                <span className={`text-sm font-medium ${isLate ? 'text-error' : 'text-muted'}`}>
          {formatElapsed(order.createdAt)}
        </span>
            </div>
            <p className="text-sm text-body dark:text-gray-300">
                {order.table.label}
                {order.customerName ? ` · ${order.customerName}` : ''}
            </p>

            {order.statusEvents?.[0]?.changedBy && (
                <p className="text-xs text-muted-soft">
                    last updated by {order.statusEvents[0].changedBy.fullName ?? order.statusEvents[0].changedBy.email}
                </p>
            )}

            <ul className="mt-2 space-y-1 text-sm">
                {order.items.map((item) => (
                    <li key={item.id}>
                        <span className="font-medium text-ink dark:text-white">{item.quantity}× {item?.menuItem?.name ?? ''}</span>
                        {item.modifiers.length > 0 && (
                            <span className="text-muted">
                {' '}
                                ({item.modifiers.map((m) => m.modifierOption?.name).filter(Boolean).join(', ')})
              </span>
                        )}
                        {item.note && <div className="text-xs text-warning">Note: {item.note}</div>}
                    </li>
                ))}
            </ul>

            <div className="mt-3 flex gap-2">
                {prev && (
                    <button
                        onClick={() => onAdvance(prev)}
                        className="btn-secondary flex-1 text-sm"
                    >
                        ← Back
                    </button>
                )}
                {next && (
                    <button
                        onClick={() => onAdvance(next)}
                        className="btn-primary flex-[2] text-sm"
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
'use client';

import {use} from 'react';
import {useTableTab} from '@/hooks/useTableRequestsPublic';
import {useVenueCurrencyPublic} from '../layout';
import {formatCents} from '@/lib/money';

export default function TableTabPage({params}: { params: Promise<{ venueSlug: string; token: string }> }) {
    const {token} = use(params);
    const currency = useVenueCurrencyPublic();
    const {data: tab, isLoading, error} = useTableTab(token);

    if (error) return <div className="p-8 text-center text-muted">{(error as Error).message}</div>;
    if (isLoading || !tab) return <div className="p-8 text-center text-muted-soft">Loading…</div>;
    if (tab.orderCount === 0) return <div className="p-8 text-center text-muted">Nothing ordered yet.</div>;

    return (
        <div className="px-4 py-4">
            <h1 className="text-xl">Table tab</h1>
            <p className="text-sm text-muted">Everything ordered so far, by who added it.</p>

            {tab.note && <p className="mt-4 text-xs text-muted-soft">{tab.note}</p>}
            <div className="mt-4 space-y-4">
                {tab.byPerson.map((person: any) => (
                    <div
                        key={person.label}
                        className="rounded-xl border border-hairline bg-canvas p-4 dark:border-gray-800 dark:bg-surface-dark-elevated"
                    >
                        <div className="flex items-center justify-between">
                            <p className="font-medium text-ink dark:text-white">{person.label}</p>
                            <p className="font-semibold text-ink dark:text-white">{formatCents(person.totalCents, currency)}</p>
                        </div>
                        <ul className="mt-2 space-y-1 text-sm text-body dark:text-gray-300">
                            {person.items.map((item: any, i: number) => (
                                <li key={i}>
                                    {item.quantity}× {item.name}
                                    {item.modifiers.length > 0 && (
                                        <span className="text-muted"> ({item.modifiers.join(', ')})</span>
                                    )}
                                    {item.note && <span className="block text-xs text-warning">Note: {item.note}</span>}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            <div
                className="mt-4 flex items-center justify-between rounded-xl bg-surface-card p-4 text-lg font-semibold text-ink dark:bg-surface-dark-elevated dark:text-white">
                <span>Table total</span>
                <span>{formatCents(tab.grandTotalCents, currency)}</span>
            </div>
        </div>
    );
}
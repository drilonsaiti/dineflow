'use client';

import { useEffect, useState } from 'react';
import { getSessionToken } from '@/lib/session';
import { formatCents } from '@/lib/money';
import {useVenueCurrencyPublic} from "@/app/r/[venueSlug]/t/[token]/layout";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

interface TabData {
    orderCount: number;
    byPerson: { label: string; totalCents: number; items: { name: string; quantity: number; lineTotalCents: number; note: string | null; modifiers: string[] }[] }[];
    grandTotalCents: number;
}

export default function TableTabPage({ params }: { params: { venueSlug: string; token: string } }) {
    const { token } = params;
    const [tab, setTab] = useState<TabData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const currency = useVenueCurrencyPublic();

    useEffect(() => {
        const session = getSessionToken(token);
        fetch(`${API_URL}/public/tables/${token}/tab?session=${session}`)
            .then(async (res) => {
                if (!res.ok) throw new Error((await res.json()).message ?? 'Could not load the tab.');
                return res.json();
            })
            .then(setTab)
            .catch((e) => setError(e.message));
    }, [token]);

    if (error) return <div className="p-8 text-center text-gray-500">{error}</div>;
    if (!tab) return <div className="p-8 text-center text-gray-400">Loading…</div>;

    if (tab.orderCount === 0) {
        return <div className="p-8 text-center text-gray-500">Nothing ordered yet.</div>;
    }

    return (
        <div className="px-4 py-4">
            <h1 className="text-xl font-semibold">Table tab</h1>
            <p className="text-sm text-gray-500">Everything ordered so far, by who added it.</p>

            <div className="mt-4 space-y-4">
                {tab.byPerson.map((person) => (
                    <div key={person.label} className="rounded-xl border border-gray-200 bg-white p-4">
                        <div className="flex items-center justify-between">
                            <p className="font-medium">{person.label}</p>
                            <p className="font-semibold">{formatCents(person.totalCents, currency)}</p>
                        </div>
                        <ul className="mt-2 space-y-1 text-sm text-gray-600">
                            {person.items.map((item, i) => (
                                <li key={i}>
                                    {item.quantity}× {item.name}
                                    {item.modifiers.length > 0 && <span className="text-gray-400"> ({item.modifiers.join(', ')})</span>}
                                    {item.note && <span className="block text-xs text-amber-600">Note: {item.note}</span>}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            <div className="mt-4 flex items-center justify-between rounded-xl bg-gray-50 p-4 text-lg font-semibold">
                <span>Table total</span>
                <span>{formatCents(tab.grandTotalCents,currency )}</span>
            </div>
        </div>
    );
}
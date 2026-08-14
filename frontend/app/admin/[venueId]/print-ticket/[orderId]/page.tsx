'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatCents } from '@/lib/money';

interface TicketOrder {
    dailyNumber: number;
    createdAt: string;
    customerName: string | null;
    table: { label: string };
    items: { quantity: number; note: string | null; menuItem: { name: string }; modifiers: { modifierOption?: { name: string } }[] }[];
    totalCents: number;
}

// 80mm-width receipt layout — the standard thermal printer paper size.
// Auto-triggers window.print() on load so opening this page (in a new tab
// from the dashboard) is the entire action needed.
export default function PrintTicketPage({ params }: { params: { venueId: string; orderId: string } }) {
    const { venueId, orderId } = params;
    const [order, setOrder] = useState<TicketOrder | null>(null);
    const [currency, setCurrency] = useState('USD');

    useEffect(() => {
        Promise.all([
            api.get<TicketOrder>(`/venues/${venueId}/orders/${orderId}`).catch(() =>
                // Fallback: not every backend build has a single-order GET yet —
                // pull it from the list endpoint if so.
                api.get<TicketOrder[]>(`/venues/${venueId}/orders`).then((all) => (all as any).find((o: any) => o.id === orderId)),
            ),
            api.get<{ currency: string }>(`/venues/${venueId}`),
        ]).then(([o, v]) => {
            setOrder(o as TicketOrder);
            setCurrency(v.currency);
        });
    }, [venueId, orderId]);

    useEffect(() => {
        if (order) setTimeout(() => window.print(), 300);
    }, [order]);

    if (!order) return null;

    return (
        <div className="mx-auto w-[300px] p-2 font-mono text-xs">
            <p className="text-center text-sm font-bold">ORDER #{order.dailyNumber}</p>
            <p className="text-center">{order.table.label}</p>
            <p className="text-center text-gray-500">{new Date(order.createdAt).toLocaleTimeString()}</p>
            {order.customerName && <p className="text-center">{order.customerName}</p>}
            <hr className="my-2 border-dashed border-black" />
            {order.items.map((item, i) => (
                <div key={i} className="mb-1">
                    <p className="font-semibold">{item.quantity}x {item.menuItem.name}</p>
                    {item.modifiers.length > 0 && (
                        <p className="pl-2 text-gray-600">{item.modifiers.map((m) => m.modifierOption?.name).filter(Boolean).join(', ')}</p>
                    )}
                    {item.note && <p className="pl-2">** {item.note}</p>}
                </div>
            ))}
            <hr className="my-2 border-dashed border-black" />
            <p className="text-right font-bold">{formatCents(order.totalCents, currency)}</p>
        </div>
    );
}
'use client';

import { use, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { formatCents } from '@/lib/money';

const API_URL = process.env.NEXT_PUBLIC_API_URL!;
const POLL_INTERVAL_MS = 4000; // short, deliberate delay (section 11) — not a bug

const STATUS_STEPS = ['RECEIVED', 'VIEWED', 'PREPARING', 'READY', 'SERVED'] as const;
const STATUS_LABELS: Record<string, string> = {
    RECEIVED: 'Received',
    VIEWED: 'Seen by staff',
    PREPARING: 'Preparing',
    READY: 'Ready',
    SERVED: 'Served',
    CANCELLED: 'Cancelled',
};

interface OrderData {
    id: string;
    dailyNumber: number;
    status: string;
    totalCents: number;
    customerName: string | null;
    items: {
        id: string;
        quantity: number;
        lineTotalCents: number;
        note: string | null;
        menuItem: { name: string };
        modifiers: { priceDeltaCents: number }[];
    }[];
    table: { label: string; venueId: string };
}

export default function OrderTrackingPage({
                                              params,
                                          }: {
    params: Promise<{ venueSlug: string; token: string; orderId: string }>;
}) {
    const { venueSlug, token, orderId } = use(params);
    const [order, setOrder] = useState<OrderData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    async function fetchOrder() {
        try {
            const res = await fetch(`${API_URL}/public/orders/${orderId}?table=${token}`);
            if (!res.ok) throw new Error('Order not found.');
            setOrder(await res.json());
            setError(null);
        } catch {
            setError('Could not load your order right now.');
        }
    }

    useEffect(() => {
        fetchOrder();
        intervalRef.current = setInterval(fetchOrder, POLL_INTERVAL_MS);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orderId]);

    // Stop polling once the order reaches a terminal state — no point
    // hammering the endpoint for an order that will never change again.
    useEffect(() => {
        if (order && ['SERVED', 'CANCELLED'].includes(order.status) && intervalRef.current) {
            clearInterval(intervalRef.current);
        }
    }, [order?.status]);

    if (error && !order) {
        return <div className="p-8 text-center text-gray-500">{error}</div>;
    }
    if (!order) {
        return <div className="p-8 text-center text-gray-400">Loading your order…</div>;
    }

    const currentIndex = STATUS_STEPS.indexOf(order.status as any);

    return (
        <div className="px-4 py-6">
            <div className="text-center">
                <p className="text-sm text-gray-500">Order</p>
                <h1 className="text-3xl font-bold">#{order.dailyNumber}</h1>
                {order.customerName && <p className="text-sm text-gray-500">for {order.customerName}</p>}
            </div>

            {order.status === 'CANCELLED' ? (
                <div className="mt-8 rounded-xl bg-red-50 p-4 text-center text-red-700">
                    This order was cancelled. Ask staff if you have questions.
                </div>
            ) : (
                <div
                    className="mt-8 flex items-center justify-between"
                    role="status"
                    aria-live="polite"
                    aria-label={`Order status: ${STATUS_LABELS[order.status]}`}
                >
                    {STATUS_STEPS.map((step, i) => (
                        <div key={step} className="flex flex-1 flex-col items-center">
                            <div
                                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium ${
                                    i <= currentIndex ? 'bg-brand text-white' : 'bg-gray-100 text-gray-400'
                                }`}
                            >
                                {i < currentIndex ? '✓' : i + 1}
                            </div>
                            <p className={`mt-1 text-center text-[11px] ${i <= currentIndex ? 'text-gray-800' : 'text-gray-400'}`}>
                                {STATUS_LABELS[step]}
                            </p>
                            {i < STATUS_STEPS.length - 1 && (
                                <div className={`absolute mt-4 h-0.5 w-full ${i < currentIndex ? 'bg-brand' : 'bg-gray-100'}`} style={{ display: 'none' }} />
                            )}
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-8 rounded-xl border border-gray-200 bg-white divide-y divide-gray-100 dark:border-gray-800 dark:bg-gray-900">
                {order.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3">
                        <div>
                            <p className="text-sm font-medium">
                                {item.quantity}× {item.menuItem.name}
                            </p>
                            {item.note && <p className="text-xs text-gray-500">{item.note}</p>}
                        </div>
                        <p className="text-sm text-gray-600">{formatCents(item.lineTotalCents)}</p>
                    </div>
                ))}
                <div className="flex items-center justify-between p-3 font-semibold">
                    <span>Total</span>
                    <span>{formatCents(order.totalCents)}</span>
                </div>
            </div>

            <Link
                href={`/r/${venueSlug}/t/${token}`}
                className="mt-6 flex min-h-[44px] w-full items-center justify-center rounded-full border border-gray-200 font-medium"
            >
                Add more items
            </Link>
        </div>
    );
}
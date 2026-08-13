'use client';

import { use, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { formatCents } from '@/lib/money';
import {Banknote, HandMetal} from "lucide-react";

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
    const [requestSent, setRequestSent] = useState<string | null>(null);
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

    async function sendTableRequest(type: 'CALL_WAITER' | 'REQUEST_BILL_CASH') {
        try {
            await fetch(`${API_URL}/public/table-requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tableToken: token, type }),
            });
            setRequestSent(type);
            setTimeout(() => setRequestSent(null), 5000);
        } catch {
            // silent — not critical enough to interrupt the tracking screen
        }
    }

    if (error && !order) {
        return <div className="p-8 text-center text-muted">{error}</div>;
    }
    if (!order) {
        return <div className="p-8 text-center text-muted-soft">Loading your order…</div>;
    }



    const currentIndex = STATUS_STEPS.indexOf(order.status as any);

    return (
        <div className="px-4 py-6">
            <div className="text-center">
                <p className="text-sm text-muted">Order</p>
                <h1 className="text-3xl">#{order.dailyNumber}</h1>
                {order.customerName && <p className="text-sm text-muted">for {order.customerName}</p>}
            </div>

            {order.status === 'CANCELLED' ? (
                <div className="mt-8 rounded-xl bg-error/5 p-4 text-center text-error">
                    This order was cancelled. Ask staff if you have questions.
                </div>
            ) : (
                <div
                    className="relative mt-8 flex items-start justify-between"
                    role="status"
                    aria-live="polite"
                    aria-label={`Order status: ${STATUS_LABELS[order.status]}`}
                >
                    <div className="absolute left-0 right-0 top-[18px] -z-10 mx-[18px] h-0.5 bg-surface-strong dark:bg-gray-700">
                        <div
                            className="h-full bg-accent transition-all"
                            style={{
                                width: currentIndex <= 0 ? '0%' : `${(currentIndex / (STATUS_STEPS.length - 1)) * 100}%`,
                            }}
                        />
                    </div>

                    {STATUS_STEPS.map((step, i) => (
                        <div key={step} className="flex flex-1 flex-col items-center">
                            <div
                                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium ${
                                    i <= currentIndex ? 'bg-accent text-white' : 'bg-surface-card text-muted-soft dark:bg-surface-dark-elevated'
                                }`}
                            >
                                {i < currentIndex ? '✓' : i + 1}
                            </div>
                            <p className={`mt-1 text-center text-[11px] ${i <= currentIndex ? 'text-ink dark:text-white' : 'text-muted-soft'}`}>
                                {STATUS_LABELS[step]}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-8 divide-y divide-hairline-soft rounded-xl border border-hairline bg-canvas dark:divide-gray-800 dark:border-gray-800 dark:bg-surface-dark-elevated">
                {order.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3">
                        <div>
                            <p className="text-sm font-medium text-ink dark:text-white">
                                {item.quantity}× {item?.menuItem?.name ?? ''}
                            </p>
                            {item.note && <p className="text-xs text-muted">{item.note}</p>}
                        </div>
                        <p className="text-sm text-muted">{formatCents(item.lineTotalCents)}</p>
                    </div>
                ))}
                <div className="flex items-center justify-between p-3 font-semibold text-ink dark:text-white">
                    <span>Total</span>
                    <span>{formatCents(order.totalCents)}</span>
                </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                    type="button"
                    onClick={() => sendTableRequest('CALL_WAITER')}
                    className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-hairline bg-canvas text-sm font-medium text-ink transition-colors hover:bg-surface-card dark:border-gray-800 dark:bg-surface-dark-elevated dark:text-white dark:hover:bg-gray-800"
                >
                    <HandMetal className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                    Call waiter
                </button>
                <button
                    type="button"
                    onClick={() => sendTableRequest('REQUEST_BILL_CASH')}
                    className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-hairline bg-canvas text-sm font-medium text-ink transition-colors hover:bg-surface-card dark:border-gray-800 dark:bg-surface-dark-elevated dark:text-white dark:hover:bg-gray-800"
                >
                    <Banknote className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                    Pay with cash
                </button>
            </div>
            {requestSent && (
                <p
                    role="status"
                    aria-live="polite"
                    className="mt-2 text-center text-sm text-accent"
                >
                    {requestSent === 'CALL_WAITER'
                        ? 'A staff member is on their way.'
                        : 'Staff will bring your bill for cash payment.'}
                </p>
            )}

            <Link
                href={`/r/${venueSlug}/t/${token}`}
                className="btn-secondary mt-6 w-full rounded-full"
            >
                Add more items
            </Link>
        </div>
    );
}
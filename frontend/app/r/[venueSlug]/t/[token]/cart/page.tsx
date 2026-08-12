'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatCents } from '@/lib/money';
import { pushRound } from '@/lib/cart';
import {useCart} from "@/components/CartContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

export default function CartPage({ params }: { params: Promise<{ venueSlug: string; token: string }> }) {
    const { token, venueSlug } = use(params);
    const { lines, updateQuantity, updateNote, removeLine, clear, subtotalCents, removeMenuItemIds } = useCart();
    const [customerName, setCustomerName] = useState('');
    const [orderNote, setOrderNote] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const [customerPhone, setCustomerPhone] = useState('');

    async function placeOrder() {
        setSubmitting(true);
        setError(null);
        try {
            const res = await fetch(`${API_URL}/public/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tableToken: token,
                    customerName: customerName || undefined,
                    customerPhone: customerPhone || undefined,
                    note: orderNote || undefined,
                    items: lines.map((l) => ({
                        menuItemId: l.menuItemId,
                        quantity: l.quantity,
                        note: l.note,
                        modifiers: l.modifiers.map((m) => ({ modifierOptionId: m.modifierOptionId })),
                    })),
                }),
            });

            const body = await res.json();

            if (!res.ok) {
                // Item 86'd while sitting in the cart (section 18) — reject clearly,
                // drop just those lines, let the customer retry the rest.
                if (body.unavailableMenuItemIds) {
                    removeMenuItemIds(body.unavailableMenuItemIds);
                    setError('Some items are no longer available and were removed from your cart. Please review and try again.');
                } else {
                    setError(body.message ?? 'Something went wrong placing your order.');
                }
                return;
            }

            pushRound(token, body.id);
            clear();
            router.push(`/r/${venueSlug}/t/${token}/order/${body.id}`);
        } catch {
            setError('Could not reach the server. Please check your connection and try again.');
        } finally {
            setSubmitting(false);
        }
    }

    if (lines.length === 0) {
        return (
            <div className="p-8 text-center text-gray-500">
                Your cart is empty.{' '}
                <a href={`/r/${venueSlug}/t/${token}`} className="text-brand underline">
                    Back to menu
                </a>
            </div>
        );
    }

    return (
        <div className="px-4 py-4">
            <h1 className="text-xl font-semibold">Your order</h1>

            <div className="mt-4 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                {lines.map((line) => (
                    <div key={line.lineId} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                <p className="font-medium">{line.name}</p>
                                {line.modifiers.length > 0 && (
                                    <p className="text-sm text-gray-500">
                                        {line.modifiers.map((m) => m.name).join(', ')}
                                    </p>
                                )}
                            </div>
                            <p className="shrink-0 font-medium">{formatCents(line.unitPriceCents * line.quantity)}</p>
                        </div>

                        <input
                            className="mt-2 w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm"
                            placeholder="Note, e.g. no onions"
                            value={line.note ?? ''}
                            onChange={(e) => updateNote(line.lineId, e.target.value)}
                        />

                        <div className="mt-2 flex items-center justify-between">
                            <div className="flex items-center rounded-full border border-gray-200">
                                <button
                                    onClick={() => updateQuantity(line.lineId, line.quantity - 1)}
                                    className="flex h-11 w-11 items-center justify-center text-lg"
                                    aria-label="Decrease quantity"
                                >
                                    −
                                </button>
                                <span className="w-6 text-center">{line.quantity}</span>
                                <button
                                    onClick={() => updateQuantity(line.lineId, line.quantity + 1)}
                                    className="flex h-11 w-11 items-center justify-center text-lg"
                                    aria-label="Increase quantity"
                                >
                                    +
                                </button>
                            </div>
                            <button
                                onClick={() => removeLine(line.lineId)}
                                className="min-h-[44px] px-2 text-sm text-red-500"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-4 space-y-3">
                <div>
                    <label className="text-sm font-medium">Your name (optional)</label>
                    <input
                        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                        placeholder="So staff can call you by name"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                    />
                </div>
                <div>
                    <label className="text-sm font-medium">
                        Phone number <span className="text-gray-400 font-normal">(optional — get a text when it's ready)</span>
                    </label>
                    <input
                        type="tel"
                        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                        placeholder="+1 555 123 4567"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                    />
                </div>
                <div>
                    <label className="text-sm font-medium">Note for the whole order (optional)</label>
                    <textarea
                        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                        rows={2}
                        value={orderNote}
                        onChange={(e) => setOrderNote(e.target.value)}
                    />
                </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-lg font-semibold">
                <span>Total</span>
                <span>{formatCents(subtotalCents)}</span>
            </div>

            {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

            <button
                onClick={placeOrder}
                disabled={submitting}
                className="mt-4 flex min-h-[48px] w-full items-center justify-center rounded-full bg-brand font-medium text-white disabled:opacity-50"
            >
                {submitting ? 'Placing order…' : 'Place order'}
            </button>
        </div>
    );
}
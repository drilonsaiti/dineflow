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
            <div className="p-8 text-center text-muted">
                Your cart is empty.{' '}

                <a href={`/r/${venueSlug}/t/${token}`}
                className="font-medium underline"
                style={{ color: 'var(--brand-color, #EA580C)' }}
                >
                Back to menu
            </a>
    </div>
    );
    }

    return (
        <div className="px-4 py-4">
            <h1 className="text-xl">Your order</h1>

            <div className="mt-4 divide-y divide-hairline-soft rounded-xl border border-hairline bg-canvas dark:divide-gray-800 dark:border-gray-800 dark:bg-surface-dark-elevated">
                {lines.map((line) => (
                    <div key={line.lineId} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                <p className="font-medium text-ink dark:text-white">{line.name}</p>
                                {line.modifiers.length > 0 && (
                                    <p className="text-sm text-muted">
                                        {line.modifiers.map((m) => m.name).join(', ')}
                                    </p>
                                )}
                            </div>
                            <p className="shrink-0 font-medium text-ink dark:text-white">{formatCents(line.unitPriceCents * line.quantity)}</p>
                        </div>

                        <input
                            className="input mt-2 py-1.5 text-sm"
                            placeholder="Note, e.g. no onions"
                            value={line.note ?? ''}
                            onChange={(e) => updateNote(line.lineId, e.target.value)}
                        />

                        <div className="mt-2 flex items-center justify-between">
                            <div className="flex items-center rounded-full border border-hairline dark:border-gray-700">
                                <button
                                    onClick={() => updateQuantity(line.lineId, line.quantity - 1)}
                                    className="flex h-11 w-11 items-center justify-center text-lg text-ink dark:text-white"
                                    aria-label="Decrease quantity"
                                >
                                    −
                                </button>
                                <span className="w-6 text-center text-ink dark:text-white">{line.quantity}</span>
                                <button
                                    onClick={() => updateQuantity(line.lineId, line.quantity + 1)}
                                    className="flex h-11 w-11 items-center justify-center text-lg text-ink dark:text-white"
                                    aria-label="Increase quantity"
                                >
                                    +
                                </button>
                            </div>
                            <button onClick={() => removeLine(line.lineId)} className="btn-ghost-danger">
                                Remove
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-4 space-y-3">
                <div>
                    <label className="text-sm font-medium text-ink dark:text-white">Your name (optional)</label>
                    <input
                        className="input mt-1"
                        placeholder="So staff can call you by name"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                    />
                </div>
                <div>
                    <label className="text-sm font-medium text-ink dark:text-white">
                        Phone number <span className="text-muted-soft font-normal">(optional — get a text when it's ready)</span>
                    </label>
                    <input
                        type="tel"
                        className="input mt-1"
                        placeholder="+1 555 123 4567"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                    />
                </div>
                <div>
                    <label className="text-sm font-medium text-ink dark:text-white">Note for the whole order (optional)</label>
                    <textarea
                        className="input mt-1"
                        rows={2}
                        value={orderNote}
                        onChange={(e) => setOrderNote(e.target.value)}
                    />
                </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-lg font-semibold text-ink dark:text-white">
                <span>Total</span>
                <span>{formatCents(subtotalCents)}</span>
            </div>

            {error && <p className="mt-3 text-sm text-error">{error}</p>}

            <button
                onClick={placeOrder}
                disabled={submitting}
                className="mt-4 flex min-h-[48px] w-full items-center justify-center rounded-full text-sm font-medium text-white transition-colors disabled:opacity-50"
                style={{ backgroundColor: 'var(--brand-color, #EA580C)' }}
            >
                {submitting ? 'Placing order…' : 'Place order'}
            </button>
        </div>
    );
}
'use client';

import {use, useState} from 'react';
import {useRouter} from 'next/navigation';
import {usePlaceOrder} from '@/hooks/usePublicOrders';
import {useBulkRemoveCartItems} from '@/hooks/useTableCart';
import {useVenueCurrencyPublic} from '../layout';
import {formatCents} from '@/lib/money';
import {useCart} from "@/components/CartContext";

export default function CartPage({params}: { params: Promise<{ venueSlug: string; token: string }> }) {
    const {token, venueSlug} = use(params);
    const currency = useVenueCurrencyPublic();
    const {lines, loading, guestName, setGuestName, updateQuantity, updateNote, removeLine, subtotalCents} = useCart();
    const placeOrderMutation = usePlaceOrder(token);
    const bulkRemoveMutation = useBulkRemoveCartItems(token);

    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [orderNote, setOrderNote] = useState('');
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    async function placeOrder() {
        setError(null);
        try {
            const order = await placeOrderMutation.mutateAsync({
                customerName: customerName || undefined,
                customerPhone: customerPhone || undefined,
                note: orderNote || undefined,
            });
            router.push(`/r/${venueSlug}/t/${token}/order/${order.id}`);
        } catch (err: any) {
            if (err.unavailableMenuItemIds) {
                await bulkRemoveMutation.mutateAsync(err.unavailableMenuItemIds);
                setError('Some items are no longer available and were removed from the shared cart. Please review and try again.');
            } else {
                setError(err.message ?? 'Something went wrong placing your order.');
            }
        }
    }

    if (loading) return <div className="p-8 text-center text-muted-soft">Loading cart…</div>;

    if (lines.length === 0) {
        return (
            <div className="p-8 text-center text-muted">
                The table's cart is empty.{' '}

                <a href={`/r/${venueSlug}/t/${token}`}
                   className="font-medium underline"
                   style={{color: 'var(--brand-color, #EA580C)'}}
                >
                    Back to menu
                </a>
            </div>
        );
    }

    return (
        <div className="px-4 py-4">
            <h1 className="text-xl">Your table's order</h1>
            <p className="text-sm text-muted">Everyone at this table shares this cart — add, edit, or remove
                anything.</p>

            <div className="mt-3">
                <label className="text-xs font-medium text-muted">Your name (optional — shows on items you add)</label>
                <input
                    className="input mt-1"
                    placeholder="Alex"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                />
            </div>

            <div
                className="mt-4 divide-y divide-hairline-soft rounded-xl border border-hairline bg-canvas dark:divide-gray-800 dark:border-gray-800 dark:bg-surface-dark-elevated">
                {lines.map((line) => (
                    <div key={line.id} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                <p className="font-medium text-ink dark:text-white">
                                    {line.name}
                                    {!line.isAvailable &&
                                        <span className="ml-2 text-xs text-error">No longer available</span>}
                                </p>
                                {line.modifiers.length > 0 && (
                                    <p className="text-sm text-muted">{line.modifiers.map((m) => m.name).join(', ')}</p>
                                )}
                                {line.addedByLabel &&
                                    <p className="text-xs text-muted-soft">added by {line.addedByLabel}</p>}
                            </div>
                            <p className="shrink-0 font-medium text-ink dark:text-white">{formatCents(line.lineTotalCents, currency)}</p>
                        </div>

                        <input
                            className="input mt-2 py-1.5 text-sm"
                            placeholder="Note, e.g. no onions"
                            defaultValue={line.note ?? ''}
                            onBlur={(e) => updateNote(line.id, e.target.value)}
                        />

                        <div className="mt-2 flex items-center justify-between">
                            <div className="flex items-center rounded-full border border-hairline dark:border-gray-700">
                                <button onClick={() => updateQuantity(line.id, line.quantity - 1)}
                                        className="flex h-11 w-11 items-center justify-center text-lg text-ink dark:text-white"
                                        aria-label="Decrease quantity">−
                                </button>
                                <span className="w-6 text-center text-ink dark:text-white">{line.quantity}</span>
                                <button onClick={() => updateQuantity(line.id, line.quantity + 1)}
                                        className="flex h-11 w-11 items-center justify-center text-lg text-ink dark:text-white"
                                        aria-label="Increase quantity">+
                                </button>
                            </div>
                            <button onClick={() => removeLine(line.id)} className="btn-ghost-danger">Remove</button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-4 space-y-3">
                <div>
                    <label className="text-sm font-medium text-ink dark:text-white">Your name for the order
                        (optional)</label>
                    <input className="input mt-1" placeholder="So staff can call you by name" value={customerName}
                           onChange={(e) => setCustomerName(e.target.value)}/>
                </div>
                <div>
                    <label className="text-sm font-medium text-ink dark:text-white">Phone <span
                        className="text-muted-soft font-normal">(optional — get a text when it's ready)</span></label>
                    <input type="tel" className="input mt-1" value={customerPhone}
                           onChange={(e) => setCustomerPhone(e.target.value)}/>
                </div>
                <div>
                    <label className="text-sm font-medium text-ink dark:text-white">Note for the whole order
                        (optional)</label>
                    <textarea className="input mt-1" rows={2} value={orderNote}
                              onChange={(e) => setOrderNote(e.target.value)}/>
                </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-lg font-semibold text-ink dark:text-white">
                <span>Total</span>
                <span>{formatCents(subtotalCents, currency)}</span>
            </div>

            {error && <p className="mt-3 text-sm text-error">{error}</p>}

            <button
                onClick={placeOrder}
                disabled={placeOrderMutation.isPending}
                className="mt-4 flex min-h-[48px] w-full items-center justify-center rounded-full text-sm font-medium text-white transition-colors disabled:opacity-50"
                style={{backgroundColor: 'var(--brand-color, #EA580C)'}}
            >
                {placeOrderMutation.isPending ? 'Placing order…' : 'Place order for the table'}
            </button>
        </div>
    );
}
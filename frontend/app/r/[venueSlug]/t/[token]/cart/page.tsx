'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePlaceOrder } from '@/hooks/usePublicOrders';
import { useBulkRemoveCartItems } from '@/hooks/useTableCart';
import { useVenueCurrencyPublic } from '../layout';
import { formatCents } from '@/lib/money';
import {useCart} from "@/components/CartContext";

export default function CartPage({ params }: { params: { venueSlug: string; token: string } }) {
    const { token, venueSlug } = params;
    const currency = useVenueCurrencyPublic();
    const { lines, loading, guestName, setGuestName, updateQuantity, updateNote, removeLine, subtotalCents } = useCart();
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

    if (loading) return <div className="p-8 text-center text-gray-400">Loading cart…</div>;

    if (lines.length === 0) {
        return (
            <div className="p-8 text-center text-gray-500">
                The table's cart is empty.{' '}
                <a href={`/r/${venueSlug}/t/${token}`} className="text-brand underline">Back to menu</a>
            </div>
        );
    }

    return (
        <div className="px-4 py-4">
            <h1 className="text-xl font-semibold">Your table's order</h1>
            <p className="text-sm text-gray-500">Everyone at this table shares this cart — add, edit, or remove anything.</p>

            <div className="mt-3">
                <label className="text-xs font-medium text-gray-500">Your name (optional — shows on items you add)</label>
                <input
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    placeholder="Alex"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                />
            </div>

            <div className="mt-4 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
                {lines.map((line) => (
                    <div key={line.id} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                <p className="font-medium">
                                    {line.name}
                                    {!line.isAvailable && <span className="ml-2 text-xs text-red-500">No longer available</span>}
                                </p>
                                {line.modifiers.length > 0 && <p className="text-sm text-gray-500">{line.modifiers.map((m) => m.name).join(', ')}</p>}
                                {line.addedByLabel && <p className="text-xs text-gray-400">added by {line.addedByLabel}</p>}
                            </div>
                            <p className="shrink-0 font-medium">{formatCents(line.lineTotalCents, currency)}</p>
                        </div>

                        <input
                            className="mt-2 w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm"
                            placeholder="Note, e.g. no onions"
                            defaultValue={line.note ?? ''}
                            onBlur={(e) => updateNote(line.id, e.target.value)}
                        />

                        <div className="mt-2 flex items-center justify-between">
                            <div className="flex items-center rounded-full border border-gray-200">
                                <button onClick={() => updateQuantity(line.id, line.quantity - 1)} className="flex h-11 w-11 items-center justify-center text-lg" aria-label="Decrease quantity">−</button>
                                <span className="w-6 text-center">{line.quantity}</span>
                                <button onClick={() => updateQuantity(line.id, line.quantity + 1)} className="flex h-11 w-11 items-center justify-center text-lg" aria-label="Increase quantity">+</button>
                            </div>
                            <button onClick={() => removeLine(line.id)} className="min-h-[44px] px-2 text-sm text-red-500">Remove</button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-4 space-y-3">
                <div>
                    <label className="text-sm font-medium">Your name for the order (optional)</label>
                    <input className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="So staff can call you by name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                </div>
                <div>
                    <label className="text-sm font-medium">Phone <span className="text-gray-400 font-normal">(optional — get a text when it's ready)</span></label>
                    <input type="tel" className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
                </div>
                <div>
                    <label className="text-sm font-medium">Note for the whole order (optional)</label>
                    <textarea className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" rows={2} value={orderNote} onChange={(e) => setOrderNote(e.target.value)} />
                </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-lg font-semibold">
                <span>Total</span>
                <span>{formatCents(subtotalCents, currency)}</span>
            </div>

            {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

            <button onClick={placeOrder} disabled={placeOrderMutation.isPending} className="mt-4 flex min-h-[48px] w-full items-center justify-center rounded-full bg-brand font-medium text-white disabled:opacity-50">
                {placeOrderMutation.isPending ? 'Placing order…' : 'Place order for the table'}
            </button>
        </div>
    );
}
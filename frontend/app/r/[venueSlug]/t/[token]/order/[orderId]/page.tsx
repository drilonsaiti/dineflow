'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useOrderTracking, useSubmitFeedback, useEstimatedWait } from '@/hooks/usePublicOrders';
import { useActiveTableRequests, useCreateTableRequest } from '@/hooks/useTableRequestsPublic';
import { useVenueCurrencyPublic } from '../../layout';
import { formatCents } from '@/lib/money';

const STATUS_STEPS = ['RECEIVED', 'VIEWED', 'PREPARING', 'READY', 'SERVED'] as const;
const STATUS_LABELS: Record<string, string> = {
    RECEIVED: 'Received',
    VIEWED: 'Seen by staff',
    PREPARING: 'Preparing',
    READY: 'Ready',
    SERVED: 'Served',
    CANCELLED: 'Cancelled',
};

export default function OrderTrackingPage({
                                              params,
                                          }: {
    params: { venueSlug: string; token: string; orderId: string };
}) {
    const { venueSlug, token, orderId } = params;
    const currency = useVenueCurrencyPublic();

    const { data: order, error } = useOrderTracking(orderId, token);
    const { data: estimatedWaitData } = useEstimatedWait(venueSlug);
    const { data: activeRequests = [] } = useActiveTableRequests(token);
    const createRequestMutation = useCreateTableRequest(token);
    const feedbackMutation = useSubmitFeedback(orderId);

    const [showGuestCount, setShowGuestCount] = useState(false);
    const [guestCount, setGuestCount] = useState(2);
    const [tipPercent, setTipPercent] = useState(0);
    const [requestResult, setRequestResult] = useState<any>(null);

    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [feedbackSent, setFeedbackSent] = useState(false);

    async function sendTableRequest(type: 'CALL_WAITER' | 'REQUEST_BILL_CASH', count?: number, tip?: number) {
        const result = await createRequestMutation.mutateAsync({ type, guestCount: count, tipPercent: tip });
        setRequestResult(result);
        setShowGuestCount(false);
    }

    async function submitFeedback() {
        if (rating === 0) return;
        await feedbackMutation.mutateAsync({ tableToken: token, rating, comment: comment || undefined });
        setFeedbackSent(true);
    }

    if (error && !order) return <div className="p-8 text-center text-gray-500">{(error as Error).message}</div>;
    if (!order) return <div className="p-8 text-center text-gray-400">Loading your order…</div>;

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
                            <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium ${i <= currentIndex ? 'bg-brand text-white' : 'bg-gray-100 text-gray-400'}`}>
                                {i < currentIndex ? '✓' : i + 1}
                            </div>
                            <p className={`mt-1 text-center text-[11px] ${i <= currentIndex ? 'text-gray-800' : 'text-gray-400'}`}>{STATUS_LABELS[step]}</p>
                        </div>
                    ))}
                </div>
            )}

            {estimatedWaitData?.avgMinutes != null && ['RECEIVED', 'VIEWED', 'PREPARING'].includes(order.status) && (
                <p className="mt-3 text-center text-sm text-gray-500">Typical wait right now: ~{Math.round(estimatedWaitData.avgMinutes)} min</p>
            )}

            <div className="mt-8 rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
                {order.items.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-3">
                        <div>
                            <p className="text-sm font-medium">{item.quantity}× {item.menuItem.name}</p>
                            {item.note && <p className="text-xs text-gray-500">{item.note}</p>}
                        </div>
                        <p className="text-sm text-gray-600">{formatCents(item.lineTotalCents, currency)}</p>
                    </div>
                ))}
                <div className="flex items-center justify-between p-3 font-semibold">
                    <span>Total</span>
                    <span>{formatCents(order.totalCents, currency)}</span>
                </div>
            </div>

            {activeRequests.some((r: any) => r.type === 'REQUEST_BILL_CASH') && (
                <div className="mt-4 rounded-lg bg-blue-50 p-3 text-center text-sm text-blue-700">
                    Someone at this table already requested the bill
                    {activeRequests.find((r: any) => r.type === 'REQUEST_BILL_CASH')?.guestCount &&
                        ` — splitting ${activeRequests.find((r: any) => r.type === 'REQUEST_BILL_CASH').guestCount} ways`}
                    . Tap below to adjust.
                </div>
            )}

            <div className="mt-6 grid grid-cols-2 gap-3">
                <button onClick={() => sendTableRequest('CALL_WAITER')} className="flex min-h-[48px] items-center justify-center rounded-full border border-gray-200 text-sm font-medium">
                    🙋 Call waiter
                </button>
                <button onClick={() => setShowGuestCount(true)} className="flex min-h-[48px] items-center justify-center rounded-full border border-gray-200 text-sm font-medium">
                    💵 Pay with cash
                </button>
            </div>

            {showGuestCount && (
                <div className="mt-3 rounded-lg border border-gray-200 p-3">
                    <label className="text-sm font-medium">Splitting the bill? How many guests?</label>
                    <div className="mt-2 flex items-center gap-3">
                        <input type="number" min={1} className="w-20 rounded-md border border-gray-200 px-2 py-1.5 text-sm" value={guestCount} onChange={(e) => setGuestCount(Number(e.target.value))} />
                    </div>
                    <div className="mt-3 flex gap-2">
                        {[0, 10, 15, 20].map((p) => (
                            <button key={p} onClick={() => setTipPercent(p)} className={`rounded-full px-3 py-1.5 text-sm ${tipPercent === p ? 'bg-brand text-white' : 'bg-gray-100'}`}>
                                {p === 0 ? 'No tip' : `${p}%`}
                            </button>
                        ))}
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                        <button onClick={() => sendTableRequest('REQUEST_BILL_CASH', guestCount, tipPercent)} className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white">
                            Request bill
                        </button>
                        <button onClick={() => sendTableRequest('REQUEST_BILL_CASH')} className="text-sm text-gray-500 underline">
                            Just bring the bill
                        </button>
                    </div>
                </div>
            )}

            {requestResult && (
                <div role="status" aria-live="polite" className="mt-2 rounded-lg bg-green-50 p-3 text-center text-sm text-green-700">
                    {requestResult.type === 'CALL_WAITER' && 'A staff member is on their way.'}
                    {requestResult.type === 'REQUEST_BILL_CASH' && (
                        <>
                            Staff will bring your bill for cash payment.
                            {requestResult.perPersonCentsAtRequest && (
                                <> Split {requestResult.guestCount} ways: <strong>{formatCents(requestResult.perPersonCentsAtRequest, currency)}</strong> each.</>
                            )}
                        </>
                    )}
                </div>
            )}

            {order.status === 'SERVED' && !feedbackSent && (
                <div className="mt-6 rounded-xl border border-gray-200 p-4 text-center">
                    <p className="font-medium">How was everything?</p>
                    <div className="mt-2 flex justify-center gap-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                            <button key={n} onClick={() => setRating(n)} aria-label={`${n} star${n === 1 ? '' : 's'}`} className="flex h-11 w-11 items-center justify-center text-2xl">
                                {n <= rating ? '★' : '☆'}
                            </button>
                        ))}
                    </div>
                    {rating > 0 && (
                        <div className="mt-2">
                            <textarea className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" rows={2} placeholder="Anything you'd like to add? (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
                            <button onClick={submitFeedback} disabled={feedbackMutation.isPending} className="mt-2 rounded-full bg-brand px-6 py-2 text-sm font-medium text-white disabled:opacity-50">
                                {feedbackMutation.isPending ? 'Submitting…' : 'Submit'}
                            </button>
                        </div>
                    )}
                </div>
            )}
            {feedbackSent && <p className="mt-6 text-center text-sm text-gray-500">Thanks for the feedback! 🙏</p>}

            <Link href={`/r/${venueSlug}/t/${token}`} className="mt-6 flex min-h-[44px] w-full items-center justify-center rounded-full border border-gray-200 font-medium">
                Add more items
            </Link>
        </div>
    );
}
'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { HandMetal, Banknote, Star, CheckCircle2, Info } from 'lucide-react';
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
    params: Promise<{ venueSlug: string; token: string; orderId: string }>;
}) {
    const { venueSlug, token, orderId } = use(params);
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

    if (error && !order) return <div className="p-8 text-center text-muted">{(error as Error).message}</div>;
    if (!order) return <div className="p-8 text-center text-muted-soft">Loading your order…</div>;

    const currentIndex = STATUS_STEPS.indexOf(order.status as any);
    const activeBillRequest = activeRequests.find((r: any) => r.type === 'REQUEST_BILL_CASH');

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
                            className="h-full transition-all"
                            style={{
                                width: currentIndex <= 0 ? '0%' : `${(currentIndex / (STATUS_STEPS.length - 1)) * 100}%`,
                                backgroundColor: 'var(--brand-color, #EA580C)',
                            }}
                        />
                    </div>

                    {STATUS_STEPS.map((step, i) => (
                        <div key={step} className="flex flex-1 flex-col items-center">
                            <div
                                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium ${
                                    i <= currentIndex ? 'text-white' : 'bg-surface-card text-muted-soft dark:bg-surface-dark-elevated'
                                }`}
                                style={i <= currentIndex ? { backgroundColor: 'var(--brand-color, #EA580C)' } : undefined}
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

            {estimatedWaitData?.avgMinutes != null && ['RECEIVED', 'VIEWED', 'PREPARING'].includes(order.status) && (
                <p className="mt-3 text-center text-sm text-muted">Typical wait right now: ~{Math.round(estimatedWaitData.avgMinutes)} min</p>
            )}

            <div className="mt-8 divide-y divide-hairline-soft rounded-xl border border-hairline bg-canvas dark:divide-gray-800 dark:border-gray-800 dark:bg-surface-dark-elevated">
                {order.items.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-3">
                        <div>
                            <p className="text-sm font-medium text-ink dark:text-white">{item.quantity}× {item.menuItem.name}</p>
                            {item.note && <p className="text-xs text-muted">{item.note}</p>}
                        </div>
                        <p className="text-sm text-muted">{formatCents(item.lineTotalCents, currency)}</p>
                    </div>
                ))}
                <div className="flex items-center justify-between p-3 font-semibold text-ink dark:text-white">
                    <span>Total</span>
                    <span>{formatCents(order.totalCents, currency)}</span>
                </div>
            </div>

            {activeBillRequest && (
                <div className="mt-4 flex items-start gap-2 rounded-lg bg-surface-card p-3 text-sm text-ink dark:bg-surface-dark-elevated dark:text-white">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
                    <span>
                        Someone at this table already requested the bill
                        {activeBillRequest.guestCount && ` — splitting ${activeBillRequest.guestCount} ways`}
                        . Tap below to adjust.
                    </span>
                </div>
            )}

            <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                    onClick={() => sendTableRequest('CALL_WAITER')}
                    className="flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-hairline bg-canvas text-sm font-medium text-ink transition-colors hover:bg-surface-card dark:border-gray-800 dark:bg-surface-dark-elevated dark:text-white dark:hover:bg-gray-800"
                >
                    <HandMetal className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                    Call waiter
                </button>
                <button
                    onClick={() => setShowGuestCount(true)}
                    className="flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-hairline bg-canvas text-sm font-medium text-ink transition-colors hover:bg-surface-card dark:border-gray-800 dark:bg-surface-dark-elevated dark:text-white dark:hover:bg-gray-800"
                >
                    <Banknote className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                    Pay with cash
                </button>
            </div>

            {showGuestCount && (
                <div className="mt-3 rounded-lg border border-hairline bg-canvas p-3 dark:border-gray-800 dark:bg-surface-dark-elevated">
                    <label className="text-sm font-medium text-ink dark:text-white">Splitting the bill? How many guests?</label>
                    <div className="mt-2 flex items-center gap-3">
                        <input
                            type="number"
                            min={1}
                            className="input w-20 py-1.5 text-sm"
                            value={guestCount}
                            onChange={(e) => setGuestCount(Number(e.target.value))}
                        />
                    </div>

                    <p className="mt-3 text-sm font-medium text-ink dark:text-white">Add a tip?</p>
                    <div className="mt-2 flex gap-2">
                        {[0, 10, 15, 20].map((p) => {
                            const active = tipPercent === p;
                            return (
                                <button
                                    key={p}
                                    onClick={() => setTipPercent(p)}
                                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                                        active ? 'text-white' : 'bg-surface-card text-ink dark:bg-surface-dark-elevated dark:text-white'
                                    }`}
                                    style={active ? { backgroundColor: 'var(--brand-color, #EA580C)' } : undefined}
                                >
                                    {p === 0 ? 'No tip' : `${p}%`}
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                        <button
                            onClick={() => sendTableRequest('REQUEST_BILL_CASH', guestCount, tipPercent)}
                            className="rounded-md px-4 py-2 text-sm font-medium text-white"
                            style={{ backgroundColor: 'var(--brand-color, #EA580C)' }}
                        >
                            Request bill
                        </button>
                        <button
                            onClick={() => sendTableRequest('REQUEST_BILL_CASH')}
                            className="text-sm text-muted underline"
                        >
                            Just bring the bill
                        </button>
                    </div>
                </div>
            )}

            {requestResult && (
                <div role="status" aria-live="polite" className="mt-2 rounded-lg bg-success/10 p-3 text-center text-sm text-success">
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
                <div className="mt-6 rounded-xl border border-hairline bg-canvas p-4 text-center dark:border-gray-800 dark:bg-surface-dark-elevated">
                    <p className="font-medium text-ink dark:text-white">How was everything?</p>
                    <div className="mt-2 flex justify-center gap-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                            <button
                                key={n}
                                onClick={() => setRating(n)}
                                aria-label={`${n} star${n === 1 ? '' : 's'}`}
                                className="flex h-11 w-11 items-center justify-center"
                            >
                                <Star
                                    className={`h-6 w-6 transition-colors ${n > rating ? 'text-muted-soft' : ''}`}
                                    style={n <= rating ? { color: 'var(--brand-color, #EA580C)', fill: 'var(--brand-color, #EA580C)' } : undefined}
                                />
                            </button>
                        ))}
                    </div>
                    {rating > 0 && (
                        <div className="mt-2">
                            <textarea
                                className="input"
                                rows={2}
                                placeholder="Anything you'd like to add? (optional)"
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                            />
                            <button
                                onClick={submitFeedback}
                                disabled={feedbackMutation.isPending}
                                className="mt-2 rounded-full px-6 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
                                style={{ backgroundColor: 'var(--brand-color, #EA580C)' }}
                            >
                                {feedbackMutation.isPending ? 'Submitting…' : 'Submit'}
                            </button>
                        </div>
                    )}
                </div>
            )}
            {feedbackSent && (
                <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-sm text-muted">
                    <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />
                    Thanks for the feedback!
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
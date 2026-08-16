'use client';

import {useMutation, useQuery} from '@tanstack/react-query';
import {queryKeys} from '@/lib/query-keys';
import {getSessionToken} from '@/lib/session';

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

export function usePlaceOrder(tableToken: string) {
    return useMutation({
        mutationFn: async (data: { customerName?: string; customerPhone?: string; note?: string;customerLatitude?: number;customerLongitude?: number }) => {
            const res = await fetch(`${API_URL}/public/orders`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({tableToken, sessionToken: getSessionToken(tableToken), ...data}),
            });
            const body = await res.json();
            if (!res.ok) {
                const err = new Error(body.message ?? 'Could not place order.') as Error & {
                    unavailableMenuItemIds?: string[]
                };
                err.unavailableMenuItemIds = body.unavailableMenuItemIds;
                throw err;
            }
            return body;
        },
    });
}

export function useOrderTracking(orderId: string, tableToken: string) {
    return useQuery({
        queryKey: queryKeys.publicOrder(orderId),
        queryFn: async () => {
            const res = await fetch(`${API_URL}/public/orders/${orderId}?table=${tableToken}`);
            if (!res.ok) throw new Error('Order not found.');
            return res.json();
        },
        // Stops polling once the order reaches a terminal state — same
        // behavior the old manual clearInterval had, expressed as React
        // Query's own refetchInterval instead.
        refetchInterval: (query) => {
            const status = query.state.data?.status;
            return status && ['SERVED', 'CANCELLED'].includes(status) ? false : 4000;
        },
    });
}

export function useSubmitFeedback(orderId: string) {
    return useMutation({
        mutationFn: async ({tableToken, rating, comment}: { tableToken: string; rating: number; comment?: string }) => {
            const res = await fetch(`${API_URL}/public/orders/${orderId}/feedback`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({tableToken, rating, comment}),
            });
            if (!res.ok) throw new Error((await res.json()).message ?? 'Could not submit feedback.');
            return res.json();
        },
    });
}

export function useEstimatedWait(venueSlug: string) {
    return useQuery({
        queryKey: queryKeys.estimatedWait(venueSlug),
        queryFn: async () => {
            const res = await fetch(`${API_URL}/public/venues/${venueSlug}/estimated-wait`);
            return res.json();
        },
        staleTime: 5 * 60_000, // historical average — doesn't need to be fresh-fresh
    });
}
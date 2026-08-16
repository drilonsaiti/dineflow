'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { getSessionToken } from '@/lib/session';

export function usePlaceOrder(tableToken: string) {
    return useMutation({
        mutationFn: (data: { customerName?: string; customerPhone?: string; note?: string; customerLatitude?: number;customerLongitude?: number }) =>
            api.post<any>('/public/orders', { tableToken, sessionToken: getSessionToken(tableToken), ...data }),
        // ApiError.body carries unavailableMenuItemIds when the backend rejects
        // stale cart items — callers read err.body.unavailableMenuItemIds
        // (see cart page's catch block below), not a bespoke field on Error.
    });
}

export function useOrderTracking(orderId: string, tableToken: string) {
    return useQuery({
        queryKey: queryKeys.publicOrder(orderId),
        queryFn: () => api.get<any>(`/public/orders/${orderId}?table=${tableToken}`),
        refetchInterval: (query) => {
            const status = query.state.data?.status;
            return status && ['SERVED', 'CANCELLED'].includes(status) ? false : 4000;
        },
    });
}

export function useSubmitFeedback(orderId: string) {
    return useMutation({
        mutationFn: ({ tableToken, rating, comment }: { tableToken: string; rating: number; comment?: string }) =>
            api.post(`/public/orders/${orderId}/feedback`, { tableToken, rating, comment }),
    });
}

export function useEstimatedWait(venueSlug: string) {
    return useQuery({
        queryKey: queryKeys.estimatedWait(venueSlug),
        queryFn: () => api.get<{ avgMinutes: number | null }>(`/public/venues/${venueSlug}/estimated-wait`),
        staleTime: 5 * 60_000,
    });
}

export { ApiError };
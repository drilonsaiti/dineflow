'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { StaffOrder } from '@/app/admin/[venueId]/dashboard/page';

export function useOrders(venueId: string, station?: string) {
    return useQuery({
        queryKey: queryKeys.orders(venueId, station),
        queryFn: () => api.get<StaffOrder[]>(`/venues/${venueId}/orders${station ? `?station=${station}` : ''}`),
    });
}

export function useAdvanceOrderStatus(venueId: string, station?: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ orderId, status }: { orderId: string; status: string }) =>
            api.patch<StaffOrder>(`/venues/${venueId}/orders/${orderId}/status`, { status }),

        // Optimistic update: same UX as before (card moves instantly), but
        // now expressed as React Query's built-in optimistic-update pattern
        // instead of a hand-rolled setOrders() + manual rollback.
        onMutate: async ({ orderId, status }) => {
            await queryClient.cancelQueries({ queryKey: queryKeys.orders(venueId, station) });
            const previous = queryClient.getQueryData<StaffOrder[]>(queryKeys.orders(venueId, station));
            queryClient.setQueryData<StaffOrder[]>(queryKeys.orders(venueId, station), (old) =>
                old?.map((o) => (o.id === orderId ? { ...o, status: status as StaffOrder['status'] } : o)),
            );
            return { previous };
        },
        onError: (_err, _vars, context) => {
            // Server rejected the transition (e.g. claim-gated serve, invalid
            // jump) — snap back to the last known-good server state.
            if (context?.previous) queryClient.setQueryData(queryKeys.orders(venueId, station), context.previous);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.orders(venueId, station) });
        },
    });
}

/** Merges a socket-pushed order event straight into the cache — no refetch
 * round-trip needed, and no manual array-splicing in component state. */
export function useOrderSocketSync(venueId: string, station?: string) {
    const queryClient = useQueryClient();

    return {
        onOrderCreated: (order: StaffOrder) => {
            queryClient.setQueryData<StaffOrder[]>(queryKeys.orders(venueId, station), (old) =>
                old ? [...old, order] : [order],
            );
        },
        onOrderUpdated: (order: StaffOrder) => {
            queryClient.setQueryData<StaffOrder[]>(queryKeys.orders(venueId, station), (old) =>
                old?.map((o) => (o.id === order.id ? order : o)),
            );
        },
    };
}

export function useOrdersForTable(venueId: string, tableId: string | null) {
    return useQuery({
        queryKey: tableId ? queryKeys.ordersForTable(venueId, tableId) : ['orders-for-table', 'none'],
        queryFn: () => api.get<StaffOrder[]>(`/venues/${venueId}/tables/${tableId}/orders`),
        enabled: !!tableId, // only fetches once a table is actually selected
    });
}

export function useOrder(venueId: string, orderId: string) {
    return useQuery({
        queryKey: queryKeys.order(venueId, orderId),
        queryFn: () => api.get<StaffOrder>(`/venues/${venueId}/orders/${orderId}`),
    });
}
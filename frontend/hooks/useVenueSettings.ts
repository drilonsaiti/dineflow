'use client';

import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {api} from '@/lib/api';
import {queryKeys} from '@/lib/query-keys';

export function useVenueSettings(venueId: string) {
    return useQuery({
        queryKey: queryKeys.venue(venueId),
        queryFn: () => api.get<any>(`/venues/${venueId}`), // full record — this page is owner/manager-only, matches the restricted backend route
    });
}

export function useUpdateVenueSettings(venueId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => api.post(`/venues/${venueId}/settings`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: queryKeys.venue(venueId)});
            queryClient.invalidateQueries({queryKey: queryKeys.venueBasics(venueId)}); // basics reflects the same underlying row — keep both in sync
        },
    });
}

export function useCreateCheckoutSession(venueId: string) {
    return useMutation({
        mutationFn: (plan: 'PRO' | 'BUSINESS') => api.post<{
            url: string
        }>(`/venues/${venueId}/billing/checkout-session`, {plan}),
    });
}

export function useCreatePortalSession(venueId: string) {
    return useMutation({
        mutationFn: () => api.post<{ url: string }>(`/venues/${venueId}/billing/portal-session`, {}),
    });
}
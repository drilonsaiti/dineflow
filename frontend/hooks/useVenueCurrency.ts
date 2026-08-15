'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

/** Currency rarely changes — cached long, shared across every page that
 * calls formatCents(). Defaults to 'USD' only while the query is still
 * loading, never as a silent permanent fallback. */
export function useVenueCurrency(venueId: string): string {
    const { data } = useQuery({
        queryKey: queryKeys.venue(venueId),
        queryFn: () => api.get<{ currency: string }>(`/venues/${venueId}/basics`),        staleTime: 5 * 60_000,
    });
    return data?.currency ?? 'USD';
}
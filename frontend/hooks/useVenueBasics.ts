'use client';

import {useQuery} from '@tanstack/react-query';
import {api} from '@/lib/api';
import {queryKeys} from '@/lib/query-keys';

interface VenueBasics {
    id: string;
    name: string;
    slug: string;
    type: string | null;
    logoUrl: string | null;
    brandColor: string | null;
    currency: string;
    timezone: string;
    plan: string;
    autoPrintTickets: boolean;
    supportedLanguages: string[];
}

/** Single source of truth for the /basics endpoint — useVenueCurrency and
 * useAutoPrintTickets both derive from this same query key, so a page that
 * calls both (like the dashboard) only fires one network request, not two. */
export function useVenueBasics(venueId: string) {
    return useQuery({
        queryKey: queryKeys.venueBasics(venueId),
        queryFn: () => api.get<VenueBasics>(`/venues/${venueId}/basics`),
        staleTime: 5 * 60_000,
    });
}

export function useAutoPrintTickets(venueId: string): boolean {
    const {data} = useVenueBasics(venueId);
    return data?.autoPrintTickets ?? false;
}
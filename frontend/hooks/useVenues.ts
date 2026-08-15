'use client';

import {useQuery} from '@tanstack/react-query';
import {api} from '@/lib/api';
import {queryKeys} from '@/lib/query-keys';

interface VenueSummary {
    id: string;
    name: string;
}

export function useVenuesMine() {
    return useQuery({
        queryKey: queryKeys.venuesMine(),
        queryFn: () => api.get<VenueSummary[]>('/venues/mine'),
    });
}

export function useMyMembership(venueId: string) {
    return useQuery({
        queryKey: queryKeys.myMembership(venueId),
        queryFn: () => api.get<{ role: string }>(`/venues/${venueId}/my-membership`),
    });
}
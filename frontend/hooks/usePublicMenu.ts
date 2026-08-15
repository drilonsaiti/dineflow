'use client';

import {useQuery} from '@tanstack/react-query';
import {queryKeys} from '@/lib/query-keys';

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

export function usePublicMenu(venueSlug: string) {
    return useQuery({
        queryKey: queryKeys.publicMenu(venueSlug),
        queryFn: async () => {
            const res = await fetch(`${API_URL}/public/menu/${encodeURIComponent(venueSlug)}`);
            if (!res.ok) throw new Error('Failed to load menu');
            return res.json();
        },
        staleTime: 15_000, // matches the backend's own 15s cache TTL on this endpoint
    });
}
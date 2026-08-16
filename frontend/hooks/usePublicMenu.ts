'use client';

import {useQuery} from '@tanstack/react-query';
import {queryKeys} from '@/lib/query-keys';
import {api} from "@/lib/api";

export function usePublicMenu(venueSlug: string, lang?: string) {
    return useQuery({
        queryKey: [...queryKeys.publicMenu(venueSlug), lang ?? 'default'],
        queryFn: () => api.get<any>(`/public/menu/${encodeURIComponent(venueSlug)}${lang ? `?lang=${lang}` : ''}`),
        staleTime: 15_000, // matches the backend's own 15s cache TTL on this endpoint
    });
}
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import {Area, TableRow} from "@/types/table";

export function useTables(venueId: string) {
    return useQuery({
        queryKey: queryKeys.tables(venueId),
        queryFn: () => api.get<TableRow[]>(`/venues/${venueId}/tables`),
    });
}

export function useAreas(venueId: string) {
    return useQuery({
        queryKey: queryKeys.areas(venueId),
        queryFn: () => api.get<Area[]>(`/venues/${venueId}/areas`),
    });
}

function useInvalidateTables(venueId: string) {
    const queryClient = useQueryClient();
    return () => queryClient.invalidateQueries({ queryKey: queryKeys.tables(venueId) });
}
function useInvalidateAreas(venueId: string) {
    const queryClient = useQueryClient();
    return () => queryClient.invalidateQueries({ queryKey: queryKeys.areas(venueId) });
}

export function useCreateArea(venueId: string) {
    const invalidate = useInvalidateAreas(venueId);
    return useMutation({
        mutationFn: (name: string) => api.post(`/venues/${venueId}/areas`, { name }),
        onSuccess: invalidate,
    });
}

export function useCreateTable(venueId: string) {
    const invalidate = useInvalidateTables(venueId);
    return useMutation({
        mutationFn: (data: { label: string; areaId?: string }) => api.post(`/venues/${venueId}/tables`, data),
        onSuccess: invalidate,
    });
}

export function useDeactivateTable(venueId: string) {
    const invalidate = useInvalidateTables(venueId);
    return useMutation({
        mutationFn: (tableId: string) => api.patch(`/venues/${venueId}/tables/${tableId}/deactivate`, {}),
        onSuccess: invalidate,
    });
}

export function useReactivateTable(venueId: string) {
    const invalidate = useInvalidateTables(venueId);
    return useMutation({
        mutationFn: (tableId: string) => api.patch(`/venues/${venueId}/tables/${tableId}/reactivate`, {}),
        onSuccess: invalidate,
    });
}

export function useRegenerateTableToken(venueId: string) {
    const invalidate = useInvalidateTables(venueId);
    return useMutation({
        mutationFn: (tableId: string) => api.post(`/venues/${venueId}/tables/${tableId}/regenerate-token`, {}),
        onSuccess: invalidate,
    });
}
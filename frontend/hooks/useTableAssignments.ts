'use client';

import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {api} from '@/lib/api';
import {queryKeys} from '@/lib/query-keys';

interface Assignment {
    tableId: string;
    userId: string;
    table: { id: string; label: string };
    user: { id: string; email: string; fullName: string | null };
}

export function useTableAssignments(venueId: string) {
    return useQuery({
        queryKey: queryKeys.tableAssignments(venueId),
        queryFn: () => api.get<Assignment[]>(`/venues/${venueId}/table-assignments`),
    });
}

export function useClaimTable(venueId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (tableId: string) => api.post(`/venues/${venueId}/table-assignments`, {tableId}),
        onSuccess: () => queryClient.invalidateQueries({queryKey: queryKeys.tableAssignments(venueId)}),
    });
}

export function useReleaseTable(venueId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (tableId: string) => api.delete(`/venues/${venueId}/table-assignments/${tableId}`),
        onSuccess: () => queryClient.invalidateQueries({queryKey: queryKeys.tableAssignments(venueId)}),
    });
}
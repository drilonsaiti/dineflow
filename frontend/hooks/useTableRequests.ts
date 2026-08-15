'use client';

import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {api} from '@/lib/api';
import {queryKeys} from '@/lib/query-keys';

interface TableRequest {
    id: string;
    type: 'CALL_WAITER' | 'REQUEST_BILL_CASH';
    status: 'PENDING' | 'ACKNOWLEDGED' | 'RESOLVED';
    createdAt: string;
    guestCount: number | null;
    perPersonCentsAtRequest: number | null;
    table: { label: string };
}

export function useTableRequests(venueId: string) {
    return useQuery({
        queryKey: queryKeys.tableRequests(venueId),
        queryFn: () => api.get<TableRequest[]>(`/venues/${venueId}/table-requests`),
    });
}

export function useAcknowledgeTableRequest(venueId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.patch(`/venues/${venueId}/table-requests/${id}/acknowledge`, {}),
        onSuccess: () => queryClient.invalidateQueries({queryKey: queryKeys.tableRequests(venueId)}),
    });
}

export function useResolveTableRequest(venueId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.patch(`/venues/${venueId}/table-requests/${id}/resolve`, {}),
        onSuccess: () => queryClient.invalidateQueries({queryKey: queryKeys.tableRequests(venueId)}),
    });
}

/** Socket-pushed events merged straight into cache — no extra round-trip. */
export function useTableRequestSocketSync(venueId: string) {
    const queryClient = useQueryClient();
    return {
        onCreated: (request: TableRequest) => {
            queryClient.setQueryData<TableRequest[]>(queryKeys.tableRequests(venueId), (old) =>
                old ? [...old, request] : [request],
            );
        },
        onUpdated: (request: TableRequest) => {
            queryClient.setQueryData<TableRequest[]>(queryKeys.tableRequests(venueId), (old) =>
                request.status === 'RESOLVED'
                    ? old?.filter((r) => r.id !== request.id)
                    : old?.map((r) => (r.id === request.id ? request : r)),
            );
        },
    };
}
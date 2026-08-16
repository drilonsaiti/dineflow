'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { getSessionToken } from '@/lib/session';

export function useActiveTableRequests(tableToken: string) {
    return useQuery({
        queryKey: queryKeys.activeTableRequests(tableToken),
        queryFn: () => api.get<any[]>(`/public/table-requests/${tableToken}/active`),
        refetchInterval: 5000,
    });
}

export function useCreateTableRequest(tableToken: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { type: 'CALL_WAITER' | 'REQUEST_BILL_CASH'; guestCount?: number; tipPercent?: number }) =>
            api.post<any>('/public/table-requests', { tableToken, sessionToken: getSessionToken(tableToken), ...data }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.activeTableRequests(tableToken) }),
    });
}

export function useTableTab(tableToken: string) {
    return useQuery({
        queryKey: queryKeys.tableTab(tableToken),
        queryFn: () => {
            const session = getSessionToken(tableToken);
            return api.get<any>(`/public/tables/${tableToken}/tab?session=${session}`);
        },
        refetchInterval: 5000,
    });
}

export function useItemizedBill(tableToken: string) {
    return useQuery({
        queryKey: ['itemized-bill', tableToken],
        queryFn: () => {
            const session = getSessionToken(tableToken);
            return api.get<any>(`/public/tables/${tableToken}/itemized-bill?session=${session}`);
        },
    });
}
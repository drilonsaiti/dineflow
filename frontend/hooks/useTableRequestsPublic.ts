'use client';

import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {queryKeys} from '@/lib/query-keys';
import {getSessionToken} from '@/lib/session';

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

export function useActiveTableRequests(tableToken: string) {
    return useQuery({
        queryKey: queryKeys.activeTableRequests(tableToken),
        queryFn: async () => {
            const res = await fetch(`${API_URL}/public/table-requests/${tableToken}/active`);
            if (!res.ok) return [];
            return res.json();
        },
        refetchInterval: 5000,
    });
}

export function useCreateTableRequest(tableToken: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: {
            type: 'CALL_WAITER' | 'REQUEST_BILL_CASH';
            guestCount?: number;
            tipPercent?: number
        }) => {
            const res = await fetch(`${API_URL}/public/table-requests`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({tableToken, sessionToken: getSessionToken(tableToken), ...data}),
            });
            return res.json();
        },
        onSuccess: () => queryClient.invalidateQueries({queryKey: queryKeys.activeTableRequests(tableToken)}),
    });
}

export function useTableTab(tableToken: string) {
    return useQuery({
        queryKey: queryKeys.tableTab(tableToken),
        queryFn: async () => {
            const session = getSessionToken(tableToken);
            const res = await fetch(`${API_URL}/public/tables/${tableToken}/tab?session=${session}`);
            if (!res.ok) throw new Error((await res.json()).message ?? 'Could not load the tab.');
            return res.json();
        },
        refetchInterval: 5000,
    });
}
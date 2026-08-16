'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { getSessionToken } from '@/lib/session';

export interface SharedCartLine {
    id: string;
    menuItemId: string;
    name: string;
    photoUrl: string | null;
    isAvailable: boolean;
    quantity: number;
    note: string | null;
    addedByLabel: string | null;
    modifiers: { modifierOptionId: string; name: string; priceDeltaCents: number }[];
    unitPriceCents: number;
    lineTotalCents: number;
}

export function useTableCart(tableToken: string) {
    return useQuery({
        queryKey: queryKeys.tableCart(tableToken),
        queryFn: () => api.get<SharedCartLine[]>(`/public/table-cart/${tableToken}`),
        refetchInterval: 3000,
    });
}

interface AddLineInput {
    menuItemId: string;
    quantity: number;
    note?: string;
    modifierOptionIds: string[];
    addedByLabel?: string;
}

export function useAddCartItem(tableToken: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (line: AddLineInput) =>
            api.post('/public/table-cart', { tableToken, sessionToken: getSessionToken(tableToken), ...line }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.tableCart(tableToken) }),
    });
}

export function useUpdateCartItem(tableToken: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ itemId, quantity, note }: { itemId: string; quantity?: number; note?: string }) => {
            const session = getSessionToken(tableToken);
            return api.patch(`/public/table-cart/${tableToken}/items/${itemId}?session=${session}`, { quantity, note });
        },
        onMutate: async ({ itemId, quantity }) => {
            await queryClient.cancelQueries({ queryKey: queryKeys.tableCart(tableToken) });
            const previous = queryClient.getQueryData<SharedCartLine[]>(queryKeys.tableCart(tableToken));
            if (quantity != null) {
                queryClient.setQueryData<SharedCartLine[]>(queryKeys.tableCart(tableToken), (old) =>
                    quantity <= 0
                        ? old?.filter((l) => l.id !== itemId)
                        : old?.map((l) => (l.id === itemId ? { ...l, quantity, lineTotalCents: l.unitPriceCents * quantity } : l)),
                );
            }
            return { previous };
        },
        onError: (_err, _vars, context) => {
            if (context?.previous) queryClient.setQueryData(queryKeys.tableCart(tableToken), context.previous);
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.tableCart(tableToken) }),
    });
}

export function useRemoveCartItem(tableToken: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (itemId: string) => {
            const session = getSessionToken(tableToken);
            return api.delete(`/public/table-cart/${tableToken}/items/${itemId}?session=${session}`);
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.tableCart(tableToken) }),
    });
}

export function useBulkRemoveCartItems(tableToken: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (menuItemIds: string[]) => {
            const session = getSessionToken(tableToken);
            return api.post(`/public/table-cart/${tableToken}/bulk-remove?session=${session}`, { menuItemIds });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.tableCart(tableToken) }),
    });
}
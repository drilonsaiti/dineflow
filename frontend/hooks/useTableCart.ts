'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { getSessionToken } from '@/lib/session';

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

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
        queryFn: async () => {
            const res = await fetch(`${API_URL}/public/table-cart/${tableToken}`);
            if (!res.ok) throw new Error('Could not load the shared cart.');
            return res.json() as Promise<SharedCartLine[]>;
        },
        // Other devices at the table can add/remove any time — customer
        // devices don't hold a persistent socket the way the staff dashboard
        // does, so this polls instead.
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
        mutationFn: async (line: AddLineInput) => {
            const res = await fetch(`${API_URL}/public/table-cart`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tableToken, sessionToken: getSessionToken(tableToken), ...line }),
            });
            if (!res.ok) throw new Error((await res.json()).message ?? 'Could not add item.');
            return res.json();
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.tableCart(tableToken) }),
    });
}

export function useUpdateCartItem(tableToken: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ itemId, quantity, note }: { itemId: string; quantity?: number; note?: string }) => {
            const session = getSessionToken(tableToken);
            const res = await fetch(`${API_URL}/public/table-cart/${tableToken}/items/${itemId}?session=${session}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quantity, note }),
            });
            if (!res.ok) throw new Error((await res.json()).message ?? 'Could not update item.');
            return res.json();
        },
        // Optimistic — quantity taps need to feel instant, same UX as before.
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
        mutationFn: async (itemId: string) => {
            const session = getSessionToken(tableToken);
            const res = await fetch(`${API_URL}/public/table-cart/${tableToken}/items/${itemId}?session=${session}`, { method: 'DELETE' });
            if (!res.ok) throw new Error((await res.json()).message ?? 'Could not remove item.');
            return res.json();
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.tableCart(tableToken) }),
    });
}

export function useBulkRemoveCartItems(tableToken: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (menuItemIds: string[]) => {
            const session = getSessionToken(tableToken);
            await fetch(`${API_URL}/public/table-cart/${tableToken}/bulk-remove?session=${session}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ menuItemIds }),
            });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.tableCart(tableToken) }),
    });
}
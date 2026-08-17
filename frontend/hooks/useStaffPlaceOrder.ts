'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

interface StaffOrderItemInput {
    menuItemId: string;
    quantity: number;
    note?: string;
    modifiers: { modifierOptionId: string }[];
}

export function useStaffPlaceOrder(venueId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { tableId: string; items: StaffOrderItemInput[]; customerName?: string; note?: string }) =>
            api.post(`/venues/${venueId}/orders`, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.orders(venueId) }),
    });
}
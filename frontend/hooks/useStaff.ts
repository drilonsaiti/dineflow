'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

interface Membership {
    role: string;
    user: { id: string; email: string; fullName: string | null };
}

export function useStaff(venueId: string) {
    return useQuery({
        queryKey: queryKeys.staff(venueId),
        queryFn: () => api.get<Membership[]>(`/venues/${venueId}/staff`),
    });
}

export function useInviteStaff(venueId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { email: string; role: string; pin: string }) =>
            api.post(`/venues/${venueId}/staff/invite`, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.staff(venueId) }),
    });
}

export function useRemoveStaff(venueId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (userId: string) => api.delete(`/venues/${venueId}/staff/${userId}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.staff(venueId) }),
    });
}
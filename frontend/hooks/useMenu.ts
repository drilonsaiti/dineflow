'use client';

import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {api} from '@/lib/api';
import {queryKeys} from '@/lib/query-keys';
import {MenuCategory} from "@/types/menu";

export function useMenuCategories(venueId: string) {
    return useQuery({
        queryKey: queryKeys.menuCategories(venueId),
        queryFn: () => api.get<MenuCategory[]>(`/venues/${venueId}/menu/categories`),
    });
}

export function useMenuTags(venueId: string) {
    return useQuery({
        queryKey: queryKeys.menuTags(venueId),
        queryFn: () => api.get<{ id: string; label: string; kind: string }[]>(`/venues/${venueId}/menu/tags`),
    });
}

function useInvalidateMenu(venueId: string) {
    const queryClient = useQueryClient();
    return () => queryClient.invalidateQueries({queryKey: queryKeys.menuCategories(venueId)});
}

function useInvalidateTags(venueId: string) {
    const queryClient = useQueryClient();
    return () => queryClient.invalidateQueries({queryKey: queryKeys.menuTags(venueId)});
}

export function useCreateCategory(venueId: string) {
    const invalidate = useInvalidateMenu(venueId);
    return useMutation({
        mutationFn: (data: { name: string; description?: string; station?: string }) =>
            api.post(`/venues/${venueId}/menu/categories`, data),
        onSuccess: invalidate,
    });
}

export function useDeleteCategory(venueId: string) {
    const invalidate = useInvalidateMenu(venueId);
    return useMutation({
        mutationFn: (categoryId: string) => api.delete(`/venues/${venueId}/menu/categories/${categoryId}`),
        onSuccess: invalidate,
    });
}

export function useToggleItemAvailability(venueId: string) {
    const invalidate = useInvalidateMenu(venueId);
    return useMutation({
        mutationFn: ({itemId, isAvailable}: { itemId: string; isAvailable: boolean }) =>
            api.patch(`/venues/${venueId}/menu/items/${itemId}/availability`, {isAvailable}),
        onSuccess: invalidate,
    });
}

export function useDeleteItem(venueId: string) {
    const invalidate = useInvalidateMenu(venueId);
    return useMutation({
        mutationFn: (itemId: string) => api.delete(`/venues/${venueId}/menu/items/${itemId}`),
        onSuccess: invalidate,
    });
}

/** Handles both create (no itemId) and update (itemId present) — one
 * mutation, one invalidation path, matching how the backend already
 * branches on the same distinction. */
export function useSaveItem(venueId: string) {
    const invalidate = useInvalidateMenu(venueId);
    return useMutation({
        mutationFn: ({itemId, payload}: { itemId?: string; payload: Record<string, unknown> }) =>
            itemId
                ? api.patch(`/venues/${venueId}/menu/items/${itemId}`, payload)
                : api.post(`/venues/${venueId}/menu/items`, payload),
        onSuccess: invalidate,
    });
}

export function useCreateTag(venueId: string) {
    const invalidate = useInvalidateTags(venueId);
    return useMutation({
        mutationFn: (data: { label: string; kind: string }) => api.post(`/venues/${venueId}/menu/tags`, data),
        onSuccess: invalidate,
    });
}

export function useDeleteTag(venueId: string) {
    const invalidate = useInvalidateTags(venueId);
    return useMutation({
        mutationFn: (tagId: string) => api.delete(`/venues/${venueId}/menu/tags/${tagId}`),
        onSuccess: invalidate,
    });
}
'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useCurrentUserId(): string | null {
    const { data } = useQuery({
        queryKey: ['current-user-id'],
        queryFn: async () => {
            const { data } = await supabase.auth.getUser();
            return data.user?.id ?? null;
        },
        staleTime: Infinity, // doesn't change mid-session
    });
    return data ?? null;
}
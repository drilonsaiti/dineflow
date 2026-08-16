'use client';

import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export function useStaffLogin() {
    return useMutation({
        mutationFn: async ({ email, pin }: { email: string; pin: string }) => {
            const body = await api.post<{ access_token: string; refresh_token: string }>('/auth/staff-login', { email, pin });
            // Persist into the Supabase client so getAccessToken() and every
            // downstream authenticated call works identically to a direct
            // Supabase sign-in — this endpoint just adds the lockout check.
            await supabase.auth.setSession({ access_token: body.access_token, refresh_token: body.refresh_token });
            return body;
        },
    });
}
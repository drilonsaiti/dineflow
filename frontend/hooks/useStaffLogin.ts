'use client';

import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

interface StaffLoginInput {
    email: string;
    pin: string;
}

export function useStaffLogin() {
    return useMutation({
        mutationFn: async ({ email, pin }: StaffLoginInput) => {
            const res = await fetch(`${API_URL}/auth/staff-login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, pin }),
            });
            const body = await res.json();
            if (!res.ok) throw new Error(body.message ?? 'Sign in failed');

            // Persist the session into the Supabase client so getAccessToken()
            // and every downstream authenticated call works exactly as if the
            // person had signed in via Supabase directly — this endpoint just
            // adds the lockout check in front of that same underlying session.
            await supabase.auth.setSession({
                access_token: body.access_token,
                refresh_token: body.refresh_token,
            });

            return body;
        },
    });
}
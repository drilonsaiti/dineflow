import { createClient } from '@supabase/supabase-js';

// Client-side Supabase instance — used ONLY for auth (sign up/in, session,
// magic link) and to obtain the JWT sent to the NestJS API. Never queries
// Postgres tables directly from the browser (section 11: NestJS is the
// single gatekeeper).
export const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export async function getAccessToken(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
}
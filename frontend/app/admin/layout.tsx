'use client';

import { ReactNode, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {AdminNav} from "@/components/AdminNav";

export default function AdminLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [checked, setChecked] = useState(false);
    const isLoginPage = pathname === '/admin/login';

    useEffect(() => {
        // Magic-link redirects land here with #access_token=... in the URL.
        // supabase-js's detectSessionInUrl (on by default) parses that hash and
        // persists the session the first time anything touches the client —
        // getSession() is enough to trigger it. We then strip the hash so a
        // raw access token doesn't sit visibly in the address bar/history.
        supabase.auth.getSession().then(({ data }) => {
            if (window.location.hash.includes('access_token')) {
                window.history.replaceState(null, '', window.location.pathname);
            }
            if (!data.session && !isLoginPage) {
                router.replace('/admin/login');
                return;
            }
            setChecked(true);
        });

        const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!session && !isLoginPage) router.replace('/admin/login');
        });
        return () => sub.subscription.unsubscribe();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]);

    if (isLoginPage) return <>{children}</>;
    if (!checked) {
        return <div className="flex min-h-screen items-center justify-center text-gray-400">Loading…</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            <AdminNav />
            {children}
        </div>
    );
}
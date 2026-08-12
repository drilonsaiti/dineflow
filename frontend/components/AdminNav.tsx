'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import { ThemeToggle } from '@/components/ThemeToggle';

interface VenueSummary {
    id: string;
    name: string;
    slug: string;
}

export function AdminNav() {
    const pathname = usePathname();
    const router = useRouter();
    const [venues, setVenues] = useState<VenueSummary[]>([]);

    const match = pathname?.match(/^\/admin\/([^/]+)/);
    const venueId = match && !['login', 'onboarding'].includes(match[1]) ? match[1] : null;

    useEffect(() => {
        api.get<VenueSummary[]>('/venues/mine').then(setVenues).catch(() => {});
    }, []);

    async function signOut() {
        await supabase.auth.signOut();
        router.replace('/admin/login');
    }

    const links = venueId
        ? [
            { href: `/admin/${venueId}/dashboard`, label: 'Orders' },
            { href: `/admin/${venueId}/menu`, label: 'Menu' },
            { href: `/admin/${venueId}/tables`, label: 'Tables' },
            { href: `/admin/${venueId}/analytics`, label: 'Analytics' },
            { href: `/admin/${venueId}/settings`, label: 'Settings' },
        ]
        : [];

    return (
        <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
                <div className="flex items-center gap-6">
                    <Link href="/admin" className="font-semibold">
                        QR Ordering
                    </Link>
                    {venues.length > 0 && (
                        <select
                            value={venueId ?? ''}
                            onChange={(e) => e.target.value && router.push(`/admin/${e.target.value}/dashboard`)}
                            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
                        >
                            <option value="" disabled>
                                Switch venue…
                            </option>
                            {venues.map((v) => (
                                <option key={v.id} value={v.id}>
                                    {v.name}
                                </option>
                            ))}
                        </select>
                    )}
                    <nav className="flex gap-4 text-sm">
                        {links.map((l) => (
                            <Link
                                key={l.href}
                                href={l.href}
                                className={pathname?.startsWith(l.href) ? 'font-semibold text-brand' : 'text-gray-500'}
                            >
                                {l.label}
                            </Link>
                        ))}
                    </nav>
                </div>
                <div className="flex items-center gap-3">
                    <ThemeToggle />
                    <button onClick={signOut} className="text-sm text-gray-500 hover:underline">
                        Sign out
                    </button>
                </div>
            </div>
        </header>
    );
}
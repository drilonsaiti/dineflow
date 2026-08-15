'use client';

import Link from 'next/link';
import {usePathname, useRouter} from 'next/navigation';
import {supabase} from '@/lib/supabase';
import {ThemeToggle} from '@/components/ThemeToggle';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/Select";
import {useVenuesMine} from "@/hooks/useVenues";

interface VenueSummary {
    id: string;
    name: string;
    slug: string;
}

export function AdminNav() {
    const pathname = usePathname();
    const router = useRouter();

    const match = pathname?.match(/^\/admin\/([^/]+)/);
    const venueId = match && !['login', 'onboarding'].includes(match[1]) ? match[1] : null;

    const {data: venues = []} = useVenuesMine();

    async function signOut() {
        await supabase.auth.signOut();
        router.replace('/admin/login');
    }

    const links = venueId
        ? [
            {href: `/admin/${venueId}/dashboard`, label: 'Orders'},
            {href: `/admin/${venueId}/menu`, label: 'Menu'},
            {href: `/admin/${venueId}/tables-live`, label: 'Tables'},
            {href: `/admin/${venueId}/tables`, label: 'Tables & QR'},
            {href: `/admin/${venueId}/analytics`, label: 'Analytics'},
            {href: `/admin/${venueId}/settings`, label: 'Settings'},
            {href: `/admin/${venueId}/staff`, label: 'Staff'},
            {href: `/admin/${venueId}/z-report`, label: 'Z-report'},
        ]
        : [];

    return (
        <header className="border-b border-hairline bg-canvas dark:border-gray-800 dark:bg-surface-dark">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
                <div className="flex items-center gap-6">
                    <Link href="/admin" className="font-display font-semibold text-ink dark:text-white">
                        DineFlow
                    </Link>
                    {venues.length > 0 && (
                        <Select
                            value={venueId ?? undefined}
                            onValueChange={(id) => router.push(`/admin/${id}/dashboard`)}
                        >
                            <SelectTrigger className="w-44">
                                <SelectValue placeholder="Switch venue…"/>
                            </SelectTrigger>
                            <SelectContent>
                                {venues.map((v) => (
                                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    <nav className="flex gap-4 text-sm font-medium">
                        {links.map((l) => (
                            <Link
                                key={l.href}
                                href={l.href}
                                className={
                                    pathname === l.href || pathname?.startsWith(`${l.href}/`)
                                        ? 'font-semibold text-ink dark:text-white'
                                        : 'text-muted hover:text-ink dark:hover:text-white'
                                }
                            >
                                {l.label}
                            </Link>
                        ))}
                    </nav>
                </div>
                <div className="flex items-center gap-3">
                    <ThemeToggle/>
                    <button onClick={signOut}
                            className="text-sm font-medium text-muted hover:text-ink dark:hover:text-white">
                        Sign out
                    </button>
                </div>
            </div>
        </header>
    );
}
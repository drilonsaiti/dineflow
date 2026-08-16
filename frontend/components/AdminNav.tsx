'use client';

import Link from 'next/link';
import {usePathname, useRouter} from 'next/navigation';
import {ChevronDown} from 'lucide-react';
import {supabase} from '@/lib/supabase';
import {ThemeToggle} from '@/components/ThemeToggle';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/Select";
import {DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem} from "@/components/ui/DropdownMenu";
import {useMyMembership, useVenuesMine} from "@/hooks/useVenues";

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
    const {data: membership} = useMyMembership(venueId ?? '');
    const isOwnerOrManager = membership ? ['OWNER', 'MANAGER'].includes(membership.role) : false;

    async function signOut() {
        await supabase.auth.signOut();
        router.replace('/admin/login');
    }

    // Primary: always visible, the screens used every shift. Secondary:
    // tucked into "More" — infrequent, owner/manager-only destinations that
    // would otherwise crowd a nav people often use one-handed on a tablet.
    const primaryLinks = venueId
        ? [
            {href: `/admin/${venueId}/dashboard`, label: 'Orders'},
            {href: `/admin/${venueId}/tables-live`, label: 'Tables'},
            ...(isOwnerOrManager ? [{href: `/admin/${venueId}/menu`, label: 'Menu'}] : []),
        ]
        : [];

    const secondaryLinks =
        venueId && isOwnerOrManager
            ? [
                {href: `/admin/${venueId}/tables`, label: 'Tables & QR'},
                {href: `/admin/${venueId}/analytics`, label: 'Analytics'},
                {href: `/admin/${venueId}/staff`, label: 'Staff'},
                {href: `/admin/${venueId}/z-report`, label: 'Z-report'},
                {href: `/admin/${venueId}/settings`, label: 'Settings'},
            ]
            : [];

    function isActive(href: string) {
        return pathname === href || pathname?.startsWith(`${href}/`);
    }

    const moreIsActive = secondaryLinks.some((l) => isActive(l.href));

    return (
        <header className="border-b border-hairline bg-canvas dark:border-gray-800 dark:bg-surface-dark">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
                <div className="flex min-w-0 items-center gap-6">
                    <Link href="/admin" className="shrink-0 font-display font-semibold text-ink dark:text-white">
                        DineFlow
                    </Link>
                    {venues.length > 0 && (
                        <Select
                            value={venueId ?? undefined}
                            onValueChange={(id) => router.push(`/admin/${id}/dashboard`)}
                        >
                            <SelectTrigger className="w-40 shrink-0">
                                <SelectValue placeholder="Switch venue…"/>
                            </SelectTrigger>
                            <SelectContent>
                                {venues.map((v) => (
                                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    <nav className="flex min-w-0 items-center gap-1 overflow-x-auto text-sm font-medium">
                        {primaryLinks.map((l) => (
                            <Link
                                key={l.href}
                                href={l.href}
                                className={`shrink-0 border-b-2 px-1 py-4 transition-colors ${
                                    isActive(l.href)
                                        ? 'border-ink text-ink dark:border-white dark:text-white'
                                        : 'border-transparent text-muted hover:text-ink dark:hover:text-white'
                                }`}
                            >
                                {l.label}
                            </Link>
                        ))}

                        {secondaryLinks.length > 0 && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        className={`ml-2 flex shrink-0 items-center gap-1 border-b-2 px-1 py-4 transition-colors ${
                                            moreIsActive
                                                ? 'border-ink text-ink dark:border-white dark:text-white'
                                                : 'border-transparent text-muted hover:text-ink dark:hover:text-white'
                                        }`}
                                    >
                                        More
                                        <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    {secondaryLinks.map((l) => (
                                        <DropdownMenuItem key={l.href} asChild>
                                            <Link
                                                href={l.href}
                                                className={isActive(l.href) ? 'font-semibold' : ''}
                                            >
                                                {l.label}
                                            </Link>
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </nav>
                </div>
                <div className="flex shrink-0 items-center gap-3">
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
'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';

import { formatCents } from '@/lib/money';
import { CartProvider, useCart } from '@/components/CartContext';
import {HeaderCartLink} from "@/components/HeadCartLink";
import { ThemeToggle } from '@/components/ThemeToggle';

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

interface TableInfo {
    table: {
        id: string;
        label: string;
    };
    venue: {
        slug: string;
        name: string;
        logoUrl: string | null;
        brandColor: string | null;
        currency: string;
    };
    area: {
        name: string;
    } | null;
}

export default function TableLayout({
                                        children,
                                    }: {
    children: ReactNode;
}) {
    const params = useParams<{
        venueSlug: string;
        token: string;
    }>();

    const { venueSlug, token } = params;

    const [info, setInfo] = useState<TableInfo | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!token) return;

        fetch(`${API_URL}/public/tables/${token}`)
            .then(async (res) => {
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));

                    throw new Error(
                        body.message ?? 'This QR code could not be loaded.',
                    );
                }

                return res.json();
            })
            .then((data: TableInfo) => {
                setInfo(data);
            })
            .catch((e: unknown) => {
                setError(
                    e instanceof Error
                        ? e.message
                        : 'This QR code could not be loaded.',
                );
            });
    }, [token]);

    if (error) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
                <p className="text-lg font-medium text-ink dark:text-white">{error}</p>

                <p className="mt-2 text-sm text-muted">
                    Please ask a staff member for help.
                </p>
            </div>
        );
    }

    if (!info) {
        return (
            <div className="flex min-h-screen items-center justify-center text-muted-soft">
                Loading…
            </div>
        );
    }

    return (
        <CartProvider token={token}>
            <div
                className="min-h-screen bg-canvas pb-24 dark:bg-surface-dark"
                style={
                    {
                        '--brand-color': info.venue.brandColor ?? '#EA580C',
                    } as React.CSSProperties
                }
            >
                <header
                    className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 text-white shadow-elevated"
                    style={{ backgroundColor: 'var(--brand-color)' }}
                >
                    <Link href={`/r/${venueSlug}/t/${token}`} className="flex min-w-0 items-center gap-3">
                        {info.venue.logoUrl && (
                            <img src={info.venue.logoUrl} alt={info.venue.name} className="h-8 w-8 rounded-full object-cover" />
                        )}
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold leading-tight">{info.venue.name}</p>
                            <p className="truncate text-xs opacity-90 leading-tight">
                                Ordering for {info.table.label}
                                {info.area ? ` · ${info.area.name}` : ''}
                            </p>
                        </div>
                    </Link>
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <HeaderCartLink venueSlug={venueSlug} token={token} />
                    </div>
                </header>

                <main className="mx-auto max-w-2xl">
                    {children}
                </main>

                <CartBar
                    venueSlug={venueSlug}
                    token={token}
                    currency={info.venue.currency}
                />
            </div>
        </CartProvider>
    );
}

function CartBar({
                     venueSlug,
                     token,
                     currency,
                 }: {
    venueSlug: string;
    token: string;
    currency: string;
}) {
    const { count, subtotalCents } = useCart();
    const pathname = usePathname();

    const onCartPage = pathname?.endsWith('/cart');

    // Minimum 44px touch target throughout.
    if (count === 0 || onCartPage) {
        return null;
    }

    return (
        <Link
            href={`/r/${venueSlug}/t/${token}/cart`}
            aria-live="polite"
            className="fixed inset-x-0 bottom-0 z-20 px-4 py-3 text-white shadow-[0_-2px_10px_rgba(0,0,0,0.15)]"
            style={{ backgroundColor: 'var(--brand-color)' }}
        >
            <div className="mx-auto flex min-h-[44px] max-w-2xl items-center justify-between">
        <span className="font-medium">
          View cart · {count} item{count === 1 ? '' : 's'}
        </span>

                <span className="font-semibold">
          {formatCents(subtotalCents, currency)}
        </span>
            </div>
        </Link>
    );
}
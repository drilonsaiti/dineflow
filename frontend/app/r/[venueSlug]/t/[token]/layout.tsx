'use client';

import { ReactNode, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { formatCents } from '@/lib/money';
import Link from 'next/link';
import {CartProvider, useCart} from "@/components/CartContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

interface TableInfo {
    table: { id: string; label: string };
    venue: { slug: string; name: string; logoUrl: string | null; brandColor: string | null; currency: string };
    area: { name: string } | null;
}

export default function TableLayout({
                                        children,
                                        params,
                                    }: {
    children: ReactNode;
    params: { venueSlug: string; token: string };
}) {
    const { token, venueSlug } = params;
    const [info, setInfo] = useState<TableInfo | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch(`${API_URL}/public/tables/${token}`)
            .then(async (res) => {
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    throw new Error(body.message ?? 'This QR code could not be loaded.');
                }
                return res.json();
            })
            .then(setInfo)
            .catch((e) => setError(e.message));
    }, [token]);

    if (error) {
        // Deactivated/unrecognized table (section 18) — clear, friendly message,
        // never a crash or blank page.
        return (
            <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
                <p className="text-lg font-medium">{error}</p>
                <p className="mt-2 text-sm text-gray-500">Please ask a staff member for help.</p>
            </div>
        );
    }

    if (!info) {
        return <div className="flex min-h-screen items-center justify-center text-gray-400">Loading…</div>;
    }

    return (
        <CartProvider token={token}>
            <div
                className="min-h-screen pb-24"
                style={{ ['--brand-color' as any]: info.venue.brandColor ?? '#111827' }}
            >
                <header className="sticky top-0 z-10 bg-brand px-4 py-3 text-white shadow-sm">
                    <div className="mx-auto flex max-w-2xl items-center gap-3">
                        {info.venue.logoUrl && (
                            <img src={info.venue.logoUrl} alt={info.venue.name} className="h-8 w-8 rounded-full object-cover" />
                        )}
                        <div>
                            <p className="text-sm font-semibold leading-tight">{info.venue.name}</p>
                            <p className="text-xs opacity-90 leading-tight">
                                Ordering for {info.table.label}
                                {info.area ? ` · ${info.area.name}` : ''}
                            </p>
                        </div>
                    </div>
                </header>

                <main className="mx-auto max-w-2xl">{children}</main>

                <CartBar venueSlug={venueSlug} token={token} currency={info.venue.currency} />
            </div>
        </CartProvider>
    );
}

function CartBar({ venueSlug, token, currency }: { venueSlug: string; token: string; currency: string }) {
    const { count, subtotalCents } = useCart();
    const pathname = usePathname();
    const onCartPage = pathname?.endsWith('/cart');

    // Min 44px touch target throughout (section 14).
    if (count === 0 || onCartPage) return null;

    return (
        <Link
            href={`/r/${venueSlug}/t/${token}/cart`}
            className="fixed inset-x-0 bottom-0 z-20 bg-brand px-4 py-3 text-white shadow-[0_-2px_10px_rgba(0,0,0,0.15)]"
        >
            <div className="mx-auto flex max-w-2xl items-center justify-between min-h-[44px]">
                <span className="font-medium">View cart · {count} item{count === 1 ? '' : 's'}</span>
                <span className="font-semibold">{formatCents(subtotalCents, currency)}</span>
            </div>
        </Link>
    );
}
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useVenuesMine } from '@/hooks/useVenues';

export default function AdminHomePage() {
    const router = useRouter();
    const { data: venues } = useVenuesMine();

    useEffect(() => {
        // Single-venue owners land straight on their dashboard — no picker
        // screen needed for the common case.
        if (venues?.length === 1) router.replace(`/admin/${venues[0].id}/dashboard`);
    }, [venues, router]);

    if (!venues) return <div className="p-8 text-gray-400">Loading…</div>;

    if (venues.length === 0) {
        return (
            <div className="mx-auto max-w-md p-8 text-center">
                <h1 className="text-xl font-semibold">No venues yet</h1>
                <p className="mt-2 text-gray-500">Create your first venue to get started.</p>
                <Link
                    href="/admin/onboarding"
                    className="mt-4 inline-block min-h-[44px] rounded-md bg-brand px-4 py-2 font-medium text-white"
                >
                    Create a venue
                </Link>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-md p-8">
            <h1 className="text-xl font-semibold">Your venues</h1>
            <ul className="mt-4 space-y-2">
                {venues.map((v) => (
                    <li key={v.id}>
                        <Link
                            href={`/admin/${v.id}/dashboard`}
                            className="block rounded-md border border-gray-200 px-4 py-3 hover:border-brand dark:border-gray-800"
                        >
                            {v.name}
                        </Link>
                    </li>
                ))}
            </ul>
            <Link href="/admin/onboarding" className="mt-4 inline-block text-sm text-brand underline">
                + Add another venue
            </Link>
        </div>
    );
}
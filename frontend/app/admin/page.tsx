'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

interface VenueSummary {
    id: string;
    name: string;
}

export default function AdminHomePage() {
    const router = useRouter();
    const [venues, setVenues] = useState<VenueSummary[] | null>(null);

    useEffect(() => {
        api.get<VenueSummary[]>('/venues/mine').then((data) => {
            setVenues(data);
            // Single-venue owners land straight on their dashboard — no picker
            // screen needed for the common case.
            if (data.length === 1) router.replace(`/admin/${data[0].id}/dashboard`);
        });
    }, [router]);

    if (venues === null) return <div className="p-8 text-muted-soft">Loading…</div>;

    if (venues.length === 0) {
        return (
            <div className="mx-auto max-w-md p-8 text-center">
                <h1 className="text-xl">No venues yet</h1>
                <p className="mt-2 text-muted">Create your first venue to get started.</p>
                <Link href="/admin/onboarding" className="btn-primary mt-4">
                    Create a venue
                </Link>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-md p-8">
            <h1 className="text-xl">Your venues</h1>
            <ul className="mt-4 space-y-2">
                {venues.map((v) => (
                    <li key={v.id}>
                        <Link
                            href={`/admin/${v.id}/dashboard`}
                            className="block rounded-md border border-hairline px-4 py-3 hover:border-ink dark:border-gray-800 dark:hover:border-gray-400"
                        >
                            {v.name}
                        </Link>
                    </li>
                ))}
            </ul>
            <Link href="/admin/onboarding" className="mt-4 inline-block text-sm font-medium text-ink underline dark:text-white">
                + Add another venue
            </Link>
        </div>
    );
}
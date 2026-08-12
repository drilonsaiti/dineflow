'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

// Tabs instead of a locked linear wizard:
// - Any completed step can be revisited.
// - Users can skip to the dashboard at any time after creating a venue.
const STEPS = ['venue', 'category', 'table'] as const;
type Step = (typeof STEPS)[number];

export default function OnboardingPage() {
    const router = useRouter();

    const [step, setStep] = useState<Step>('venue');
    const [venueId, setVenueId] = useState<string | null>(null);
    const [venueName, setVenueName] = useState('');
    const [slug, setSlug] = useState('');
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function createVenue(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        setCreating(true);
        setError(null);

        try {
            const venue = await api.post<{ id: string }>('/venues', {
                name: venueName,
                slug: slug || undefined,
            });

            setVenueId(venue.id);
            setStep('category');
        } catch (err: unknown) {
            setError(
                err instanceof Error ? err.message : 'Failed to create venue.',
            );
        } finally {
            setCreating(false);
        }
    }

    function goToStep(nextStep: Step) {
        // Venue must exist before the other onboarding sections are available.
        if (!venueId && nextStep !== 'venue') {
            return;
        }

        setStep(nextStep);
    }

    return (
        <div className="mx-auto max-w-xl p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Set up your venue</h1>

                {venueId && (
                    <Link
                        href={`/admin/${venueId}/dashboard`}
                        className="text-sm text-gray-500 underline"
                    >
                        Skip to dashboard
                    </Link>
                )}
            </div>

            {/* Onboarding tabs */}
            <nav
                aria-label="Onboarding steps"
                className="mt-4 flex gap-2"
            >
                {STEPS.map((s, i) => (
                    <button
                        key={s}
                        type="button"
                        onClick={() => goToStep(s)}
                        disabled={!venueId && s !== 'venue'}
                        aria-current={step === s ? 'step' : undefined}
                        className={`min-h-[44px] flex-1 rounded-md px-3 text-sm font-medium disabled:opacity-40 ${
                            step === s
                                ? 'bg-brand text-white'
                                : 'bg-gray-100 text-gray-600'
                        }`}
                    >
                        {i + 1}.{' '}
                        {s === 'venue'
                            ? 'Venue'
                            : s === 'category'
                                ? 'Menu'
                                : 'Tables & QR'}
                    </button>
                ))}
            </nav>

            <div className="mt-6">
                {/* Step 1: Venue */}
                {step === 'venue' && (
                    <form onSubmit={createVenue} className="space-y-4">
                        <div>
                            <label
                                htmlFor="venue-name"
                                className="block text-sm font-medium"
                            >
                                Venue name
                            </label>

                            <input
                                id="venue-name"
                                required
                                autoFocus
                                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                                value={venueName}
                                onChange={(e) => setVenueName(e.target.value)}
                                placeholder="Mario's Pizzeria"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="venue-slug"
                                className="block text-sm font-medium"
                            >
                                URL slug{' '}
                                <span className="font-normal text-gray-400">
                  (optional — auto-generated from name)
                </span>
                            </label>

                            <input
                                id="venue-slug"
                                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                                value={slug}
                                onChange={(e) => setSlug(e.target.value)}
                                placeholder="marios-pizzeria"
                            />
                        </div>

                        {error && (
                            <p
                                role="alert"
                                className="text-sm text-red-500"
                            >
                                {error}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={creating}
                            className="min-h-[44px] w-full rounded-md bg-brand font-medium text-white disabled:opacity-50"
                        >
                            {creating ? 'Creating…' : 'Create venue'}
                        </button>
                    </form>
                )}

                {/* Step 2: Menu */}
                {step === 'category' && venueId && (
                    <div>
                        <p className="mb-4 text-sm text-gray-500">
                            Add your first category and a couple of items. You can add more
                            any time from the Menu page.
                        </p>

                        <Link
                            href={`/admin/${venueId}/menu`}
                            className="inline-block min-h-[44px] rounded-md bg-brand px-4 py-2 font-medium text-white"
                        >
                            Go build your menu →
                        </Link>

                        <div className="mt-4">
                            <button
                                type="button"
                                onClick={() => setStep('table')}
                                className="text-sm text-brand underline"
                            >
                                Next: add tables
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Tables */}
                {step === 'table' && venueId && (
                    <div>
                        <p className="mb-4 text-sm text-gray-500">
                            Add your first table and preview its QR code.
                        </p>

                        <Link
                            href={`/admin/${venueId}/tables`}
                            className="inline-block min-h-[44px] rounded-md bg-brand px-4 py-2 font-medium text-white"
                        >
                            Go add tables →
                        </Link>

                        <div className="mt-4">
                            <Link
                                href={`/admin/${venueId}/dashboard`}
                                className="text-sm text-brand underline"
                            >
                                Finish setup → go to dashboard
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
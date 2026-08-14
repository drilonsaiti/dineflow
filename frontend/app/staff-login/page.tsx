'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// One step: email + PIN, submit, in. No email round-trip. This is a real
// Supabase password sign-in (the PIN is the account's password) — not a
// separate auth system, so sessions/JWTs work identically to the owner
// magic-link path everywhere else in the app.
export default function StaffLoginPage() {
    const [email, setEmail] = useState('');
    const [pin, setPin] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);
        const { error } = await supabase.auth.signInWithPassword({ email, password: pin });
        if (error) {
            setError('Email or PIN not recognized. Ask your manager to double-check it.');
            setLoading(false);
            return;
        }
        router.push('/admin');
    }

    return (
        <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center p-6">
            <h1 className="text-xl font-semibold">Staff sign in</h1>
            <p className="mt-1 text-sm text-gray-500">Enter the email and PIN your manager gave you.</p>
            <form onSubmit={submit} className="mt-5 space-y-3">
                <input
                    type="email"
                    required
                    placeholder="you@venue.com"
                    className="w-full rounded-md border border-gray-300 px-3 py-3 text-base"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <input
                    type="tel"
                    inputMode="numeric"
                    required
                    maxLength={6}
                    placeholder="4-6 digit PIN"
                    className="w-full rounded-md border border-gray-300 px-3 py-3 text-center text-2xl tracking-widest"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                />
                <button
                    disabled={loading}
                    className="min-h-[48px] w-full rounded-md bg-brand font-medium text-white disabled:opacity-50"
                >
                    {loading ? 'Signing in…' : 'Sign in'}
                </button>
                {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
            </form>
            <a href="/admin/login" className="mt-6 text-center text-sm text-gray-500 underline">
                Owner or manager? Sign in with email link instead
            </a>
        </div>
    );
}
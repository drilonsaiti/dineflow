'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    async function sendMagicLink(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: { emailRedirectTo: `${window.location.origin}/admin` },
        });
        if (error) setError(error.message);
        else setSent(true);
    }

    return (
        <div className="mx-auto max-w-sm p-8">
            <h1 className="text-xl font-semibold">Staff / owner login</h1>
            {sent ? (
                <p className="mt-4 text-sm text-gray-600">
                    Check your email for a magic link to sign in.
                </p>
            ) : (
                <form onSubmit={sendMagicLink} className="mt-4 space-y-3">
                    <input
                        type="email"
                        required
                        placeholder="you@venue.com"
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <button className="w-full rounded-md bg-brand px-4 py-2 text-sm font-medium text-white">
                        Send magic link
                    </button>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                </form>
            )}
        </div>
    );
}
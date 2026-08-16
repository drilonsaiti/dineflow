'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {supabase} from '@/lib/supabase';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    async function sendMagicLink(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setSending(true);
        const {error} = await supabase.auth.signInWithOtp({
            email,
            options: {emailRedirectTo: `${window.location.origin}/admin`},
        });
        if (error) setError(error.message);
        else setSent(true);
        setSending(false);
    }

    return (
        <div className="mx-auto max-w-sm p-8">
            <h1 className="text-xl">Sign in or create your account</h1>
            <p className="mt-1 text-sm text-muted">
                Enter your email — we'll send a link. First time here? That same link creates your account.
            </p>
            {sent ? (
                <p className="mt-4 text-sm text-body dark:text-gray-300">
                    Check your email for a magic link to sign in.
                </p>
            ) : (
                <form onSubmit={sendMagicLink} className="mt-4 space-y-3">
                    <input
                        type="email"
                        required
                        placeholder="you@venue.com"
                        className="input"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <button type="submit" disabled={sending} className="btn-primary w-full">
                        {sending ? 'Sending…' : 'Send magic link'}
                    </button>
                    {error && <p className="text-sm text-error">{error}</p>}
                </form>
            )}
            <a href="/staff-login" className="mt-6 block text-center text-sm text-muted underline">
                Staff member with a PIN? Sign in here instead
            </a>
        </div>
    );
}
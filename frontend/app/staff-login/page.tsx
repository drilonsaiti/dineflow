'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {Eye, EyeOff} from 'lucide-react';
import {supabase} from '@/lib/supabase';
import {useStaffLogin} from "@/hooks/useStaffLogin";

// One step: email + PIN, submit, in. No email round-trip. This is a real
// Supabase password sign-in (the PIN is the account's password) — not a
// separate auth system, so sessions/JWTs work identically to the owner
// magic-link path everywhere else in the app.
export default function StaffLoginPage() {
    const [email, setEmail] = useState('');
    const [pin, setPin] = useState('');
    const [showPin, setShowPin] = useState(false);
    const router = useRouter();
    const loginMutation = useStaffLogin();

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        try {
            await loginMutation.mutateAsync({email, pin});
            router.push('/admin');
        } catch {
            // error already captured on loginMutation.error — nothing else to do here
        }
    }

    return (
        <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center p-6">
            <h1 className="text-xl">Staff sign in</h1>
            <p className="mt-1 text-sm text-muted">Enter the email and PIN your manager gave you.</p>
            <form onSubmit={submit} className="mt-5 space-y-3">
                <input
                    type="email"
                    required
                    placeholder="you@venue.com"
                    className="input py-3 text-base"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <div className="relative">
                    <input
                        type={showPin ? 'text' : 'password'}
                        inputMode="numeric"
                        required
                        maxLength={6}
                        placeholder="4-6 digit PIN"
                        className="input py-3 pr-11 text-center text-2xl tracking-widest"
                        value={pin}
                        onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPin((s) => !s)}
                        className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center text-muted hover:text-ink dark:hover:text-white"
                        aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
                        aria-pressed={showPin}
                    >
                        {showPin ? <EyeOff className="h-4 w-4" aria-hidden/> : <Eye className="h-4 w-4" aria-hidden/>}
                    </button>
                </div>
                <button disabled={loginMutation.isPending} className="btn-primary w-full">
                    {loginMutation.isPending ? 'Signing in…' : 'Sign in'}
                </button>
                {loginMutation.error &&
                    <p role="alert" className="text-sm text-error">{(loginMutation.error as Error).message}
                    </p>}
            </form>
            <a href="/admin/login" className="mt-6 text-center text-sm text-muted underline">
                Owner or manager? Sign in with email link instead
            </a>
        </div>
    );
}
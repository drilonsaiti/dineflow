'use client';

import { useState } from 'react';
import { useStaff, useInviteStaff, useRemoveStaff } from '@/hooks/useStaff';

const ROLES = ['MANAGER', 'STAFF', 'KITCHEN', 'BAR'];

export default function StaffPage({ params }: { params: { venueId: string } }) {
    const { venueId } = params;
    const { data: members = [], isLoading } = useStaff(venueId);
    const inviteMutation = useInviteStaff(venueId);
    const removeMutation = useRemoveStaff(venueId);

    const [email, setEmail] = useState('');
    const [pin, setPin] = useState('');
    const [role, setRole] = useState('STAFF');
    const [error, setError] = useState<string | null>(null);

    async function invite(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        try {
            await inviteMutation.mutateAsync({ email, role, pin });
            setEmail('');
            setPin('');
        } catch (err: any) {
            setError(err.message);
        }
    }

    function remove(userId: string) {
        if (!confirm('Remove this person from the venue?')) return;
        removeMutation.mutate(userId);
    }

    if (isLoading) return <div className="p-8 text-gray-500">Loading staff…</div>;

    return (
        <div className="mx-auto max-w-xl p-6 space-y-6">
            <h1 className="text-2xl font-display font-semibold">Staff</h1>

            <p className="text-xs text-gray-500">
                Pick a PIN and tell the employee directly (in person, by text) — this is what they'll use to sign in at{' '}
                <code>/staff-login</code>.
            </p>

            <form onSubmit={invite} className="card-soft flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[180px]">
                    <label className="block text-xs font-medium text-muted">Email</label>
                    <input type="email" required className="input mt-1" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="waiter@venue.com" />
                </div>
                <div>
                    <label className="block text-xs font-medium text-muted">PIN (4-6 digits)</label>
                    <input
                        inputMode="numeric"
                        required
                        maxLength={6}
                        className="input mt-1 w-28 text-center tracking-widest"
                        value={pin}
                        onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="1234"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-muted">Role</label>
                    <select value={role} onChange={(e) => setRole(e.target.value)} className="input mt-1">
                        {ROLES.map((r) => (
                            <option key={r} value={r}>{r.charAt(0) + r.slice(1).toLowerCase()}</option>
                        ))}
                    </select>
                </div>
                <button type="submit" disabled={inviteMutation.isPending} className="btn-primary">
                    {inviteMutation.isPending ? 'Inviting…' : 'Send invite'}
                </button>
                {error && <p className="w-full text-sm text-error">{error}</p>}
            </form>

            <ul className="divide-y divide-hairline card p-0">
                {members.map((m) => (
                    <li key={m.user.id} className="flex items-center justify-between p-4">
                        <div>
                            <p className="text-sm font-medium">{m.user.fullName ?? m.user.email}</p>
                            <p className="text-xs text-muted">{m.role}</p>
                        </div>
                        {m.role !== 'OWNER' && (
                            <button onClick={() => remove(m.user.id)} className="text-sm text-error hover:underline">
                                Remove
                            </button>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}
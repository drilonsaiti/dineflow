'use client';

import {use, useEffect, useState} from 'react';
import { api } from '@/lib/api';
import { Select, SelectValue, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/Select';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';

interface Membership {
    role: string;
    user: { id: string; email: string; fullName: string | null };
}

const ROLES = ['MANAGER', 'STAFF', 'KITCHEN', 'BAR'];

export default function StaffPage({ params }: { params: Promise<{ venueId: string }> }) {
    const { venueId } = use(params);
    const [members, setMembers] = useState<Membership[]>([]);
    const [email, setEmail] = useState('');
    const [pin, setPin] = useState('');
    const [role, setRole] = useState('STAFF');
    const [inviting, setInviting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pendingRemove, setPendingRemove] = useState<Membership | null>(null);
    const showToast = useToast();

    async function refresh() {
        setMembers(await api.get<Membership[]>(`/venues/${venueId}/staff`));
    }

    useEffect(() => {
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [venueId]);

    async function invite(e: React.FormEvent) {
        e.preventDefault();
        setInviting(true);
        setError(null);
        try {
            await api.post(`/venues/${venueId}/staff/invite`, { email, role, pin });
            setEmail('');
            setPin('');
            refresh();
            showToast('Invite sent');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setInviting(false);
        }
    }

    async function remove(userId: string) {
        try {
            await api.delete(`/venues/${venueId}/staff/${userId}`);
            refresh();
            showToast('Removed from venue');
        } catch (err: any) {
            showToast(err.message ?? 'Failed to remove', 'error');
        }
    }

    return (
        <div className="mx-auto max-w-xl p-6 space-y-6">
            <h1 className="text-2xl">Staff</h1>
            <p className="text-xs text-gray-500">
                Pick a PIN and tell the employee directly (in person, by text) — this is what they'll use to sign in at{' '}
                <code>/staff-login</code>.
            </p>

            <form onSubmit={invite} className="card-soft flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[180px]">
                    <label className="block text-xs font-medium text-muted">Email</label>
                    <input
                        type="email"
                        required
                        className="input mt-1"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="waiter@venue.com"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-muted">Role</label>
                    <Select value={role} onValueChange={setRole}>
                        <SelectTrigger className="mt-1 w-36">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {ROLES.map((r) => (
                                <SelectItem key={r} value={r}>
                                    {r.charAt(0) + r.slice(1).toLowerCase()}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
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
                <button type="submit" disabled={inviting} className="btn-primary">
                    {inviting ? 'Inviting…' : 'Send invite'}
                </button>
                {error && <p className="w-full text-sm text-error">{error}</p>}
            </form>

            <ul className="divide-y divide-hairline card p-0">
                {members.map((m) => (
                    <li key={m.user.id} className="flex items-center justify-between p-4">
                        <div>
                            <p className="text-sm font-medium text-ink dark:text-white">{m.user.fullName ?? m.user.email}</p>
                            <p className="text-xs text-muted">{m.role}</p>
                        </div>
                        {m.role !== 'OWNER' && (
                            <button onClick={() => setPendingRemove(m)} className="btn-ghost-danger">
                                Remove
                            </button>
                        )}
                    </li>
                ))}
            </ul>

            <ConfirmDialog
                open={!!pendingRemove}
                onOpenChange={(open) => !open && setPendingRemove(null)}
                title="Remove this person?"
                description={`${pendingRemove?.user.fullName ?? pendingRemove?.user.email ?? 'This person'} will lose access to this venue immediately.`}
                confirmLabel="Remove"
                danger
                onConfirm={() => pendingRemove && remove(pendingRemove.user.id)}
            />
        </div>
    );
}
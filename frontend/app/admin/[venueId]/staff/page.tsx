'use client';

import {use, useState} from 'react';
import {useInviteStaff, useRemoveStaff, useStaff} from '@/hooks/useStaff';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/Select';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {useToast} from '@/components/ui/Toast';

const ROLES = ['MANAGER', 'STAFF', 'KITCHEN', 'BAR'];

export default function StaffPage({params}: { params: Promise<{ venueId: string }> }) {
    const {venueId} = use(params);
    const {data: members = [], isLoading} = useStaff(venueId);
    const inviteMutation = useInviteStaff(venueId);
    const removeMutation = useRemoveStaff(venueId);
    const showToast = useToast();

    const [email, setEmail] = useState('');
    const [pin, setPin] = useState('');
    const [role, setRole] = useState('STAFF');
    const [error, setError] = useState<string | null>(null);
    const [pendingRemove, setPendingRemove] = useState<{ id: string; label: string } | null>(null);

    async function invite(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        try {
            await inviteMutation.mutateAsync({email, role, pin});
            setEmail('');
            setPin('');
            showToast('Invite sent', 'success');
        } catch (err: any) {
            setError(err.message);
        }
    }

    function remove(userId: string) {
        removeMutation.mutate(userId, {
            onSuccess: () => showToast('Removed from venue', 'success'),
            onError: (err: any) => showToast(err.message ?? 'Failed to remove', 'error'),
        });
    }

    if (isLoading) return <div className="p-8 text-muted-soft">Loading staff…</div>;

    return (
        <div className="mx-auto max-w-xl p-6 space-y-6">
            <h1 className="text-2xl">Staff</h1>

            <p className="text-xs text-muted">
                Pick a PIN and tell the employee directly (in person, by text) — this is what they'll use to sign in
                at{' '}
                <code>/staff-login</code>.
            </p>

            <form onSubmit={invite} className="card-soft flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[180px]">
                    <label className="block text-xs font-medium text-muted">Email</label>
                    <input type="email" required className="input mt-1" value={email}
                           onChange={(e) => setEmail(e.target.value)} placeholder="waiter@venue.com"/>
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
                    <Select value={role} onValueChange={setRole}>
                        <SelectTrigger className="mt-1 w-36">
                            <SelectValue/>
                        </SelectTrigger>
                        <SelectContent>
                            {ROLES.map((r) => (
                                <SelectItem key={r} value={r}>{r.charAt(0) + r.slice(1).toLowerCase()}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
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
                            <p className="text-sm font-medium text-ink dark:text-white">{m.user.fullName ?? m.user.email}</p>
                            <p className="text-xs text-muted">{m.role}</p>
                        </div>
                        {m.role !== 'OWNER' && (
                            <button
                                onClick={() => setPendingRemove({
                                    id: m.user.id,
                                    label: m.user.fullName ?? m.user.email
                                })}
                                className="btn-ghost-danger"
                            >
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
                description={`${pendingRemove?.label ?? 'This person'} will lose access to this venue immediately.`}
                confirmLabel="Remove"
                danger
                onConfirm={() => {
                    if (pendingRemove) remove(pendingRemove.id);
                }}
            />
        </div>
    );
}
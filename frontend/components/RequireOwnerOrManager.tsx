'use client';
import {ReactNode} from 'react';
import {useMyMembership} from '@/hooks/useVenues';

export function RequireOwnerOrManager({venueId, children}: { venueId: string; children: ReactNode }) {
    const {data: membership, isLoading} = useMyMembership(venueId);
    if (isLoading) return <div className="p-8 text-muted-soft">Loading…</div>;
    const allowed = membership && ['OWNER', 'MANAGER'].includes(membership.role);
    if (!allowed) {
        return (
            <div className="mx-auto max-w-md p-8 text-center">
                <h1 className="text-xl">Restricted</h1>
                <p className="mt-2 text-muted">
                    Only venue owners and managers can access this page. Ask your manager if you
                    think you should have access.
                </p>
            </div>
        );
    }
    return <>{children}</>;
}
'use client';

import {useEffect} from 'react';
import {Banknote, Hand} from 'lucide-react';
import {formatElapsed} from '@/lib/elapsed';
import {playNotificationSound} from '@/lib/notification-sound';
import {acquireSocket} from '@/lib/socket';
import {
    useAcknowledgeTableRequest,
    useResolveTableRequest,
    useTableRequests,
    useTableRequestSocketSync,
} from '@/hooks/useTableRequests';

const LABELS: Record<string, { text: string; icon: typeof Hand }> = {
    CALL_WAITER: {text: 'Called waiter', icon: Hand},
    REQUEST_BILL_CASH: {text: 'Wants to pay cash', icon: Banknote},
};

export function TableRequestsPanel({venueId}: { venueId: string }) {
    const {data: requests = []} = useTableRequests(venueId);
    const acknowledgeMutation = useAcknowledgeTableRequest(venueId);
    const resolveMutation = useResolveTableRequest(venueId);
    const {onCreated, onUpdated} = useTableRequestSocketSync(venueId);

    useEffect(() => {
        const {socket, release} = acquireSocket();

        function handleCreated(req: any) {
            onCreated(req);
            playNotificationSound('table-request');
        }

        function handleUpdated(req: any) {
            onUpdated(req);
        }

        socket.on('table_request_created', handleCreated);
        socket.on('table_request_updated', handleUpdated);
        return () => {
            socket.off('table_request_created', handleCreated);
            socket.off('table_request_updated', handleUpdated);
            release();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [venueId]);

    if (requests.length === 0) return null;

    return (
        <div className="border-b border-warning/30 bg-warning/10 px-4 py-2 dark:border-warning/20">
            <div className="flex flex-wrap gap-2">
                {requests.map((req) => {
                    const {text, icon: Icon} = LABELS[req.type];
                    return (
                        <div
                            key={req.id}
                            className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/15 px-3 py-1.5 text-sm text-ink dark:text-white"
                        >
                            <span className="font-medium">{req.table.label}</span>
                            <span className="flex items-center gap-1.5">
                                <Icon className="h-3.5 w-3.5 text-warning" aria-hidden/>
                                {text}
                            </span>
                            <span className="text-warning">{formatElapsed(req.createdAt)}</span>
                            {req.status === 'PENDING' && (
                                <button
                                    onClick={() => acknowledgeMutation.mutate(req.id)}
                                    className="min-h-[32px] rounded bg-warning px-2 text-xs font-medium text-white"
                                >
                                    Acknowledge
                                </button>
                            )}
                            <button
                                onClick={() => resolveMutation.mutate(req.id)}
                                className="min-h-[32px] rounded border border-warning/50 px-2 text-xs text-ink dark:text-white"
                            >
                                Resolve
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
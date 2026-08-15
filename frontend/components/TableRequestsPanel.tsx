'use client';

import {useEffect} from 'react';
import {formatElapsed} from '@/lib/elapsed';
import {playNotificationSound} from '@/lib/notification-sound';
import {acquireSocket} from '@/lib/socket';
import {
    useAcknowledgeTableRequest,
    useResolveTableRequest,
    useTableRequests,
    useTableRequestSocketSync,
} from '@/hooks/useTableRequests';

const LABELS = {CALL_WAITER: '🙋 Called waiter', REQUEST_BILL_CASH: '💵 Wants to pay cash'};

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
        <div className="border-b border-gray-800 bg-amber-950/40 px-4 py-2">
            <div className="flex flex-wrap gap-2">
                {requests.map((req) => (
                    <div
                        key={req.id}
                        className="flex items-center gap-2 rounded-lg border border-amber-700 bg-amber-900/60 px-3 py-1.5 text-sm"
                    >
                        <span className="font-medium">{req.table.label}</span>
                        <span>{LABELS[req.type]}</span>
                        <span className="text-amber-300">{formatElapsed(req.createdAt)}</span>
                        {req.status === 'PENDING' && (
                            <button
                                onClick={() => acknowledgeMutation.mutate(req.id)}
                                className="min-h-[32px] rounded bg-amber-700 px-2 text-xs font-medium"
                            >
                                Acknowledge
                            </button>
                        )}
                        <button
                            onClick={() => resolveMutation.mutate(req.id)}
                            className="min-h-[32px] rounded border border-amber-600 px-2 text-xs"
                        >
                            Resolve
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
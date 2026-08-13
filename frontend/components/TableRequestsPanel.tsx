'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { formatElapsed } from '@/lib/elapsed';

interface TableRequest {
    id: string;
    type: 'CALL_WAITER' | 'REQUEST_BILL_CASH';
    status: 'PENDING' | 'ACKNOWLEDGED' | 'RESOLVED';
    createdAt: string;
    table: { label: string };
}

const LABELS = { CALL_WAITER: '🙋 Called waiter', REQUEST_BILL_CASH: '💵 Wants to pay cash' };

export function TableRequestsPanel({ venueId }: { venueId: string }) {
    const [requests, setRequests] = useState<TableRequest[]>([]);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    async function refresh() {
        setRequests(await api.get<TableRequest[]>(`/venues/${venueId}/table-requests`));
    }

    useEffect(() => {
        refresh();
        const socket = getSocket();

        function onCreated(req: TableRequest) {
            setRequests((prev) => [...prev, req]);
            audioRef.current?.play().catch(() => {});
        }
        function onUpdated(req: TableRequest) {
            setRequests((prev) =>
                req.status === 'RESOLVED' ? prev.filter((r) => r.id !== req.id) : prev.map((r) => (r.id === req.id ? req : r)),
            );
        }

        socket.on('table_request_created', onCreated);
        socket.on('table_request_updated', onUpdated);
        return () => {
            socket.off('table_request_created', onCreated);
            socket.off('table_request_updated', onUpdated);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [venueId]);

    async function acknowledge(id: string) {
        await api.patch(`/venues/${venueId}/table-requests/${id}/acknowledge`);
    }
    async function resolve(id: string) {
        await api.patch(`/venues/${venueId}/table-requests/${id}/resolve`);
    }

    if (requests.length === 0) return null;

    return (
        <div className="border-b border-gray-800 bg-amber-950/40 px-4 py-2">
            <audio ref={audioRef} src="/table-request.mp3" preload="auto" />
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
                            <button onClick={() => acknowledge(req.id)} className="min-h-[32px] rounded bg-amber-700 px-2 text-xs font-medium">
                                Acknowledge
                            </button>
                        )}
                        <button onClick={() => resolve(req.id)} className="min-h-[32px] rounded border border-amber-600 px-2 text-xs">
                            Resolve
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
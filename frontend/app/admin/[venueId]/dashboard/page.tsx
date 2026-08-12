'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { getSocket, joinVenueRoom } from '@/lib/socket';
import {OrderCard} from "@/components/OrderCard";

export interface StaffOrder {
    id: string;
    dailyNumber: number;
    status: 'RECEIVED' | 'VIEWED' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED';
    createdAt: string;
    totalCents: number;
    customerName: string | null;
    table: { label: string };
    items: {
        id: string;
        quantity: number;
        note: string | null;
        menuItem: { name: string };
        modifiers: { modifierOption?: { name: string } }[];
    }[];
    statusEvents: { changedBy: { fullName: string | null; email: string } | null }[];
}

const COLUMNS: { status: StaffOrder['status']; label: string }[] = [
    { status: 'RECEIVED', label: 'Received' },
    { status: 'VIEWED', label: 'Viewed' },
    { status: 'PREPARING', label: 'Preparing' },
    { status: 'READY', label: 'Ready' },
];

// Configurable "sitting too long" threshold (section 10).
const LATE_THRESHOLD_MINUTES = 10;

export default function StaffDashboardPage({ params }: { params: Promise<{ venueId: string }> }) {
    const { venueId } = use(params);
    const [orders, setOrders] = useState<StaffOrder[]>([]);
    const [station, setStation] = useState<string>('');
    const [connected, setConnected] = useState(false);
    const [soundOn, setSoundOn] = useState(true);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const refresh = useCallback(async () => {
        const data = await api.get<StaffOrder[]>(
            `/venues/${venueId}/orders${station ? `?station=${station}` : ''}`,
        );
        setOrders(data);
    }, [venueId, station]);

    // Initial load + full resync path — also called after a reconnect, so a
    // dropped connection never leaves the board trusting stale state
    // (section 18: "should recover/resync cleanly when connectivity
    // returns, not require a manual reload").
    useEffect(() => {
        refresh();
    }, [refresh]);

    useEffect(() => {
        const socket = getSocket();

        function onConnect() {
            setConnected(true);
            joinVenueRoom(venueId, station || undefined);
            refresh(); // resync on every (re)connect, not just the first one
        }
        function onDisconnect() {
            setConnected(false);
        }
        function onOrderCreated(order: StaffOrder) {
            setOrders((prev) => [...prev, order]);
            if (soundOn) audioRef.current?.play().catch(() => {});
        }
        function onOrderUpdated(order: StaffOrder) {
            setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)));
        }

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('order_created', onOrderCreated);
        socket.on('order_updated', onOrderUpdated);

        if (!socket.connected) socket.connect();
        else onConnect();

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('order_created', onOrderCreated);
            socket.off('order_updated', onOrderUpdated);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [venueId, station, soundOn, refresh]);

    async function advance(order: StaffOrder, toStatus: StaffOrder['status']) {
        // Optimistic update — the socket event will confirm/correct it, but a
        // busy kitchen shouldn't wait a round trip to see the card move.
        setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: toStatus } : o)));
        try {
            await api.patch(`/venues/${venueId}/orders/${order.id}/status`, { status: toStatus });
        } catch {
            refresh(); // rejected transition — snap back to server truth
        }
    }

    const visibleOrders = orders.filter((o) => COLUMNS.some((c) => c.status === o.status));

    return (
        <div className="flex h-screen flex-col bg-gray-900 text-white">
            <audio ref={audioRef} src="/new-order.mp3" preload="auto" />

            <header className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
                <h1 className="text-lg font-semibold">Order board</h1>
                <div className="flex items-center gap-4 text-sm">
          <span className={`flex items-center gap-1.5 ${connected ? 'text-green-400' : 'text-red-400'}`}>
            <span className={`h-2 w-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
              {connected ? 'Live' : 'Reconnecting…'}
          </span>
                    <select
                        value={station}
                        onChange={(e) => setStation(e.target.value)}
                        className="rounded-md border border-gray-700 bg-gray-800 px-2 py-1.5"
                    >
                        <option value="">All stations</option>
                        <option value="kitchen">Kitchen</option>
                        <option value="bar">Bar</option>
                    </select>
                    <button
                        onClick={() => setSoundOn((s) => !s)}
                        className="min-h-[44px] rounded-md border border-gray-700 px-3"
                    >
                        {soundOn ? '🔔 On' : '🔕 Off'}
                    </button>
                </div>
            </header>

            <div className="grid flex-1 grid-cols-4 gap-3 overflow-hidden p-3">
                {COLUMNS.map((col) => {
                    const columnOrders = visibleOrders
                        .filter((o) => o.status === col.status)
                        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

                    return (
                        <div key={col.status} className="flex flex-col overflow-hidden rounded-xl bg-gray-800">
                            <div className="flex items-center justify-between border-b border-gray-700 px-3 py-2">
                                <span className="font-semibold">{col.label}</span>
                                <span className="rounded-full bg-gray-700 px-2 py-0.5 text-xs">{columnOrders.length}</span>
                            </div>
                            <div className="flex-1 space-y-2 overflow-y-auto p-2">
                                {columnOrders.map((order) => (
                                    <OrderCard
                                        key={order.id}
                                        order={order}
                                        lateThresholdMinutes={LATE_THRESHOLD_MINUTES}
                                        onAdvance={(to) => advance(order, to)}
                                    />
                                ))}
                                {columnOrders.length === 0 && (
                                    <p className="p-3 text-center text-sm text-gray-500">No orders</p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
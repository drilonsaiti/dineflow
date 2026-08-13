'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { getSocket, joinVenueRoom } from '@/lib/socket';
import {OrderCard} from "@/components/OrderCard";
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { isAdjacentTransition } from '@/lib/order-transitions';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/Select";
import {TableRequestsPanel} from "@/components/TableRequestsPanel";

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

    function handleDragEnd(result: DropResult) {
        const { source, destination, draggableId } = result;
        if (!destination || source.droppableId === destination.droppableId) return;

        const order = orders.find((o) => o.id === draggableId);
        if (!order) return;

        const toStatus = destination.droppableId as StaffOrder['status'];
        if (!isAdjacentTransition(order.status, toStatus)) return; // invalid jump — snap back, no API call

        advance(order, toStatus);
    }

    const visibleOrders = orders.filter((o) => COLUMNS.some((c) => c.status === o.status));

    return (
        <div className="flex h-screen flex-col bg-canvas text-ink dark:bg-surface-dark dark:text-white">
            <audio ref={audioRef} src="/new-order.mp3" preload="auto" />

            <header className="flex items-center justify-between border-b border-hairline px-4 py-3 dark:border-gray-800">
                <h1 className="text-lg">Order board</h1>
                <div className="flex items-center gap-4 text-sm">
            <span className={`flex items-center gap-1.5 font-medium ${connected ? 'text-success' : 'text-error'}`}>
                <span className={`h-2 w-2 rounded-full ${connected ? 'bg-success' : 'bg-error'}`} />
                {connected ? 'Live' : 'Reconnecting…'}
            </span>
                    <Select value={station} onValueChange={setStation}>
                        <SelectTrigger className="w-36">
                            <SelectValue placeholder="All stations" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">All stations</SelectItem>
                            <SelectItem value="kitchen">Kitchen</SelectItem>
                            <SelectItem value="bar">Bar</SelectItem>
                        </SelectContent>
                    </Select>
                    <button
                        onClick={() => setSoundOn((s) => !s)}
                        className="btn-secondary"
                    >
                        {soundOn ? 'Sound on' : 'Sound off'}
                    </button>
                </div>
            </header>
            <TableRequestsPanel venueId={venueId} />
            <DragDropContext onDragEnd={handleDragEnd}>
                <div className="grid flex-1 grid-cols-4 gap-3 overflow-hidden p-3">
                    {COLUMNS.map((col) => {
                        const columnOrders = visibleOrders
                            .filter((o) => o.status === col.status)
                            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

                        return (
                            <Droppable droppableId={col.status} key={col.status}>
                                {(provided, snapshot) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                        className={`flex flex-col overflow-hidden rounded-lg bg-surface-card dark:bg-surface-dark-elevated ${
                                            snapshot.isDraggingOver ? 'ring-2 ring-ink dark:ring-white' : ''
                                        }`}
                                    >
                                        <div className="flex items-center justify-between border-b border-hairline px-3 py-2 dark:border-gray-700">
                                            <span className="text-sm font-semibold text-ink dark:text-white">{col.label}</span>
                                            <span className="rounded-pill bg-surface-strong px-2 py-0.5 text-xs font-medium text-muted dark:bg-gray-700 dark:text-gray-300">{columnOrders.length}</span>
                                        </div>
                                        <div className="flex-1 space-y-2 overflow-y-auto p-2">
                                            {columnOrders.map((order, index) => (
                                                <Draggable draggableId={order.id} index={index} key={order.id}>
                                                    {(dragProvided, dragSnapshot) => (
                                                        <div
                                                            ref={dragProvided.innerRef}
                                                            {...dragProvided.draggableProps}
                                                            {...dragProvided.dragHandleProps}
                                                            className={dragSnapshot.isDragging ? 'opacity-80' : ''}
                                                        >
                                                            <OrderCard
                                                                order={order}
                                                                lateThresholdMinutes={LATE_THRESHOLD_MINUTES}
                                                                onAdvance={(to) => advance(order, to)}
                                                            />
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}
                                            {columnOrders.length === 0 && (
                                                <p className="p-3 text-center text-sm text-muted-soft">No orders</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </Droppable>
                        );
                    })}
                </div>
            </DragDropContext>
        </div>
    );
}
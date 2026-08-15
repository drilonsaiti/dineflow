'use client';

import { use, useEffect, useRef, useState } from 'react';
import {
    DragDropContext,
    Droppable,
    Draggable,
    DropResult,
} from '@hello-pangea/dnd';
import { isAdjacentTransition } from '@/lib/order-transitions';
import { api } from '@/lib/api';
import { getSocket, joinVenueRoom } from '@/lib/socket';
import {
    useOrders,
    useAdvanceOrderStatus,
    useOrderSocketSync,
} from '@/hooks/useOrders';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/Select';
import { TableRequestsPanel } from '@/components/TableRequestsPanel';
import { OrderCard } from '@/components/OrderCard';
import {useVenueCurrency} from "@/hooks/useVenueCurrency";
import {playNotificationSound} from "@/lib/notification-sound";

export interface StaffOrder {
    id: string;
    dailyNumber: number;
    status:
        | 'RECEIVED'
        | 'VIEWED'
        | 'PREPARING'
        | 'READY'
        | 'SERVED'
        | 'CANCELLED';
    createdAt: string;
    totalCents: number;
    customerName: string | null;
    table: {
        label: string;
    };
    items: {
        id: string;
        quantity: number;
        note: string | null;
        menuItem: {
            name: string;
        };
        modifiers: {
            modifierOption?: {
                name: string;
            };
        }[];
    }[];
    statusEvents: {
        changedBy: {
            fullName: string | null;
            email: string;
        } | null;
    }[];
}

const COLUMNS: {
    status: StaffOrder['status'];
    label: string;
}[] = [
    { status: 'RECEIVED', label: 'Received' },
    { status: 'VIEWED', label: 'Viewed' },
    { status: 'PREPARING', label: 'Preparing' },
    { status: 'READY', label: 'Ready' },
];

// Configurable "sitting too long" threshold (section 10).
const LATE_THRESHOLD_MINUTES = 10;

export default function StaffDashboardPage({
                                               params,
                                           }: {
    params: Promise<{ venueId: string }>;
}) {
    const { venueId } = use(params);

    const [station, setStation] = useState<string>('');
    const [connected, setConnected] = useState(false);
    const [soundOn, setSoundOn] = useState(true);
    const [role, setRole] = useState<string | null>(null);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [showAllColumns, setShowAllColumns] = useState(false);
    const [autoPrint, setAutoPrint] = useState(false);

    const audioRef = useRef<HTMLAudioElement | null>(null);

    const {
        data: orders = [],
        refetch,
    } = useOrders(venueId, station || undefined);

    const advanceStatusMutation = useAdvanceOrderStatus(
        venueId,
        station || undefined,
    );

    const {
        onOrderCreated,
        onOrderUpdated,
    } = useOrderSocketSync(
        venueId,
        station || undefined,
    );

    const currency = useVenueCurrency(venueId);

    useEffect(() => {
        api.get<{ autoPrintTickets: boolean }>(
            `/venues/${venueId}/basics`,
        ).then((v) => setAutoPrint(v.autoPrintTickets));
    }, [venueId]);

    useEffect(() => {
        api.get<{ role: string }>(
            `/venues/${venueId}/my-membership`,
        ).then((r) => setRole(r.role));

        api.get<any[]>(
            `/venues/${venueId}/table-assignments`,
        ).then(setAssignments);

        import('@/lib/supabase').then(({ supabase }) =>
            supabase.auth
                .getUser()
                .then(({ data }) =>
                    setCurrentUserId(data.user?.id ?? null),
                ),
        );
    }, [venueId]);

    useEffect(() => {
        const socket = getSocket();

        function handleConnect() {
            setConnected(true);
            joinVenueRoom(venueId, station || undefined);

            // Resync on every (re)connect.
            refetch();
        }

        function handleDisconnect() {
            setConnected(false);
        }

        function handleOrderCreated(order: StaffOrder) {
            onOrderCreated(order);

            if (soundOn) {
                playNotificationSound('order');
            }

            if (autoPrint) {
                window.open(
                    `/admin/${venueId}/print-ticket/${order.id}`,
                    '_blank',
                    'width=320,height=600',
                );
            }
        }

        function handleOrderUpdated(order: StaffOrder) {
            onOrderUpdated(order);
        }

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('order_created', handleOrderCreated);
        socket.on('order_updated', handleOrderUpdated);

        if (!socket.connected) {
            socket.connect();
        } else {
            handleConnect();
        }

        return () => {
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            socket.off('order_created', handleOrderCreated);
            socket.off('order_updated', handleOrderUpdated);
        };

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [venueId, station, soundOn, autoPrint]);

    function advance(
        order: StaffOrder,
        toStatus: StaffOrder['status'],
    ) {
        advanceStatusMutation.mutate({
            orderId: order.id,
            status: toStatus,
        });
    }

    function handleDragEnd(result: DropResult) {
        const {
            source,
            destination,
            draggableId,
        } = result;

        if (
            !destination ||
            source.droppableId === destination.droppableId
        ) {
            return;
        }

        const order = orders.find(
            (o) => o.id === draggableId,
        );

        if (!order) return;

        const toStatus =
            destination.droppableId as StaffOrder['status'];

        if (!isAdjacentTransition(order.status, toStatus)) {
            return;
        }

        advance(order, toStatus);
    }

    const visibleOrders = orders.filter((o) =>
        COLUMNS.some((c) => c.status === o.status),
    );

    const isWaiter = role === 'STAFF';

    const visibleColumns =
        isWaiter && !showAllColumns
            ? COLUMNS.filter((c) => c.status === 'READY')
            : COLUMNS;

    return (
        <div className="flex h-screen flex-col bg-canvas text-ink dark:bg-surface-dark dark:text-white">

            <header className="flex items-center justify-between border-b border-hairline px-4 py-3 dark:border-gray-800">
                <h1 className="text-lg">
                    Order board
                </h1>

                {isWaiter && (
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={showAllColumns}
                            onChange={(e) =>
                                setShowAllColumns(
                                    e.target.checked,
                                )
                            }
                        />
                        Show all columns
                    </label>
                )}

                <div className="flex items-center gap-4 text-sm">
                    <span
                        className={`flex items-center gap-1.5 font-medium ${
                            connected
                                ? 'text-success'
                                : 'text-error'
                        }`}
                    >
                        <span
                            className={`h-2 w-2 rounded-full ${
                                connected
                                    ? 'bg-success'
                                    : 'bg-error'
                            }`}
                        />

                        {connected
                            ? 'Live'
                            : 'Reconnecting…'}
                    </span>

                    <Select
                        value={station}
                        onValueChange={setStation}
                    >
                        <SelectTrigger className="w-36">
                            <SelectValue placeholder="All stations" />
                        </SelectTrigger>

                        <SelectContent>
                            <SelectItem value="">
                                All stations
                            </SelectItem>

                            <SelectItem value="kitchen">
                                Kitchen
                            </SelectItem>

                            <SelectItem value="bar">
                                Bar
                            </SelectItem>
                        </SelectContent>
                    </Select>

                    <button
                        onClick={() =>
                            setSoundOn((s) => !s)
                        }
                        className="btn-secondary"
                    >
                        {soundOn
                            ? 'Sound on'
                            : 'Sound off'}
                    </button>
                </div>
            </header>

            <TableRequestsPanel
                venueId={venueId}
            />

            {isWaiter && (
                <div className="flex gap-2 overflow-x-auto border-b border-gray-800 px-4 py-2">
                    {assignments
                        .filter(
                            (a) =>
                                a.userId ===
                                currentUserId,
                        )
                        .map((a) => (
                            <span
                                key={a.tableId}
                                className="shrink-0 rounded-full bg-brand/20 px-3 py-1 text-xs font-medium text-brand"
                            >
                                {a.table.label}
                            </span>
                        ))}

                    {assignments.filter(
                        (a) =>
                            a.userId ===
                            currentUserId,
                    ).length === 0 && (
                        <a
                            href={`/admin/${venueId}/tables-live`}
                            className="text-xs text-gray-500 underline"
                        >
                            Claim a table →
                        </a>
                    )}
                </div>
            )}

            <DragDropContext
                onDragEnd={handleDragEnd}
            >
                <div
                    className={`grid flex-1 gap-3 overflow-hidden p-3 grid-cols-${visibleColumns.length}`}
                >
                    {visibleColumns.map((col) => {
                        const columnOrders = visibleOrders
                            .filter(
                                (o) =>
                                    o.status ===
                                    col.status,
                            )
                            .sort(
                                (a, b) =>
                                    new Date(
                                        a.createdAt,
                                    ).getTime() -
                                    new Date(
                                        b.createdAt,
                                    ).getTime(),
                            );

                        return (
                            <Droppable
                                droppableId={col.status}
                                key={col.status}
                            >
                                {(
                                    provided,
                                    snapshot,
                                ) => (
                                    <div
                                        ref={
                                            provided.innerRef
                                        }
                                        {...provided.droppableProps}
                                        className={`flex flex-col overflow-hidden rounded-lg bg-surface-card dark:bg-surface-dark-elevated ${
                                            snapshot.isDraggingOver
                                                ? 'ring-2 ring-ink dark:ring-white'
                                                : ''
                                        }`}
                                    >
                                        <div className="flex items-center justify-between border-b border-hairline px-3 py-2 dark:border-gray-700">
                                            <span className="text-sm font-semibold text-ink dark:text-white">
                                                {col.label}
                                            </span>

                                            <span className="rounded-pill bg-surface-strong px-2 py-0.5 text-xs font-medium text-muted dark:bg-gray-700 dark:text-gray-300">
                                                {columnOrders.length}
                                            </span>
                                        </div>

                                        <div className="flex-1 space-y-2 overflow-y-auto p-2">
                                            {columnOrders.map(
                                                (
                                                    order,
                                                    index,
                                                ) => (
                                                    <Draggable
                                                        draggableId={
                                                            order.id
                                                        }
                                                        index={
                                                            index
                                                        }
                                                        key={
                                                            order.id
                                                        }
                                                    >
                                                        {(
                                                            dragProvided,
                                                            dragSnapshot,
                                                        ) => (
                                                            <div
                                                                ref={
                                                                    dragProvided.innerRef
                                                                }
                                                                {...dragProvided.draggableProps}
                                                                {...dragProvided.dragHandleProps}
                                                                className={
                                                                    dragSnapshot.isDragging
                                                                        ? 'opacity-80'
                                                                        : ''
                                                                }
                                                            >
                                                                <OrderCard
                                                                    key={
                                                                        order.id
                                                                    }
                                                                    order={
                                                                        order
                                                                    }
                                                                    currency={currency}
                                                                    lateThresholdMinutes={
                                                                        LATE_THRESHOLD_MINUTES
                                                                    }
                                                                    onAdvance={(
                                                                        to,
                                                                    ) =>
                                                                        advance(
                                                                            order,
                                                                            to,
                                                                        )
                                                                    }
                                                                    onCancel={() =>
                                                                        advance(
                                                                            order,
                                                                            'CANCELLED',
                                                                        )
                                                                    }
                                                                    canServe={
                                                                        role !==
                                                                        'STAFF' ||
                                                                        assignments.some(
                                                                            (
                                                                                a,
                                                                            ) =>
                                                                                a.tableId ===
                                                                                (
                                                                                    order as any
                                                                                )
                                                                                    .tableId &&
                                                                                a.userId ===
                                                                                currentUserId,
                                                                        )
                                                                    }
                                                                />
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                ),
                                            )}

                                            {
                                                provided.placeholder
                                            }

                                            {columnOrders.length ===
                                                0 && (
                                                    <p className="p-3 text-center text-sm text-muted-soft">
                                                        No orders
                                                    </p>
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
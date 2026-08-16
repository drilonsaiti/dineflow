'use client';

import {use, useEffect, useState} from 'react';
import {
    DragDropContext,
    Draggable,
    Droppable,
    DropResult,
} from '@hello-pangea/dnd';
import {isAdjacentTransition} from '@/lib/order-transitions';
import {acquireSocket, joinVenueRoom} from '@/lib/socket';
import {
    useAdvanceOrderStatus,
    useFireCourse,
    useOrders,
    useOrderSocketSync,
} from '@/hooks/useOrders';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/Select';
import {Checkbox} from '@/components/ui/Checkbox';
import {TableRequestsPanel} from '@/components/TableRequestsPanel';
import {OrderCard} from '@/components/OrderCard';
import {useVenueCurrency} from '@/hooks/useVenueCurrency';
import {useAutoPrintTickets} from '@/hooks/useVenueBasics';
import {useMyMembership} from '@/hooks/useVenues';
import {useTableAssignments} from '@/hooks/useTableAssignments';
import {useCurrentUserId} from '@/hooks/useCurrentUser';
import {playNotificationSound} from '@/lib/notification-sound';

export interface StaffOrder {
    id: string;
    dailyNumber: number;
    tableId: string;
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
    customerLatitude: number | null;
    customerLongitude: number | null;
    locationFlagged: boolean;
    table: {label: string};
    firedCourseNumbers: number[];
    items: {
        id: string;
        quantity: number;
        note: string | null;
        menuItem: {name: string};
        modifiers: {
            modifierOption?: {name: string};
        }[];
        courseNumber: number;
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
    {status: 'RECEIVED', label: 'Received'},
    {status: 'VIEWED', label: 'Viewed'},
    {status: 'PREPARING', label: 'Preparing'},
    {status: 'READY', label: 'Ready'},
];

// Configurable "sitting too long" threshold.
const LATE_THRESHOLD_MINUTES = 10;

export default function StaffDashboardPage({
                                               params,
                                           }: {
    params: Promise<{venueId: string}>;
}) {
    const {venueId} = use(params);

    const [station, setStation] = useState<string>('');
    const [connected, setConnected] = useState(false);
    const [soundOn, setSoundOn] = useState(true);
    const [showAllColumns, setShowAllColumns] = useState(false);

    const {data: orders = [], refetch} = useOrders(
        venueId,
        station || undefined,
    );

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
    const autoPrint = useAutoPrintTickets(venueId);
    const {data: membership} = useMyMembership(venueId);
    const role = membership?.role ?? null;

    const {data: assignments = []} = useTableAssignments(venueId);
    const currentUserId = useCurrentUserId();

    const fireCourseMutation = useFireCourse(
        venueId,
        station || undefined,
    );

    useEffect(() => {
        const {socket, release} = acquireSocket();

        function handleConnect() {
            setConnected(true);
            joinVenueRoom(venueId, station || undefined);
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

            if (soundOn && order.status === 'READY') {
                const isOwnerOrManager = role !== 'STAFF';

                const claimedByMe = assignments.some(
                    (a) =>
                        a.tableId === order.tableId &&
                        a.userId === currentUserId,
                );

                if (isOwnerOrManager || claimedByMe) {
                    playNotificationSound('ready');
                }
            }
        }

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('order_created', handleOrderCreated);
        socket.on('order_updated', handleOrderUpdated);

        if (socket.connected) {
            handleConnect();
        }

        return () => {
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            socket.off('order_created', handleOrderCreated);
            socket.off('order_updated', handleOrderUpdated);
            release();
        };

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        venueId,
        station,
        soundOn,
        autoPrint,
        role,
        assignments,
        currentUserId,
    ]);

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

        if (!order) {
            return;
        }

        const toStatus =
            destination.droppableId as StaffOrder['status'];

        if (!isAdjacentTransition(order.status, toStatus)) {
            return;
        }

        advance(order, toStatus);
    }

    const visibleOrders = orders.filter((o) =>
        COLUMNS.some(
            (c) => c.status === o.status,
        ),
    );

    const isWaiter = role === 'STAFF';

    const visibleColumns =
        isWaiter && !showAllColumns
            ? COLUMNS.filter(
                (c) => c.status === 'READY',
            )
            : COLUMNS;

    return (
        <div className="flex h-screen flex-col bg-canvas text-ink dark:bg-surface-dark dark:text-white">
            <header className="flex flex-col gap-2 border-b border-hairline px-4 py-3 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center justify-between gap-3">
                    <h1 className="text-lg">
                        Order board
                    </h1>

                    {isWaiter && (
                        <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-ink dark:text-white sm:hidden">
                            <Checkbox
                                checked={showAllColumns}
                                onCheckedChange={(checked) =>
                                    setShowAllColumns(
                                        checked === true,
                                    )
                                }
                            />
                            All columns
                        </label>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm">
                    {isWaiter && (
                        <label className="hidden cursor-pointer select-none items-center gap-2 text-ink dark:text-white sm:flex">
                            <Checkbox
                                checked={showAllColumns}
                                onCheckedChange={(checked) =>
                                    setShowAllColumns(
                                        checked === true,
                                    )
                                }
                            />
                            Show all columns
                        </label>
                    )}

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
                        <SelectTrigger className="w-32 sm:w-36">
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
                        className="btn-secondary !min-h-[36px] !px-3 text-xs sm:!min-h-[44px] sm:!px-5 sm:text-sm"
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
                <div className="flex gap-2 overflow-x-auto border-b border-hairline px-4 py-2 dark:border-gray-800">
                    {assignments
                        .filter(
                            (a) =>
                                a.userId ===
                                currentUserId,
                        )
                        .map((a) => (
                            <span
                                key={a.tableId}
                                className="shrink-0 rounded-pill bg-surface-card px-3 py-1 text-xs font-medium text-ink dark:bg-surface-dark-elevated dark:text-white"
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
                            className="text-xs font-medium text-muted underline"
                        >
                            Claim a table →
                        </a>
                    )}
                </div>
            )}

            <div
                className="sr-only"
                id="dnd-instructions"
            >
                Press space bar to lift an order card,
                use arrow keys to move it between
                columns, and press space bar again to
                drop it. Press escape to cancel.
            </div>

            <DragDropContext
                onDragEnd={handleDragEnd}
            >
                <div
                    className="flex flex-1 snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-hidden p-3 sm:grid sm:snap-none sm:overflow-x-visible"
                    style={{
                        gridTemplateColumns: `repeat(${visibleColumns.length}, minmax(0, 1fr))`,
                    }}
                >
                    {visibleColumns.map((col) => {
                        const columnOrders =
                            visibleOrders
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
                                droppableId={
                                    col.status
                                }
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
                                        className={`flex w-[85vw] shrink-0 snap-center flex-col overflow-hidden rounded-lg bg-surface-card dark:bg-surface-dark-elevated sm:w-auto sm:shrink ${
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
                                                {
                                                    columnOrders.length
                                                }
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
                                                                aria-describedby="dnd-instructions"
                                                                className={`focus-visible:ring-2 focus-visible:ring-brand ${
                                                                    dragSnapshot.isDragging
                                                                        ? 'opacity-80'
                                                                        : ''
                                                                }`}
                                                            >
                                                                <OrderCard
                                                                    key={
                                                                        order.id
                                                                    }
                                                                    order={
                                                                        order
                                                                    }
                                                                    currency={
                                                                        currency
                                                                    }
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
                                                                                order.tableId &&
                                                                                a.userId ===
                                                                                currentUserId,
                                                                        )
                                                                    }
                                                                    onFireCourse={(
                                                                        course,
                                                                    ) =>
                                                                        fireCourseMutation.mutate(
                                                                            {
                                                                                orderId:
                                                                                order.id,
                                                                                courseNumber:
                                                                                course,
                                                                            },
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
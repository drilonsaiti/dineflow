export const NEXT: Record<string, string | null> = {
    RECEIVED: 'VIEWED',
    VIEWED: 'PREPARING',
    PREPARING: 'READY',
    READY: 'SERVED',
};
export const PREV: Record<string, string | null> = {
    VIEWED: 'RECEIVED',
    PREPARING: 'VIEWED',
    READY: 'PREPARING',
};

/** A drag can only land one column forward or one column back — mirrors the
 * backend's order-status.machine.ts. Anything else (dragging RECEIVED
 * straight to READY) is silently rejected rather than sent to the API,
 * since the server would reject it anyway. */
export function isAdjacentTransition(from: string, to: string): boolean {
    return NEXT[from] === to || PREV[from] === to;
}
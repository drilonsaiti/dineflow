import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './supabase';

let socket: Socket | null = null;

export function getSocket(): Socket {
    if (!socket) {
        socket = io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
            autoConnect: false,
            // Reconnects automatically with backoff by default — the piece that
            // still needs explicit handling (section 18: "connection drops
            // mid-shift, dashboard should recover cleanly") is re-joining the
            // venue room and re-syncing state on 'connect', which the dashboard
            // page does via the 'connect' listener below.
        });
    }
    return socket;
}

/** Joins (or re-joins) a venue's real-time room with a fresh token — call
 * this both on initial connect and on every reconnect, since a stale
 * membership check should never be trusted after a dropped connection. */
export async function joinVenueRoom(venueId: string, station?: string) {
    const token = await getAccessToken();
    if (!token) return;
    getSocket().emit('join_venue', { token, venueId, station });
}
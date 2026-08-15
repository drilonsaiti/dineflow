import {io, Socket} from 'socket.io-client';
import {getAccessToken} from './supabase';

let socket: Socket | null = null;
let activeConsumers = 0; // how many mounted components currently want this socket alive

export function getSocket(): Socket {
    if (!socket) {
        socket = io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
            autoConnect: false,
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
    getSocket().emit('join_venue', {token, venueId, station});
}

/**
 * Reference-counted connect/disconnect: multiple components on the same
 * page (dashboard + TableRequestsPanel, for instance) can each "want" the
 * socket without fighting over who connects/disconnects it. Call
 * acquireSocket() in a useEffect on mount, and the returned release()
 * function in that effect's cleanup — the underlying connection only
 * actually disconnects once the last consumer releases it, and only ever
 * connects once regardless of how many consumers are mounted.
 */
export function acquireSocket(): { socket: Socket; release: () => void } {
    const s = getSocket();
    activeConsumers += 1;
    if (!s.connected) s.connect();

    let released = false;
    return {
        socket: s,
        release: () => {
            if (released) return; // guards against a double-invoked cleanup (React StrictMode double-mount in dev)
            released = true;
            activeConsumers = Math.max(0, activeConsumers - 1);
            if (activeConsumers === 0) {
                s.disconnect();
            }
        },
    };
}
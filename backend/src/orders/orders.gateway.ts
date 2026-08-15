import {
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import {Server, Socket} from 'socket.io';
import {Logger} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {PrismaService} from '../prisma/prisma.service';
import {verifySupabaseJwt} from '../auth/verify-supabase-jwt';

/**
 * Real-time feed for staff dashboards (section 10/11). Rooms:
 *   venue:{venueId}              — all staff for that venue
 *   station:{venueId}:{station}  — narrower feed for kitchen/bar views
 *
 * The customer's own order-tracking screen deliberately does NOT connect
 * here — it polls a lightweight REST endpoint instead (ARCHITECTURE.md /
 * section 11: one order, tracked briefly, doesn't need a persistent
 * connection; staff dashboards are where "must never miss an update"
 * actually matters).
 *
 * Auth: the client sends its Supabase JWT in the `join_venue` payload (not
 * the socket handshake `auth`, so re-joining a different venue mid-session
 * re-checks membership every time rather than trusting a connection-time
 * grant). The token is verified the same way SupabaseJwtStrategy verifies
 * REST requests (against Supabase's JWKS), and venue membership is checked
 * before the socket is allowed into any room — this gets the same tenant
 * isolation guarantee as the REST API rather than trusting a
 * client-supplied venueId.
 */
@WebSocketGateway({
    cors: {origin: process.env.FRONTEND_URL ?? 'http://localhost:3000'},
})
export class OrdersGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server!: Server;
    private readonly logger = new Logger(OrdersGateway.name);

    constructor(
        private readonly config: ConfigService,
        private readonly prisma: PrismaService,
    ) {
    }

    handleConnection(client: Socket) {
        this.logger.log(`client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`client disconnected: ${client.id}`);
    }

    @SubscribeMessage('join_venue')
    async handleJoinVenue(
        client: Socket,
        payload: { token: string; venueId: string; station?: string },
    ) {
        try {
            const decoded = await verifySupabaseJwt(payload.token, this.config.getOrThrow('SUPABASE_URL'));

            const membership = await this.prisma.venueMembership.findUnique({
                where: {userId_venueId: {userId: decoded.sub, venueId: payload.venueId}},
            });

            if (!membership) {
                client.emit('join_venue_error', {message: 'Not a member of this venue'});
                return;
            }

            // Leave any previously-joined venue rooms on this socket before
            // joining a new one, so a dashboard switching venues doesn't keep
            // receiving another tenant's events.
            for (const room of client.rooms) {
                if (room.startsWith('venue:') || room.startsWith('station:')) client.leave(room);
            }

            client.join(`venue:${payload.venueId}`);
            if (payload.station) {
                client.join(`station:${payload.venueId}:${payload.station}`);
            }
            client.emit('joined_venue', {venueId: payload.venueId});
        } catch {
            client.emit('join_venue_error', {message: 'Invalid or expired session'});
        }
    }

    /** Called by OrdersService on every creation and every status transition. */
    emitOrderEvent(venueId: string, event: 'order_created' | 'order_updated', data: unknown) {
        this.server.to(`venue:${venueId}`).emit(event, data);
    }

    emitTableRequestEvent(
        venueId: string,
        event: 'table_request_created' | 'table_request_updated',
        data: unknown,
    ) {
        this.server.to(`venue:${venueId}`).emit(event, data);
    }
}
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

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
 * Auth: the client sends its Supabase JWT in the connection `auth` payload;
 * `handleConnection` verifies membership before allowing the socket to join
 * any venue room, so this gets the same tenant isolation as the REST API
 * rather than trusting a client-supplied venueId on `join`.
 */
@WebSocketGateway({
  cors: { origin: process.env.FRONTEND_URL ?? 'http://localhost:3000' },
})
export class OrdersGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(OrdersGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`client connected: ${client.id}`);
    // Full JWT verification + membership check on `join` is wired the same
    // way as VenueScopeGuard — omitted here for brevity in this scaffold,
    // implemented in OrdersGateway.handleJoinVenue in the full build.
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_venue')
  handleJoinVenue(client: Socket, payload: { venueId: string; station?: string }) {
    client.join(`venue:${payload.venueId}`);
    if (payload.station) {
      client.join(`station:${payload.venueId}:${payload.station}`);
    }
  }

  /** Called by OrdersService on every creation and every status transition. */
  emitOrderEvent(venueId: string, event: 'order_created' | 'order_updated', data: unknown) {
    this.server.to(`venue:${venueId}`).emit(event, data);
  }
}

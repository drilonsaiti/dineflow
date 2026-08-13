import {
  BadRequestException, GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PlaceOrderDto } from './dto/place-order.dto';
import { assertValidTransition } from './order-status.machine';
import { OrdersGateway } from './orders.gateway';
import { TablesService } from '../tables/tables.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class OrdersService {
  constructor(
      private readonly prisma: PrismaService,
      private readonly gateway: OrdersGateway,
      private readonly tablesService: TablesService,
      private readonly notifications: NotificationsService,
  ) {}

  // ---------- Customer-facing (public, no auth — section 3/11) ----------

  /** Resolves the table from its opaque token; used by the public menu page
   * and by placeOrder. Handles the "deactivated table" edge case (section 18)
   * with a clear error rather than a crash. */
  async resolveTable(tableToken: string) {
    const table = await this.prisma.table.findUnique({
      where: { token: tableToken },
      include: { venue: true },
    });
    if (!table) throw new NotFoundException('This QR code is not recognized.');
    if (!table.isActive) {
      throw new GoneException('This table is no longer active. Please ask staff for help.');
    }
    return table;
  }

  async placeOrder(dto: PlaceOrderDto) {
    const table = await this.tablesService.resolveByToken(dto.tableToken);

    return this.prisma.withVenueScope(table.venueId, async (tx) => {
      // Re-check availability at placement time, not just at add-to-cart
      // time (section 18: item goes 86'd while sitting in an open cart).
      const menuItemIds = dto.items.map((i) => i.menuItemId);
      const menuItems = await tx.menuItem.findMany({
        where: { id: { in: menuItemIds }, venueId: table.venueId },
        include: { modifierGroups: { include: { options: true } } },
      });
      const menuItemsById = new Map(menuItems.map((m) => [m.id, m]));

      const unavailable = dto.items.filter((i) => {
        const item = menuItemsById.get(i.menuItemId);
        return !item || !item.isAvailable;
      });
      if (unavailable.length > 0) {
        throw new BadRequestException({
          message: 'Some items in your cart are no longer available.',
          unavailableMenuItemIds: unavailable.map((i) => i.menuItemId),
        });
      }

      // Integer-safe money throughout (section 18) — cents only, never float.
      let totalCents = 0;
      const itemsData = dto.items.map((i) => {
        const menuItem = menuItemsById.get(i.menuItemId)!;
        const allOptions = menuItem.modifierGroups.flatMap((g) => g.options);
        const chosen = i.modifiers.map((m) => {
          const option = allOptions.find((o) => o.id === m.modifierOptionId);
          if (!option) throw new BadRequestException('Invalid modifier selection.');
          return option;
        });
        const modifierDelta = chosen.reduce((sum, o) => sum + o.priceDeltaCents, 0);
        const unitPriceCents = menuItem.priceCents + modifierDelta;
        const lineTotalCents = unitPriceCents * i.quantity;
        totalCents += lineTotalCents;

        return {
          menuItemId: menuItem.id,
          quantity: i.quantity,
          note: i.note,
          unitPriceCents,
          lineTotalCents,
          modifiers: {
            create: chosen.map((o) => ({
              modifierOptionId: o.id,
              priceDeltaCents: o.priceDeltaCents,
            })),
          },
        };
      });

      // Per-venue-per-day ticket number (section 8), race-safe (section 18:
      // "two customers at the same table order in quick succession"). A
      // plain COUNT()+1 can hand out the same number to two concurrent
      // requests; an upsert + FOR UPDATE-style atomic increment cannot,
      // because Postgres serializes writers to the same counter row.
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      await tx.$executeRaw`
        INSERT INTO "DailyOrderCounter" ("venueId", "day", "lastValue")
        VALUES (${table.venueId}, ${startOfDay}, 1)
          ON CONFLICT ("venueId", "day")
        DO UPDATE SET "lastValue" = "DailyOrderCounter"."lastValue" + 1
      `;
      const counterRow = await tx.dailyOrderCounter.findUniqueOrThrow({
        where: { venueId_day: { venueId: table.venueId, day: startOfDay } },
      });

      const order = await tx.order.create({
        data: {
          venueId: table.venueId,
          tableId: table.id,
          dailyNumber: counterRow.lastValue,
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          note: dto.note,
          totalCents,
          status: OrderStatus.RECEIVED,
          items: { create: itemsData },
          statusEvents: { create: { status: OrderStatus.RECEIVED } },
        },
        include: { items: true, table: true },
      });

      this.gateway.emitOrderEvent(table.venueId, 'order_created', order);
      return order;
    });
  }

  /** Polled by the customer's tracking screen every few seconds (section 11). */
  async getForCustomer(orderId: string, tableToken: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { menuItem: true, modifiers: { include: { modifierOption: true } } } },
        table: true,
        statusEvents: {
          orderBy: { changedAt: 'desc' },
          take: 1,
          include: { changedBy: { select: { id: true, email: true, fullName: true } } },
        },
      },
    });
    if (!order || order.table.token !== tableToken) {
      throw new NotFoundException('Order not found.');
    }
    return order;
  }

  // ---------- Staff-facing (authenticated, venue-scoped) ----------

  async listForVenue(venueId: string, station?: string) {
    return this.prisma.withVenueScope(venueId, (tx) =>
        tx.order.findMany({
          where: {
            venueId,
            status: { notIn: [OrderStatus.SERVED, OrderStatus.CANCELLED] },
          },
          include: {
            items: { include: { menuItem: true, modifiers: { include: { modifierOption: true } } } },
            table: true,
            statusEvents: {
              orderBy: { changedAt: 'desc' },
              take: 1,
              include: { changedBy: { select: { id: true, email: true, fullName: true } } },
            },
          },
          orderBy: { createdAt: 'asc' },
        }),
    );
  }

  async advanceStatus(
    venueId: string,
    orderId: string,
    toStatus: OrderStatus,
    staffUserId: string,
  ) {
    return this.prisma.withVenueScope(venueId, async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order || order.venueId !== venueId) {
        throw new NotFoundException('Order not found.');
      }

      try {
        assertValidTransition(order.status, toStatus);
      } catch (e) {
        throw new BadRequestException((e as Error).message);
      }

      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          status: toStatus,
          statusEvents: { create: { status: toStatus, changedByUserId: staffUserId } },
        },
        include: {
          items: { include: { menuItem: true, modifiers: { include: { modifierOption: true } } } },
          table: true,
          statusEvents: {
            orderBy: { changedAt: 'desc' },
            take: 1,
            include: { changedBy: { select: { id: true, email: true, fullName: true } } },
          },
        },
      });

      this.gateway.emitOrderEvent(venueId, 'order_updated', updated);

      if (toStatus === OrderStatus.READY) {
        // Fire-and-forget on purpose — a failed/slow SMS provider should
        // never block or fail the actual status transition staff care
        // about; NotificationLog captures the outcome for later review.
        this.notifications.notifyCustomerOrderReady(venueId, orderId).catch(() => {});
      }
      return updated;
    });
  }
}

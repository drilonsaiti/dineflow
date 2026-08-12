import { OrderStatus } from '@prisma/client';

/**
 * The one place transition rules live (ARCHITECTURE.md section 3).
 * Decision: sequential only, one step forward or one step back, plus
 * CANCELLED reachable only early. No skipping — see ARCHITECTURE.md for why.
 */
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  RECEIVED: ['VIEWED', 'CANCELLED'],
  VIEWED: ['RECEIVED', 'PREPARING', 'CANCELLED'],
  PREPARING: ['VIEWED', 'READY'],
  READY: ['PREPARING', 'SERVED'],
  SERVED: [], // terminal
  CANCELLED: [], // terminal
};

export function isValidTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertValidTransition(from: OrderStatus, to: OrderStatus): void {
  if (!isValidTransition(from, to)) {
    throw new Error(`Invalid order status transition: ${from} -> ${to}`);
  }
}

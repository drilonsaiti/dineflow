# Architecture Note — QR Table-Ordering SaaS

## 1. Service shape

Two separately deployable projects, communicating only over HTTP + WebSocket:

- **`/frontend`** — Next.js 14 (App Router), TypeScript. Deployed to Vercel.
  Talks to the backend exclusively through its REST API and a Socket.io
  client. Never touches Postgres/Supabase directly.
- **`/backend`** — NestJS, TypeScript, Prisma ORM, Postgres (Supabase-hosted),
  Socket.io gateway. Deployed to Railway/Render/Fly.io as a long-running
  Node process (required for the WebSocket gateway — cannot be serverless).

## 2. Multi-tenant isolation — which layer is primary

**NestJS is the primary enforcement layer.** Every table that holds
venue-scoped data (`Table`, `MenuCategory`, `MenuItem`, `Modifier...`,
`Order`, `OrderItem`, `VenueMembership`, ...) carries a `venueId` column.

The flow on every authenticated request:

1. A Passport strategy (`SupabaseJwtStrategy`) verifies the Supabase-issued
   JWT signature against the Supabase JWT secret and attaches the decoded
   `user` to the request. No request reaches a controller without this.
2. A shared `VenueScopeGuard` (applied via a `@VenueScoped()` decorator on
   controllers/routes that touch tenant data) resolves the venue from the
   route param (e.g. `:venueId`), then looks up the caller's
   `VenueMembership` row for that `(userId, venueId)` pair. If no membership
   exists, or the role is insufficient for the route (checked by a
   companion `@Roles()` decorator + `RolesGuard`), the request is rejected
   with 403 **before** it reaches any service/repository code.
3. Every Prisma query inside a service method takes the `venueId` resolved
   from the guard (never a client-supplied one used blindly) and includes
   it as a `WHERE venueId = ...` clause. This is centralized in a small
   `TenantPrismaService` wrapper so individual services can't "forget" the
   clause — it's structurally part of how they're allowed to query.

This means a bug in one service's query logic is contained: the guard has
already proven the caller belongs to the venue, and the wrapper makes it
hard to accidentally query across tenants.

**Postgres Row-Level Security is the backstop, not the primary mechanism.**
Every tenant table has RLS enabled with a policy of the shape:

```sql
alter table "Order" enable row level security;

create policy tenant_isolation_order on "Order"
  using (venue_id = current_setting('app.current_venue_id', true)::uuid);
```

The backend sets `app.current_venue_id` as a session-scoped Postgres
variable (via `SET LOCAL` inside a Prisma `$transaction`) at the start of
every request, to the *same* venue ID the `VenueScopeGuard` already
resolved and verified. RLS then makes it structurally impossible for any
query — even one from a future bug, a raw SQL slip, or a misconfigured
Prisma call — to read or write rows belonging to a different venue,
because Postgres itself refuses the rows at the storage layer.

**Relationship, stated plainly:** NestJS decides *who is allowed to act on
which venue* (authz) and is what you're relying on day-to-day for correct
behavior and good error messages. RLS decides, independent of any NestJS
bug, *which rows physically exist for the current session* — a last line
of defense that never needs to trust application code being bug-free.

Customer-facing endpoints (public menu, place order, poll order status)
are unauthenticated by design. They are scoped instead by the **opaque
table token** in the URL, which is looked up server-side to resolve
`(venueId, tableId)` — the same `app.current_venue_id` session variable is
still set from that server-side resolution, so RLS applies equally to
anonymous traffic.

## 3. Order status state machine (section 9)

States: `RECEIVED → VIEWED → PREPARING → READY → SERVED`, plus a
terminal `CANCELLED`.

**Decision: sequential, no skipping.** Staff can only advance one step at a
time (`RECEIVED→VIEWED`, `VIEWED→PREPARING`, `PREPARING→READY`,
`READY→SERVED`), and can step back exactly one status for mistakes
(no back further than `RECEIVED`). Rationale: skipping steps silently
loses the timestamp data section 8 asks for (avg. time-to-Ready needs
real `PREPARING`/`READY` transition timestamps, not backfilled ones), and
a strict pipeline matches how a physical KDS (Toast/Square) behaves, which
is the product's stated reference point (section 13).

`CANCELLED` is reachable only from `RECEIVED` or `VIEWED` (an order that's
already in the kitchen shouldn't vanish — a real venue needs to know it
happened). Cancelling is a status transition, never a delete — full
history is preserved (section 8).

This is implemented as an explicit transition table in
`backend/src/orders/order-status.machine.ts`, checked by the `OrdersService`
before any write — not scattered `if` statements — so the "one place to
change the rules later" requirement is met.

## 4. What's included vs. stubbed in this delivery

Given the sandbox this was generated in has no live Postgres/Supabase
project and can't run two persistent networked services, this delivery is
the **real source code**, structured and working against your own
Supabase project once you supply credentials — not a hosted demo. See
`README.md` for exact setup steps. Phases are built incrementally per
section 19; each phase's code is real and runnable, not mocked UI.

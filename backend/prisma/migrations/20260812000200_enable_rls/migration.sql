-- Row-Level Security backstop (ARCHITECTURE.md section 2).
-- This is NOT the primary enforcement mechanism — NestJS's VenueScopeGuard
-- + PrismaService.withVenueScope() is. This makes cross-tenant reads/writes
-- structurally impossible even if an application-layer query forgets its
-- own venueId filter.
--
-- Run this after `prisma migrate deploy` has created the base tables
-- (Prisma's own migration diffing doesn't manage RLS policies well, so it's
-- kept as a standalone, idempotent migration rather than in schema.prisma).

alter table "Venue" enable row level security;
alter table "MenuCategory" enable row level security;
alter table "MenuItem" enable row level security;
alter table "Tag" enable row level security;
alter table "Area" enable row level security;
alter table "Table" enable row level security;
alter table "Order" enable row level security;
alter table "OrderItem" enable row level security;
alter table "VenueMembership" enable row level security;

-- Every tenant table checks the session variable set by
-- PrismaService.withVenueScope() via `SET LOCAL app.current_venue_id`.
-- The `true` argument to current_setting means "return null instead of
-- erroring if unset" — a query that forgets to set the scope simply sees
-- zero rows rather than crashing, which is the safe failure direction.

create policy tenant_isolation_venue on "Venue"
  using (id = current_setting('app.current_venue_id', true)::uuid);

create policy tenant_isolation_menu_category on "MenuCategory"
  using ("venueId" = current_setting('app.current_venue_id', true)::uuid);

create policy tenant_isolation_menu_item on "MenuItem"
  using ("venueId" = current_setting('app.current_venue_id', true)::uuid);

create policy tenant_isolation_tag on "Tag"
  using ("venueId" = current_setting('app.current_venue_id', true)::uuid);

create policy tenant_isolation_area on "Area"
  using ("venueId" = current_setting('app.current_venue_id', true)::uuid);

create policy tenant_isolation_table on "Table"
  using ("venueId" = current_setting('app.current_venue_id', true)::uuid);

create policy tenant_isolation_order on "Order"
  using ("venueId" = current_setting('app.current_venue_id', true)::uuid);

-- OrderItem has no venueId column directly — scope via its parent Order.
create policy tenant_isolation_order_item on "OrderItem"
  using (
    exists (
      select 1 from "Order" o
      where o.id = "OrderItem"."orderId"
        and o."venueId" = current_setting('app.current_venue_id', true)::uuid
    )
  );

create policy tenant_isolation_membership on "VenueMembership"
  using ("venueId" = current_setting('app.current_venue_id', true)::uuid);

-- NOTE: venue creation (VenuesService.create) and the public customer flow
-- (table token resolution, order placement before the venue scope is known)
-- necessarily run some queries before app.current_venue_id can be set to the
-- "final" value. Those specific queries run under the Prisma service role
-- (bypassing RLS by design, the same way a migration tool would) — this is
-- documented here so it's never mistaken for an oversight.

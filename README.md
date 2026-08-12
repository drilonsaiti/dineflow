# QR Table-Ordering SaaS

Multi-tenant SaaS for restaurants/cafés/bars: owners manage venue + menu +
tables, customers order by scanning a per-table QR code (no login), staff
work orders through a live status pipeline. Full spec context in this
repo's originating brief; architecture decisions are in `ARCHITECTURE.md`
(read that first — it explains the two-layer tenant isolation model and the
order status state machine).

## Two services, deployed separately

- `backend/` — NestJS + Prisma + Postgres (Supabase-hosted) + Socket.io.
  Deploy to Railway/Render/Fly.io (needs a persistent process for the
  WebSocket gateway — not serverless).
- `frontend/` — Next.js App Router. Deploy to Vercel. Talks to `backend`
  only over REST + Socket.io, never touches Postgres directly.

## Setup

1. Create a Supabase project. Enable email/magic-link auth (Auth ->
   Providers). Create a Storage bucket for menu photos.
2. `cd backend && cp .env.example .env` and fill in your Supabase
   connection string, JWT secret, and service role key.
3. `npm install`
4. `npx prisma migrate deploy` — applies `prisma/schema.prisma`, then
   applies the RLS backstop in
   `prisma/migrations/00000000000000_enable_rls/migration.sql`.
5. `npm run start:dev` — API on `:4000`.
6. `cd ../frontend && cp .env.example .env.local`, fill in your Supabase
   URL/anon key, `npm install`, `npm run dev` — app on `:3000`.

## What's built vs. what's next

This delivery covers **Phase 1 (foundation)** in full, plus the two pieces
of structural plumbing (order status machine, Socket.io gateway skeleton)
that everything later plugs into, so the shape doesn't need revisiting:

- ✅ Multi-tenant data model (`prisma/schema.prisma`) — every table, every
  relation from the spec (venues, memberships, menu/modifiers/tags, tables,
  orders/items/modifiers, status events, plan/billing fields)
- ✅ Supabase JWT verification (`SupabaseJwtStrategy`) gating every request
  by default (`JwtAuthGuard`), with `@Public()` for the customer flow
- ✅ `VenueScopeGuard` + `PrismaService.withVenueScope()` — the shared,
  centralized tenant-isolation mechanism (not copy-pasted per endpoint)
- ✅ RLS backstop policies (`migration.sql`)
- ✅ Venue creation/onboarding entry point (`VenuesModule`)
- ✅ Order status state machine (`order-status.machine.ts`) and the full
  order lifecycle: public `placeOrder` (with the unavailable-item and
  deactivated-table edge cases from section 18 handled explicitly),
  customer polling endpoint, staff `advanceStatus`, Socket.io push on every
  creation/transition (`OrdersGateway`)

**Not yet built — next phases, per section 19's own ordering:**

- Phase 2 — Menu management endpoints + owner admin UI (categories, items,
  modifier groups, availability toggle, drag-and-drop ordering)
- Phase 3 — Tables & QR: `TablesModule` (create/deactivate/regenerate
  token), QR generation (`qrcode` package is already in `package.json`),
  bulk download/print sheet
- Phase 4 — Customer-facing Next.js screens: landing, menu browse, item
  detail w/ modifiers, cart, checkout, order tracking (polling against the
  endpoints already built)
- Phase 5 — Staff dashboard UI: Kanban board, station filtering, tablet
  layout, sound/visual new-order alert, socket reconnect/resync handling
- Phase 6 — Owner analytics endpoints + dashboard (the `OrderStatusEvent`
  table already captures the timestamps this needs)
- Phase 7 — Polish: accessibility, loading/error states, dark mode,
  Supabase Storage wiring for photo/logo upload, deployment configs

Say the word and I'll keep going phase by phase — each one will build on
what's here rather than restructuring it.

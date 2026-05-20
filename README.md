# storage-units

Forkable single-tenant storage facility booking + management. Each client
gets their own Railway project, Supabase instance, provider accounts, and
domain. No shared infrastructure between clients.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind
- Supabase (Postgres + Auth + RLS)
- Stripe / Twilio / Resend behind provider interfaces (mock by default)
- Railway hosting (app + cron)

## Local setup

1. `cp .env.example .env` and fill in Supabase credentials. Leave provider
   modes at `mock`.
2. Create the schema:
   - In Supabase SQL editor, run each file in `supabase/migrations/` in
     timestamp order.
3. Seed:
   - `npm install`
   - `npm run seed` (defaults to `seeds/chandler.ts`)
4. `npm run dev` and open http://localhost:3000.

## End-to-end booking (mock providers)

1. Visit `/{facility-slug}` (e.g. `/allseasons`).
2. Pick a unit, enter an email, click Reserve.
3. Mock checkout page renders. Click **Pay (mock)**.
4. The mock provider POSTs a synthesized `checkout.session.completed`
   event to `/api/webhooks/payment`. The unit moves to `occupied`, a
   lease is created, and a confirmation email is logged.
5. Inspect everything at `/admin/debug` (mock activity + provider_events).

## Deploying a new client

1. Create a new Railway project from this repo.
2. Create a new Supabase project. Run all migrations.
3. Add a new `seeds/<client>.ts`. Set `SEED=<client>` and run
   `npm run seed`.
4. Configure env vars; keep all providers in `mock` mode.
5. Deploy to a staging domain.
6. Client validates the flow.
7. Flip individual providers to real (Stripe, Twilio, Resend).
8. Cut over to production domain.

No code changes. The schema is identical across deployments; only env
vars and the seed file differ.

## Provider abstraction

`lib/providers/` exports `paymentProvider()`, `smsProvider()`,
`emailProvider()`. Each is selected by env var (`PAYMENT_PROVIDER`,
`SMS_PROVIDER`, `EMAIL_PROVIDER`). Real adapters under
`payment-stripe.ts`, `sms-twilio.ts`, `email-resend.ts` are stubs to be
implemented at Phase 6 cutover.

## Webhook idempotency

`provider_events` is the dedup ledger. Every inbound event is recorded
by `(provider, event_id)` before its handler runs; a unique-violation
means we've seen the event before and the handler skips. Each handler
is also written to be safe against repeated application as a second
defense.

## Unit locking

`lib/locking.ts` implements per-unit locks via a single conditional
`UPDATE` against `units(locked_until, locked_by_session_id)`. The CHECK
constraint `units_lock_pair_chk` keeps the two columns moving as a pair.
`/api/cron/expire-locks` (or the `cron:expire-locks` script) clears
stale locks; the availability query also treats expired locks as free.

## Admin dashboard

1. `/admin/login` — sign in with the credentials seeded via
   `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` (see `.env.example`).
2. The middleware gates everything under `/admin` and the layout
   validates the manager has `facility_access` for the requested slug.
3. Pages:
   - `/admin/{slug}` — occupancy / past-due / 30d revenue cards
   - `/admin/{slug}/units` — grid + force-status
   - `/admin/{slug}/tenants` — search, filter, drill-down
   - `/admin/{slug}/tenants/{id}` — leases, payments, dunning, audit,
     and a panel for waive / credit / refund / note / end-lease
   - `/admin/{slug}/settings/sms-templates` — editable dunning copy
   - `/admin/{slug}/statements` — owner statements list + PDF download
   - `/admin/debug` — mock activity, provider events, dev tools

## Dunning

- Daily cron: `/api/cron/dunning` or `npm run cron:dunning`
- Schedule (days past due): 3, 5, 7, 10, 14
- Templates editable per facility in admin; variables `{first_name}`,
  `{facility_name}`, `{portal_url}`
- `dunning_log` enforces one send per (lease, template_key); reruns are
  idempotent
- Inbound STOP keywords land at `/api/sms/inbound` and write
  `sms_opt_outs`. Future sends to that phone are suppressed
- Auto-pause: `invoice.paid` clears `past_due_since` and flips the lease
  to active; dunning cron filters past_due only

## Owner statements

- Monthly cron: `/api/cron/owner-statements` or `npm run cron:owner-statements`
- Generated for the previous calendar month, idempotent on
  `(facility_id, period_start, period_end)`
- Snapshot frozen in `owner_statements.snapshot_json` so the PDF stays
  reproducible
- Emails to all managers with `facility_access` for that facility
- Manual: click "Generate last month" on
  `/admin/{slug}/statements`

## Phase status

- [x] Phase 0 — Provider abstractions, scaffolding, seed system
- [x] Phase 1 — Booking + payment flow (mock providers, end-to-end)
- [x] Phase 2 — Admin dashboard
- [x] Phase 3 — Dunning
- [x] Phase 4 — Owner statements
- [ ] Phase 5 — Tenant migration (deferred to v1.1)
- [ ] Phase 6 — Real provider cutover (Stripe/Twilio/Resend stubs land here)

## Testing the full flow end-to-end (mock providers)

1. Run all three SQL migrations in your Supabase project.
2. Set `SEED_ADMIN_EMAIL` + `SEED_ADMIN_PASSWORD` in `.env`,
   then `npm run seed`. Note the URL: http://localhost:3000.
3. `npm run dev`.
4. Book a unit: `/allseasons` → Reserve → mock checkout → Pay.
5. Sign in at `/admin/login` with the seeded credentials.
6. Look at the dashboard, units grid, and the new tenant's drill-down.
7. Copy the lease's `provider_subscription_id` (visible on the tenant
   page) into `/admin/debug` and:
   - Click **invoice.payment_failed** to flip the lease past_due.
   - Click **Backdate past_due** with `daysAgo=5`.
   - Click **Run dunning** and watch the SMS show up in the mock log.
   - Click **invoice.paid** and confirm the lease auto-pauses.
8. Go to `/admin/{slug}/statements`, click **Generate last month**,
   then download the PDF.

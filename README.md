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

## Phase status

- [x] Phase 0 — Provider abstractions, scaffolding, seed system
- [x] Phase 1 — Booking + payment flow (mock providers, end-to-end)
- [ ] Phase 2 — Admin dashboard
- [ ] Phase 3 — Dunning
- [ ] Phase 4 — Owner statements
- [ ] Phase 5 — Tenant migration (deferred to v1.1)
- [ ] Phase 6 — Real provider cutover (Stripe/Twilio/Resend stubs land here)

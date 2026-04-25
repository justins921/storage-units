-- Phase 0 scaffolding: unit pricing, idempotency, audit log.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- unit_types: per-facility pricing tiers. The customer-facing landing page
-- groups available units by type and shows the type's monthly rate.
-- ---------------------------------------------------------------------------

create table unit_types (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references facilities(id) on delete cascade,
  name text not null,
  width_ft int,
  length_ft int,
  features text[] not null default '{}'::text[],
  monthly_rate_cents int not null check (monthly_rate_cents >= 0),
  description text,
  created_at timestamptz not null default now(),
  unique (facility_id, name)
);

alter table units
  add column unit_type_id uuid references unit_types(id) on delete restrict,
  add column monthly_rate_cents int not null default 0;

alter table leases
  add column monthly_rate_cents int not null default 0,
  add column provider_customer_id text;

alter table tenants
  add column display_name text;

-- ---------------------------------------------------------------------------
-- provider_events: idempotency table for inbound webhooks. The handler
-- inserts (provider, event_id) before processing; a duplicate insert raises
-- a unique-violation and the handler treats the event as already-seen.
-- ---------------------------------------------------------------------------

create table provider_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  event_type text not null,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error text,
  unique (provider, event_id)
);

-- ---------------------------------------------------------------------------
-- audit_log: every manual admin action (waive, credit, refund, force status,
-- add note) writes a row here. Phase 2 reads from this for the audit trail.
-- ---------------------------------------------------------------------------

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid references facilities(id) on delete set null,
  actor_manager_id uuid references managers(id) on delete set null,
  action text not null,
  target_table text,
  target_id uuid,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS
--
-- provider_events has RLS enabled with no policies, which makes it
-- service-role-only. Webhook handlers use the service role; no client ever
-- reads or writes this table directly.
-- ---------------------------------------------------------------------------

alter table unit_types      enable row level security;
alter table provider_events enable row level security;
alter table audit_log       enable row level security;

create policy unit_types_facility_scoped on unit_types
  for all
  using (facility_id = any (auth_manager_facility_access()))
  with check (facility_id = any (auth_manager_facility_access()));

create policy audit_log_facility_scoped on audit_log
  for all
  using (
    facility_id is null
    or facility_id = any (auth_manager_facility_access())
  )
  with check (facility_id = any (auth_manager_facility_access()));

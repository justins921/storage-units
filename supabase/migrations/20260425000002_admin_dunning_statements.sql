-- Phase 2-4: admin actions, payments ledger, dunning, owner statements.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- payments: durable ledger of every money movement, regardless of cause.
-- The webhook handler writes 'charge' rows on invoice.paid; admin actions
-- write 'waive', 'credit', and 'refund' rows.
-- ---------------------------------------------------------------------------

create table payments (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references facilities(id) on delete cascade,
  lease_id uuid not null references leases(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  amount_cents int not null,
  kind text not null check (kind in ('charge', 'refund', 'credit', 'waive')),
  provider_invoice_id text,
  provider_charge_id text,
  paid_at timestamptz not null default now(),
  notes text,
  actor_manager_id uuid references managers(id) on delete set null,
  created_at timestamptz not null default now()
);

-- One charge row per provider invoice. invoice.paid retries idempotently
-- collapse to the same row via this unique index.
create unique index payments_provider_invoice_id_uk
  on payments (provider_invoice_id)
  where provider_invoice_id is not null;

create index payments_facility_id_paid_at_idx on payments (facility_id, paid_at desc);
create index payments_lease_id_paid_at_idx on payments (lease_id, paid_at desc);

-- ---------------------------------------------------------------------------
-- legacy_balances: outstanding balance carried over from the prior system.
-- Owner statements separate this from current-platform outstanding so the
-- manager can distinguish "what we collected for you" from "what they
-- still owe from before".
-- ---------------------------------------------------------------------------

create table legacy_balances (
  tenant_id uuid primary key references tenants(id) on delete cascade,
  amount_cents int not null default 0,
  notes text,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Dunning: editable templates per facility, durable log of every send,
-- and a shared opt-out list keyed by phone number.
-- ---------------------------------------------------------------------------

create table sms_templates (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references facilities(id) on delete cascade,
  key text not null,
  body text not null,
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (facility_id, key)
);

create table dunning_log (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references facilities(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  lease_id uuid not null references leases(id) on delete cascade,
  template_key text not null,
  sent_at timestamptz not null default now(),
  sms_provider_id text,
  suppressed_reason text
);

-- A lease+template pair only sends once per dunning episode. The cron
-- relies on this to be idempotent across reruns.
create unique index dunning_log_lease_template_uk
  on dunning_log (lease_id, template_key)
  where suppressed_reason is null;

create index dunning_log_lease_id_sent_at_idx
  on dunning_log (lease_id, sent_at desc);

create table sms_opt_outs (
  phone text primary key,
  opted_out_at timestamptz not null default now(),
  source text
);

-- ---------------------------------------------------------------------------
-- Owner statements: per-facility, per-month payout summaries with a
-- frozen snapshot. snapshot_json holds the unit-level breakdown so the
-- PDF can be re-rendered without recomputing.
-- ---------------------------------------------------------------------------

create table owner_statements (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references facilities(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  generated_at timestamptz not null default now(),
  gross_cents int not null,
  refunds_cents int not null,
  credits_cents int not null,
  waives_cents int not null,
  outstanding_current_cents int not null,
  outstanding_legacy_cents int not null,
  unit_count int not null,
  vacant_count int not null,
  occupied_count int not null,
  occupancy_percent numeric(5,2) not null,
  net_payout_cents int not null,
  snapshot_json jsonb not null,
  emailed_at timestamptz,
  unique (facility_id, period_start, period_end)
);

-- ---------------------------------------------------------------------------
-- leases.past_due_since lets the dunning cron compute days-past-due
-- without scanning the provider_events table.
-- ---------------------------------------------------------------------------

alter table leases
  add column past_due_since timestamptz;

create index leases_facility_id_status_idx on leases (facility_id, status);
create index leases_provider_subscription_id_idx
  on leases (provider_subscription_id)
  where provider_subscription_id is not null;
create index units_facility_id_status_idx on units (facility_id, status);

-- ---------------------------------------------------------------------------
-- Tenants get a phone column for SMS dunning.
-- ---------------------------------------------------------------------------

-- (tenants.phone already exists in the initial schema; no change needed.)

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table payments         enable row level security;
alter table legacy_balances  enable row level security;
alter table sms_templates    enable row level security;
alter table dunning_log      enable row level security;
alter table sms_opt_outs     enable row level security;
alter table owner_statements enable row level security;

create policy payments_facility_scoped on payments
  for all
  using (facility_id = any (auth_manager_facility_access()))
  with check (facility_id = any (auth_manager_facility_access()));

create policy legacy_balances_via_tenant on legacy_balances
  for all
  using (
    exists (
      select 1 from tenants t
      where t.id = legacy_balances.tenant_id
        and t.facility_id = any (auth_manager_facility_access())
    )
  )
  with check (
    exists (
      select 1 from tenants t
      where t.id = legacy_balances.tenant_id
        and t.facility_id = any (auth_manager_facility_access())
    )
  );

create policy sms_templates_facility_scoped on sms_templates
  for all
  using (facility_id = any (auth_manager_facility_access()))
  with check (facility_id = any (auth_manager_facility_access()));

create policy dunning_log_facility_scoped on dunning_log
  for all
  using (facility_id = any (auth_manager_facility_access()))
  with check (facility_id = any (auth_manager_facility_access()));

create policy owner_statements_facility_scoped on owner_statements
  for all
  using (facility_id = any (auth_manager_facility_access()))
  with check (facility_id = any (auth_manager_facility_access()));

-- sms_opt_outs deliberately has no policies: service-role only. The
-- inbound-SMS webhook and the dunning cron access it through service db.

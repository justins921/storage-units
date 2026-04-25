-- Initial schema.
--
-- This migration establishes the baseline schema for the storage-units
-- template and applies the four key constraints called out in the spec:
--
--   1. Partial unique index on leases(unit_id) WHERE status = 'active'
--   2. Unique index on leases(provider_subscription_id) WHERE provider_subscription_id IS NOT NULL
--   3. CHECK on units: locked_until IS NULL OR locked_by_session_id IS NOT NULL
--   4. RLS on all tables scoped to the current manager's facility_access[]

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- facilities
-- ---------------------------------------------------------------------------

create table facilities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  slug text not null unique,
  name text not null,
  branding_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- managers
--
-- facility_access is the source of truth for RLS scoping. A manager may have
-- access to multiple facilities within a single org.
-- ---------------------------------------------------------------------------

create table managers (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  facility_access uuid[] not null default '{}'::uuid[],
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- units
--
-- locked_until / locked_by_session_id together implement the checkout-time
-- reservation lock. The two columns must move as a pair: a unit is either
-- unlocked (both null) or locked (both set).
-- ---------------------------------------------------------------------------

create table units (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references facilities(id) on delete cascade,
  label text not null,
  status text not null,
  locked_until timestamptz,
  locked_by_session_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (facility_id, label),
  constraint units_lock_pair_chk
    check (locked_until is null or locked_by_session_id is not null)
);

-- ---------------------------------------------------------------------------
-- tenants
-- ---------------------------------------------------------------------------

create table tenants (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references facilities(id) on delete cascade,
  email text not null,
  phone text,
  provider_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- leases
-- ---------------------------------------------------------------------------

create table leases (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references facilities(id) on delete cascade,
  unit_id uuid not null references units(id) on delete restrict,
  tenant_id uuid not null references tenants(id) on delete restrict,
  status text not null,
  provider_subscription_id text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- At most one active lease per unit. Enforced in the database so that
-- concurrent webhook handlers cannot double-assign a unit.
create unique index leases_one_active_per_unit_uk
  on leases (unit_id)
  where status = 'active';

-- Provider subscription IDs are globally unique when present. Supports
-- idempotent webhook handling: subscription.created retries cannot insert
-- a duplicate lease row.
create unique index leases_provider_subscription_id_uk
  on leases (provider_subscription_id)
  where provider_subscription_id is not null;

-- ---------------------------------------------------------------------------
-- Row-level security
--
-- Every non-auth table is scoped to the calling manager's facility_access[].
-- The managers table itself exposes only the caller's own row.
-- ---------------------------------------------------------------------------

create or replace function auth_manager_facility_access()
returns uuid[]
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(facility_access, '{}'::uuid[])
  from managers
  where id = auth.uid()
$$;

alter table facilities enable row level security;
alter table managers   enable row level security;
alter table units      enable row level security;
alter table tenants    enable row level security;
alter table leases     enable row level security;

create policy managers_self on managers
  for select using (id = auth.uid());

create policy facilities_facility_scoped on facilities
  for all
  using (id = any (auth_manager_facility_access()))
  with check (id = any (auth_manager_facility_access()));

create policy units_facility_scoped on units
  for all
  using (facility_id = any (auth_manager_facility_access()))
  with check (facility_id = any (auth_manager_facility_access()));

create policy tenants_facility_scoped on tenants
  for all
  using (facility_id = any (auth_manager_facility_access()))
  with check (facility_id = any (auth_manager_facility_access()));

create policy leases_facility_scoped on leases
  for all
  using (facility_id = any (auth_manager_facility_access()))
  with check (facility_id = any (auth_manager_facility_access()));

import { serviceDb } from './db';

// Server-side aggregate queries that power the admin dashboard. Each
// query is keyed by facility_id; the calling page is responsible for
// having already validated that the manager has access to the facility.

export interface DashboardSummary {
  unitCount: number;
  occupiedCount: number;
  availableCount: number;
  pastDueCount: number;
  occupancyPercent: number;
  revenueLast30dCents: number;
  pendingDunningCount: number;
}

export async function dashboardSummary(facilityId: string): Promise<DashboardSummary> {
  const db = serviceDb();
  const [unitCounts, leaseCounts, revenue] = await Promise.all([
    db.from('units').select('status', { count: 'exact', head: false }).eq('facility_id', facilityId),
    db.from('leases').select('status', { count: 'exact', head: false }).eq('facility_id', facilityId),
    db
      .from('payments')
      .select('amount_cents')
      .eq('facility_id', facilityId)
      .eq('kind', 'charge')
      .gte('paid_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const units = (unitCounts.data ?? []) as { status: string }[];
  const leases = (leaseCounts.data ?? []) as { status: string }[];
  const charges = (revenue.data ?? []) as { amount_cents: number }[];

  const unitCount = units.length;
  const occupiedCount = units.filter((u) => u.status === 'occupied').length;
  const availableCount = units.filter((u) => u.status === 'available').length;
  const pastDueCount = leases.filter((l) => l.status === 'past_due').length;
  const occupancyPercent = unitCount === 0 ? 0 : Math.round((occupiedCount / unitCount) * 100);
  const revenueLast30dCents = charges.reduce((s, c) => s + c.amount_cents, 0);

  return {
    unitCount,
    occupiedCount,
    availableCount,
    pastDueCount,
    occupancyPercent,
    revenueLast30dCents,
    pendingDunningCount: pastDueCount,
  };
}

export interface UnitRow {
  id: string;
  label: string;
  status: string;
  monthly_rate_cents: number;
  unit_type_name: string | null;
  locked_until: string | null;
  active_lease: {
    id: string;
    tenant_id: string;
    tenant_email: string;
    started_at: string;
    monthly_rate_cents: number;
  } | null;
}

export async function listUnits(facilityId: string): Promise<UnitRow[]> {
  const db = serviceDb();
  const { data, error } = await db
    .from('units')
    .select(
      `id, label, status, monthly_rate_cents, locked_until,
       unit_type:unit_types ( name ),
       leases ( id, tenant_id, started_at, monthly_rate_cents, status,
                tenant:tenants ( email ) )`,
    )
    .eq('facility_id', facilityId)
    .order('label', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((u) => {
    const leases = ((u.leases ?? []) as unknown as {
      id: string;
      tenant_id: string;
      started_at: string;
      monthly_rate_cents: number;
      status: string;
      tenant: { email: string } | null;
    }[]).filter((l) => l.status === 'active');
    const active = leases[0];
    const ut = (u.unit_type ?? {}) as unknown as { name?: string };
    return {
      id: u.id as string,
      label: u.label as string,
      status: u.status as string,
      monthly_rate_cents: u.monthly_rate_cents as number,
      unit_type_name: ut.name ?? null,
      locked_until: (u.locked_until as string | null) ?? null,
      active_lease: active
        ? {
            id: active.id,
            tenant_id: active.tenant_id,
            tenant_email: active.tenant?.email ?? '',
            started_at: active.started_at,
            monthly_rate_cents: active.monthly_rate_cents,
          }
        : null,
    };
  });
}

export interface TenantRow {
  id: string;
  email: string;
  display_name: string | null;
  phone: string | null;
  active_leases: number;
  past_due_leases: number;
  total_paid_cents: number;
}

export async function listTenants(facilityId: string): Promise<TenantRow[]> {
  const db = serviceDb();
  const [tenants, leases, payments] = await Promise.all([
    db
      .from('tenants')
      .select('id, email, display_name, phone')
      .eq('facility_id', facilityId)
      .order('email', { ascending: true }),
    db
      .from('leases')
      .select('tenant_id, status')
      .eq('facility_id', facilityId),
    db
      .from('payments')
      .select('tenant_id, amount_cents, kind')
      .eq('facility_id', facilityId)
      .eq('kind', 'charge'),
  ]);

  const leaseRows = (leases.data ?? []) as { tenant_id: string; status: string }[];
  const paymentRows = (payments.data ?? []) as { tenant_id: string; amount_cents: number }[];

  return ((tenants.data ?? []) as TenantRow[]).map((t) => ({
    ...t,
    active_leases: leaseRows.filter((l) => l.tenant_id === t.id && l.status === 'active').length,
    past_due_leases: leaseRows.filter((l) => l.tenant_id === t.id && l.status === 'past_due').length,
    total_paid_cents: paymentRows
      .filter((p) => p.tenant_id === t.id)
      .reduce((s, p) => s + p.amount_cents, 0),
  }));
}

export interface TenantDetail {
  id: string;
  facility_id: string;
  email: string;
  display_name: string | null;
  phone: string | null;
  provider_customer_id: string | null;
  legacy_balance_cents: number;
  leases: Array<{
    id: string;
    status: string;
    unit_label: string;
    unit_id: string;
    monthly_rate_cents: number;
    started_at: string;
    ended_at: string | null;
    past_due_since: string | null;
    provider_subscription_id: string | null;
  }>;
  payments: Array<{
    id: string;
    amount_cents: number;
    kind: string;
    paid_at: string;
    notes: string | null;
    actor_manager_id: string | null;
  }>;
  dunning: Array<{
    id: string;
    template_key: string;
    sent_at: string;
    suppressed_reason: string | null;
  }>;
  audit: Array<{
    id: string;
    action: string;
    notes: string | null;
    created_at: string;
    actor_manager_id: string | null;
  }>;
}

export async function getTenantDetail(
  facilityId: string,
  tenantId: string,
): Promise<TenantDetail | null> {
  const db = serviceDb();
  const { data: t, error: tErr } = await db
    .from('tenants')
    .select('id, facility_id, email, display_name, phone, provider_customer_id')
    .eq('id', tenantId)
    .eq('facility_id', facilityId)
    .maybeSingle();
  if (tErr) throw tErr;
  if (!t) return null;

  const [legacy, leases, payments, dunning, audit] = await Promise.all([
    db.from('legacy_balances').select('amount_cents').eq('tenant_id', tenantId).maybeSingle(),
    db
      .from('leases')
      .select(
        `id, status, monthly_rate_cents, started_at, ended_at, past_due_since,
         provider_subscription_id, unit_id,
         unit:units ( label )`,
      )
      .eq('tenant_id', tenantId)
      .order('started_at', { ascending: false }),
    db
      .from('payments')
      .select('id, amount_cents, kind, paid_at, notes, actor_manager_id')
      .eq('tenant_id', tenantId)
      .order('paid_at', { ascending: false }),
    db
      .from('dunning_log')
      .select('id, template_key, sent_at, suppressed_reason')
      .eq('tenant_id', tenantId)
      .order('sent_at', { ascending: false }),
    db
      .from('audit_log')
      .select('id, action, notes, created_at, actor_manager_id')
      .eq('target_table', 'tenants')
      .eq('target_id', tenantId)
      .order('created_at', { ascending: false }),
  ]);

  return {
    ...(t as TenantDetail),
    legacy_balance_cents: ((legacy.data as { amount_cents?: number } | null)?.amount_cents) ?? 0,
    leases: ((leases.data ?? []) as unknown as Array<{
      id: string;
      status: string;
      monthly_rate_cents: number;
      started_at: string;
      ended_at: string | null;
      past_due_since: string | null;
      provider_subscription_id: string | null;
      unit_id: string;
      unit: { label: string } | null;
    }>).map((l) => ({
      id: l.id,
      status: l.status,
      unit_label: l.unit?.label ?? '?',
      unit_id: l.unit_id,
      monthly_rate_cents: l.monthly_rate_cents,
      started_at: l.started_at,
      ended_at: l.ended_at,
      past_due_since: l.past_due_since,
      provider_subscription_id: l.provider_subscription_id,
    })),
    payments: (payments.data ?? []) as TenantDetail['payments'],
    dunning: (dunning.data ?? []) as TenantDetail['dunning'],
    audit: (audit.data ?? []) as TenantDetail['audit'],
  };
}

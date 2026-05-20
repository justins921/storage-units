import { serviceDb } from './db';

// Owner statement generation. Each statement is keyed by
// (facility_id, period_start, period_end) and is idempotent: rerunning
// for the same period overwrites the snapshot rather than duplicating.

export interface StatementSnapshot {
  facility: { id: string; name: string; slug: string };
  period_start: string;
  period_end: string;
  totals: {
    gross_cents: number;
    refunds_cents: number;
    credits_cents: number;
    waives_cents: number;
    net_payout_cents: number;
    outstanding_current_cents: number;
    outstanding_legacy_cents: number;
  };
  units: {
    unit_count: number;
    occupied_count: number;
    vacant_count: number;
    occupancy_percent: number;
  };
  breakdown: Array<{
    unit_id: string;
    label: string;
    unit_type: string | null;
    monthly_rate_cents: number;
    status: string;
    tenant_email: string | null;
    paid_in_period_cents: number;
  }>;
}

// Compute period boundaries for the previous calendar month based on `at`.
export function previousMonthPeriod(at: Date = new Date()): {
  start: Date;
  end: Date;
  startISO: string;
  endISO: string;
} {
  const y = at.getUTCFullYear();
  const m = at.getUTCMonth(); // 0..11
  // Previous month: m-1; JS Date handles January via -1.
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1)); // exclusive
  return {
    start,
    end,
    startISO: start.toISOString().slice(0, 10),
    endISO: new Date(end.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  };
}

export async function generateStatement(
  facilityId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<StatementSnapshot> {
  const db = serviceDb();
  const startIso = periodStart.toISOString();
  const endIso = periodEnd.toISOString();

  const [facility, payments, units, tenantsAtFacility] = await Promise.all([
    db.from('facilities').select('id, name, slug').eq('id', facilityId).single(),
    db
      .from('payments')
      .select('lease_id, tenant_id, amount_cents, kind, paid_at')
      .eq('facility_id', facilityId)
      .gte('paid_at', startIso)
      .lt('paid_at', endIso),
    db
      .from('units')
      .select(
        `id, label, status, monthly_rate_cents,
         unit_type:unit_types ( name ),
         leases ( id, status, tenant_id, tenant:tenants ( email ) )`,
      )
      .eq('facility_id', facilityId),
    db.from('tenants').select('id').eq('facility_id', facilityId),
  ]);

  if (facility.error) throw facility.error;
  if (payments.error) throw payments.error;
  if (units.error) throw units.error;
  if (tenantsAtFacility.error) throw tenantsAtFacility.error;

  const tenantIds = ((tenantsAtFacility.data ?? []) as { id: string }[]).map((t) => t.id);
  let legacyRows: { amount_cents: number }[] = [];
  if (tenantIds.length > 0) {
    const { data: legacy, error: legacyErr } = await db
      .from('legacy_balances')
      .select('amount_cents')
      .in('tenant_id', tenantIds);
    if (legacyErr) throw legacyErr;
    legacyRows = (legacy ?? []) as { amount_cents: number }[];
  }

  const facilityRow = facility.data as { id: string; name: string; slug: string };
  const paymentRows = (payments.data ?? []) as {
    lease_id: string;
    tenant_id: string;
    amount_cents: number;
    kind: string;
    paid_at: string;
  }[];
  const unitRows = (units.data ?? []) as Array<{
    id: string;
    label: string;
    status: string;
    monthly_rate_cents: number;
    unit_type: { name: string } | null;
    leases: Array<{
      id: string;
      status: string;
      tenant_id: string;
      tenant: { email: string } | null;
    }>;
  }>;
  const gross = sumWhere(paymentRows, (p) => p.kind === 'charge');
  const refunds = sumWhere(paymentRows, (p) => p.kind === 'refund');
  const credits = sumWhere(paymentRows, (p) => p.kind === 'credit');
  const waives = sumWhere(paymentRows, (p) => p.kind === 'waive');
  const net = gross - refunds - credits - waives;

  const occupied = unitRows.filter((u) => u.status === 'occupied');
  const occupancyPercent =
    unitRows.length === 0 ? 0 : Number(((occupied.length / unitRows.length) * 100).toFixed(2));

  // Outstanding current: monthly rate per active lease that did NOT pay this period.
  const paidLeaseIds = new Set(
    paymentRows.filter((p) => p.kind === 'charge').map((p) => p.lease_id),
  );
  let outstandingCurrent = 0;
  for (const u of unitRows) {
    const active = u.leases.find((l) => l.status === 'active');
    if (active && !paidLeaseIds.has(active.id)) {
      outstandingCurrent += u.monthly_rate_cents;
    }
  }
  const outstandingLegacy = legacyRows.reduce((s, r) => s + r.amount_cents, 0);

  const breakdown = unitRows.map((u) => {
    const active = u.leases.find((l) => l.status === 'active');
    const paid = active
      ? sumWhere(paymentRows, (p) => p.kind === 'charge' && p.lease_id === active.id)
      : 0;
    return {
      unit_id: u.id,
      label: u.label,
      unit_type: u.unit_type?.name ?? null,
      monthly_rate_cents: u.monthly_rate_cents,
      status: u.status,
      tenant_email: active?.tenant?.email ?? null,
      paid_in_period_cents: paid,
    };
  });

  return {
    facility: facilityRow,
    period_start: periodStart.toISOString().slice(0, 10),
    period_end: new Date(periodEnd.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    totals: {
      gross_cents: gross,
      refunds_cents: refunds,
      credits_cents: credits,
      waives_cents: waives,
      net_payout_cents: net,
      outstanding_current_cents: outstandingCurrent,
      outstanding_legacy_cents: outstandingLegacy,
    },
    units: {
      unit_count: unitRows.length,
      occupied_count: occupied.length,
      vacant_count: unitRows.length - occupied.length,
      occupancy_percent: occupancyPercent,
    },
    breakdown,
  };
}

export async function saveStatement(snapshot: StatementSnapshot): Promise<{ id: string }> {
  const db = serviceDb();
  const { data, error } = await db
    .from('owner_statements')
    .upsert(
      {
        facility_id: snapshot.facility.id,
        period_start: snapshot.period_start,
        period_end: snapshot.period_end,
        gross_cents: snapshot.totals.gross_cents,
        refunds_cents: snapshot.totals.refunds_cents,
        credits_cents: snapshot.totals.credits_cents,
        waives_cents: snapshot.totals.waives_cents,
        outstanding_current_cents: snapshot.totals.outstanding_current_cents,
        outstanding_legacy_cents: snapshot.totals.outstanding_legacy_cents,
        unit_count: snapshot.units.unit_count,
        occupied_count: snapshot.units.occupied_count,
        vacant_count: snapshot.units.vacant_count,
        occupancy_percent: snapshot.units.occupancy_percent,
        net_payout_cents: snapshot.totals.net_payout_cents,
        snapshot_json: snapshot,
        generated_at: new Date().toISOString(),
      },
      { onConflict: 'facility_id,period_start,period_end' },
    )
    .select('id')
    .single();
  if (error) throw error;
  return { id: data.id as string };
}

function sumWhere<T>(rows: T[], pred: (r: T) => boolean): number {
  return rows.reduce((s, r) => (pred(r) ? s + (r as unknown as { amount_cents: number }).amount_cents : s), 0);
}

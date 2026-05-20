'use server';

import { revalidatePath } from 'next/cache';
import { currentManager, requireFacility } from '@/lib/auth';
import { serviceDb } from '@/lib/db';
import { writeAudit } from '@/lib/audit';
import { paymentProvider } from '@/lib/providers';

// Manual admin actions on a tenant. Every action writes an audit row.
// Amounts are dollars in the UI; we convert to cents here.

function dollarsToCents(input: string): number | null {
  const v = Number.parseFloat(input);
  if (!Number.isFinite(v) || v < 0) return null;
  return Math.round(v * 100);
}

async function loadLease(leaseId: string, facilityId: string) {
  const { data } = await serviceDb()
    .from('leases')
    .select('id, facility_id, tenant_id, unit_id, status, provider_subscription_id')
    .eq('id', leaseId)
    .maybeSingle();
  if (!data || data.facility_id !== facilityId) return null;
  return data;
}

export async function recordWaive(input: {
  facilitySlug: string;
  tenantId: string;
  leaseId: string;
  amount: string;
  notes: string;
}): Promise<{ error?: string } | undefined> {
  const cents = dollarsToCents(input.amount);
  if (cents === null || cents === 0) return { error: 'Invalid amount.' };
  const manager = await currentManager();
  const facility = await requireFacility(manager, input.facilitySlug);
  const lease = await loadLease(input.leaseId, facility.id);
  if (!lease) return { error: 'Lease not found.' };

  const { error } = await serviceDb().from('payments').insert({
    facility_id: facility.id,
    lease_id: lease.id,
    tenant_id: lease.tenant_id,
    amount_cents: cents,
    kind: 'waive',
    notes: input.notes || null,
    actor_manager_id: manager.id,
  });
  if (error) return { error: error.message };

  await writeAudit({
    facilityId: facility.id,
    actorManagerId: manager.id,
    action: 'waive',
    targetTable: 'tenants',
    targetId: input.tenantId,
    notes: input.notes,
    metadata: { amount_cents: cents, lease_id: lease.id },
  });
  revalidatePath(`/admin/${input.facilitySlug}/tenants/${input.tenantId}`);
  return undefined;
}

export async function recordCredit(input: {
  facilitySlug: string;
  tenantId: string;
  leaseId: string;
  amount: string;
  notes: string;
}): Promise<{ error?: string } | undefined> {
  const cents = dollarsToCents(input.amount);
  if (cents === null || cents === 0) return { error: 'Invalid amount.' };
  const manager = await currentManager();
  const facility = await requireFacility(manager, input.facilitySlug);
  const lease = await loadLease(input.leaseId, facility.id);
  if (!lease) return { error: 'Lease not found.' };

  const { error } = await serviceDb().from('payments').insert({
    facility_id: facility.id,
    lease_id: lease.id,
    tenant_id: lease.tenant_id,
    amount_cents: cents,
    kind: 'credit',
    notes: input.notes || null,
    actor_manager_id: manager.id,
  });
  if (error) return { error: error.message };

  await writeAudit({
    facilityId: facility.id,
    actorManagerId: manager.id,
    action: 'credit',
    targetTable: 'tenants',
    targetId: input.tenantId,
    notes: input.notes,
    metadata: { amount_cents: cents, lease_id: lease.id },
  });
  revalidatePath(`/admin/${input.facilitySlug}/tenants/${input.tenantId}`);
  return undefined;
}

export async function recordRefund(input: {
  facilitySlug: string;
  tenantId: string;
  leaseId: string;
  amount: string;
  notes: string;
}): Promise<{ error?: string } | undefined> {
  // Mock providers don't actually refund; real Stripe adapter will call
  // `refunds.create`. We always record the ledger entry locally.
  const cents = dollarsToCents(input.amount);
  if (cents === null || cents === 0) return { error: 'Invalid amount.' };
  const manager = await currentManager();
  const facility = await requireFacility(manager, input.facilitySlug);
  const lease = await loadLease(input.leaseId, facility.id);
  if (!lease) return { error: 'Lease not found.' };

  const { error } = await serviceDb().from('payments').insert({
    facility_id: facility.id,
    lease_id: lease.id,
    tenant_id: lease.tenant_id,
    amount_cents: cents,
    kind: 'refund',
    notes: input.notes || null,
    actor_manager_id: manager.id,
  });
  if (error) return { error: error.message };

  await writeAudit({
    facilityId: facility.id,
    actorManagerId: manager.id,
    action: 'refund',
    targetTable: 'tenants',
    targetId: input.tenantId,
    notes: input.notes,
    metadata: { amount_cents: cents, lease_id: lease.id },
  });
  revalidatePath(`/admin/${input.facilitySlug}/tenants/${input.tenantId}`);
  return undefined;
}

export async function recordNote(input: {
  facilitySlug: string;
  tenantId: string;
  notes: string;
}): Promise<{ error?: string } | undefined> {
  if (!input.notes.trim()) return { error: 'Note required.' };
  const manager = await currentManager();
  const facility = await requireFacility(manager, input.facilitySlug);
  await writeAudit({
    facilityId: facility.id,
    actorManagerId: manager.id,
    action: 'note',
    targetTable: 'tenants',
    targetId: input.tenantId,
    notes: input.notes,
  });
  revalidatePath(`/admin/${input.facilitySlug}/tenants/${input.tenantId}`);
  return undefined;
}

export async function endLease(input: {
  facilitySlug: string;
  tenantId: string;
  leaseId: string;
  notes: string;
}): Promise<{ error?: string } | undefined> {
  const manager = await currentManager();
  const facility = await requireFacility(manager, input.facilitySlug);
  const lease = await loadLease(input.leaseId, facility.id);
  if (!lease) return { error: 'Lease not found.' };
  if (lease.status === 'ended') return { error: 'Lease already ended.' };

  if (lease.provider_subscription_id) {
    try {
      await paymentProvider().cancelSubscription(lease.provider_subscription_id);
    } catch (err) {
      // Don't block end-lease on provider failures. The audit row will
      // capture the error for follow-up.
      await writeAudit({
        facilityId: facility.id,
        actorManagerId: manager.id,
        action: 'provider_cancel_failed',
        targetTable: 'leases',
        targetId: lease.id,
        notes: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const db = serviceDb();
  const { error: leaseErr } = await db
    .from('leases')
    .update({
      status: 'ended',
      ended_at: new Date().toISOString(),
      past_due_since: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', lease.id);
  if (leaseErr) return { error: leaseErr.message };

  await db
    .from('units')
    .update({
      status: 'available',
      locked_until: null,
      locked_by_session_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', lease.unit_id);

  await writeAudit({
    facilityId: facility.id,
    actorManagerId: manager.id,
    action: 'end_lease',
    targetTable: 'leases',
    targetId: lease.id,
    notes: input.notes,
  });
  revalidatePath(`/admin/${input.facilitySlug}/tenants/${input.tenantId}`);
  revalidatePath(`/admin/${input.facilitySlug}/units`);
  return undefined;
}

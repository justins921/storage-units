import { serviceDb } from './db';
import { releaseUnitLock } from './locking';
import { emailProvider } from './providers';
import type { NormalizedEvent } from './providers/types';

// Apply a normalized provider event to the database. Idempotency is
// enforced by the (provider, event_id) unique index on provider_events:
// the caller inserts that row first, and on a duplicate we skip the apply.
//
// Each handler must be safe to run multiple times against the same DB
// state — that's the second line of idempotency defense, on top of the
// provider_events check.

export async function applyEvent(
  providerName: string,
  event: NormalizedEvent,
): Promise<void> {
  const db = serviceDb();

  // Reserve the event ID. Unique-violation = "already processed".
  const { error: insertErr } = await db.from('provider_events').insert({
    provider: providerName,
    event_id: event.providerEventId,
    event_type: event.type,
    payload: event,
  });
  if (insertErr) {
    if (isUniqueViolation(insertErr)) {
      console.log(`[webhook] dedup skip ${providerName}:${event.providerEventId}`);
      return;
    }
    throw insertErr;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event);
        break;
      case 'checkout.session.expired':
        await handleCheckoutExpired(event);
        break;
      case 'invoice.paid':
        await handleInvoicePaid(event);
        break;
      case 'invoice.payment_failed':
        await handleInvoiceFailed(event);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event);
        break;
    }
    await db
      .from('provider_events')
      .update({ processed_at: new Date().toISOString() })
      .eq('provider', providerName)
      .eq('event_id', event.providerEventId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .from('provider_events')
      .update({ error: message })
      .eq('provider', providerName)
      .eq('event_id', event.providerEventId);
    throw err;
  }
}

async function handleCheckoutCompleted(
  event: Extract<NormalizedEvent, { type: 'checkout.session.completed' }>,
): Promise<void> {
  const db = serviceDb();
  const { sessionId, subscriptionId, customerId, customerEmail, metadata } = event.data;
  const unitId = metadata.unit_id;
  const facilityId = metadata.facility_id;
  const lockSessionId = metadata.lock_session_id ?? sessionId;

  if (!unitId || !facilityId) {
    throw new Error(`checkout.session.completed missing unit_id/facility_id metadata`);
  }

  // Upsert tenant by (facility_id, email). Email is what the booking flow
  // collects; provider_customer_id ties it to the payment provider.
  const tenantId = await upsertTenant({
    facilityId,
    email: customerEmail,
    providerCustomerId: customerId,
  });

  const { data: unit, error: unitErr } = await db
    .from('units')
    .select('id, monthly_rate_cents, status')
    .eq('id', unitId)
    .maybeSingle();
  if (unitErr) throw unitErr;
  if (!unit) throw new Error(`unit ${unitId} not found`);

  // Insert the lease. The partial unique index on leases(unit_id) WHERE
  // status='active' guarantees this fails if a concurrent webhook already
  // assigned the unit. We treat that as success — the unit is occupied.
  const { error: leaseErr } = await db.from('leases').insert({
    facility_id: facilityId,
    unit_id: unitId,
    tenant_id: tenantId,
    status: 'active',
    provider_subscription_id: subscriptionId,
    provider_customer_id: customerId,
    monthly_rate_cents: unit.monthly_rate_cents,
  });
  if (leaseErr && !isUniqueViolation(leaseErr)) throw leaseErr;

  // Mark the unit occupied and release the lock atomically.
  const { error: updateErr } = await db
    .from('units')
    .update({
      status: 'occupied',
      locked_until: null,
      locked_by_session_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', unitId);
  if (updateErr) throw updateErr;

  // Best-effort confirmation email. Failures here must not abort the
  // webhook — the lease is the source of truth.
  try {
    await emailProvider().send({
      to: customerEmail,
      subject: 'Reservation confirmed',
      text: `Your unit is booked. Lease starts now.`,
      html: `<p>Your unit is booked. Lease starts now.</p>`,
    });
  } catch (err) {
    console.error('[webhook] confirmation email failed', err);
  }

  // Lock release is idempotent.
  await releaseUnitLock({ unitId, sessionId: lockSessionId }).catch(() => {});
}

async function handleCheckoutExpired(
  event: Extract<NormalizedEvent, { type: 'checkout.session.expired' }>,
): Promise<void> {
  const { metadata } = event.data;
  const unitId = metadata.unit_id;
  const lockSessionId = metadata.lock_session_id;
  if (!unitId || !lockSessionId) return;
  await releaseUnitLock({ unitId, sessionId: lockSessionId });
}

async function handleInvoicePaid(
  event: Extract<NormalizedEvent, { type: 'invoice.paid' }>,
): Promise<void> {
  const db = serviceDb();
  // Re-activate any past_due lease tied to this subscription. No-op if
  // already active.
  await db
    .from('leases')
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .eq('provider_subscription_id', event.data.subscriptionId)
    .in('status', ['past_due']);
}

async function handleInvoiceFailed(
  event: Extract<NormalizedEvent, { type: 'invoice.payment_failed' }>,
): Promise<void> {
  const db = serviceDb();
  await db
    .from('leases')
    .update({ status: 'past_due', updated_at: new Date().toISOString() })
    .eq('provider_subscription_id', event.data.subscriptionId)
    .eq('status', 'active');
}

async function handleSubscriptionDeleted(
  event: Extract<NormalizedEvent, { type: 'customer.subscription.deleted' }>,
): Promise<void> {
  const db = serviceDb();
  // Find the lease so we can free the unit too.
  const { data: lease, error } = await db
    .from('leases')
    .select('id, unit_id')
    .eq('provider_subscription_id', event.data.subscriptionId)
    .eq('status', 'active')
    .maybeSingle();
  if (error) throw error;
  if (!lease) return;

  await db
    .from('leases')
    .update({
      status: 'ended',
      ended_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', lease.id);

  await db
    .from('units')
    .update({ status: 'available', updated_at: new Date().toISOString() })
    .eq('id', lease.unit_id);
}

async function upsertTenant(params: {
  facilityId: string;
  email: string;
  providerCustomerId: string;
}): Promise<string> {
  const db = serviceDb();
  const { data: existing } = await db
    .from('tenants')
    .select('id')
    .eq('facility_id', params.facilityId)
    .eq('email', params.email)
    .maybeSingle();
  if (existing) {
    if (params.providerCustomerId) {
      await db
        .from('tenants')
        .update({ provider_customer_id: params.providerCustomerId })
        .eq('id', existing.id);
    }
    return existing.id as string;
  }
  const { data: created, error } = await db
    .from('tenants')
    .insert({
      facility_id: params.facilityId,
      email: params.email,
      provider_customer_id: params.providerCustomerId,
    })
    .select('id')
    .single();
  if (error) throw error;
  return created.id as string;
}

function isUniqueViolation(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const code = (err as { code?: string }).code;
  return code === '23505';
}

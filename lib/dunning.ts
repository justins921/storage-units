import { serviceDb } from './db';
import { smsProvider } from './providers';

// Dunning policy: a fixed cadence of templates keyed by days-past-due.
// The template body lives in sms_templates per facility so the manager
// can edit copy without code changes. The schedule itself is fixed.

export const DUNNING_SCHEDULE: { days: number; key: string }[] = [
  { days: 3, key: 'dunning_day_3' },
  { days: 5, key: 'dunning_day_5' },
  { days: 7, key: 'dunning_day_7' },
  { days: 10, key: 'dunning_day_10' },
  { days: 14, key: 'dunning_day_14' },
];

export const DEFAULT_TEMPLATES: Record<string, string> = {
  dunning_day_3:
    'Hi {first_name}, your storage payment is 3 days late. Pay now to avoid late fees: {portal_url}',
  dunning_day_5:
    'Reminder: your {facility_name} payment is 5 days late. Pay here: {portal_url}',
  dunning_day_7:
    'Your storage unit is past due. Pay within 3 days to keep your unit: {portal_url}',
  dunning_day_10:
    'Your unit is at risk of lien proceedings. Please pay immediately: {portal_url}',
  dunning_day_14: 'Final notice. Lien process begins in 48h. {portal_url}',
};

interface PastDueLease {
  id: string;
  facility_id: string;
  tenant_id: string;
  past_due_since: string;
  tenant: {
    email: string;
    phone: string | null;
    display_name: string | null;
  };
  facility: { name: string; slug: string };
}

interface DunningResult {
  scanned: number;
  sent: number;
  suppressed: number;
  skipped: number;
}

export async function runDunningOnce(): Promise<DunningResult> {
  const db = serviceDb();
  const { data, error } = await db
    .from('leases')
    .select(
      `id, facility_id, tenant_id, past_due_since,
       tenant:tenants ( email, phone, display_name ),
       facility:facilities ( name, slug )`,
    )
    .eq('status', 'past_due')
    .not('past_due_since', 'is', null);
  if (error) throw error;

  const leases = (data ?? []) as unknown as PastDueLease[];
  const out: DunningResult = { scanned: leases.length, sent: 0, suppressed: 0, skipped: 0 };

  for (const lease of leases) {
    const ageDays = Math.floor(
      (Date.now() - new Date(lease.past_due_since).getTime()) / (24 * 60 * 60 * 1000),
    );
    // Find the most senior template the lease is now eligible for.
    const due = DUNNING_SCHEDULE.filter((s) => ageDays >= s.days);
    if (due.length === 0) {
      out.skipped++;
      continue;
    }

    let sentForThis = false;
    for (const step of due) {
      const ok = await maybeSendOne(lease, step.key);
      if (ok === 'sent') {
        out.sent++;
        sentForThis = true;
      } else if (ok === 'suppressed') {
        out.suppressed++;
      } else if (ok === 'already') {
        // skip silently
      }
      if (sentForThis) break; // one send per lease per run
    }
  }

  return out;
}

async function maybeSendOne(
  lease: PastDueLease,
  templateKey: string,
): Promise<'sent' | 'suppressed' | 'already' | 'no_phone' | 'no_template'> {
  const db = serviceDb();

  // Idempotency: dunning_log has a unique (lease_id, template_key) where
  // suppressed_reason is null. A duplicate insert raises 23505 and we skip.
  const { data: existing } = await db
    .from('dunning_log')
    .select('id')
    .eq('lease_id', lease.id)
    .eq('template_key', templateKey)
    .is('suppressed_reason', null)
    .maybeSingle();
  if (existing) return 'already';

  const phone = lease.tenant.phone;
  if (!phone) {
    await db.from('dunning_log').insert({
      facility_id: lease.facility_id,
      tenant_id: lease.tenant_id,
      lease_id: lease.id,
      template_key: templateKey,
      suppressed_reason: 'no_phone',
    });
    return 'suppressed';
  }

  // Opt-out check (both shared opt-outs table and the SMS provider's view).
  const [{ data: optOut }, providerOptedOut] = await Promise.all([
    db.from('sms_opt_outs').select('phone').eq('phone', phone).maybeSingle(),
    smsProvider().isOptedOut(phone),
  ]);
  if (optOut || providerOptedOut) {
    await db.from('dunning_log').insert({
      facility_id: lease.facility_id,
      tenant_id: lease.tenant_id,
      lease_id: lease.id,
      template_key: templateKey,
      suppressed_reason: 'opted_out',
    });
    return 'suppressed';
  }

  const { data: tpl } = await db
    .from('sms_templates')
    .select('body, enabled')
    .eq('facility_id', lease.facility_id)
    .eq('key', templateKey)
    .maybeSingle();
  if (!tpl || !tpl.enabled) {
    await db.from('dunning_log').insert({
      facility_id: lease.facility_id,
      tenant_id: lease.tenant_id,
      lease_id: lease.id,
      template_key: templateKey,
      suppressed_reason: 'no_template',
    });
    return 'no_template';
  }

  const body = renderTemplate(tpl.body, {
    first_name: lease.tenant.display_name?.split(' ')[0] ?? 'there',
    facility_name: lease.facility.name,
    portal_url: `/${lease.facility.slug}`,
  });

  try {
    const sent = await smsProvider().send({ to: phone, body, optOutKey: phone });
    await db.from('dunning_log').insert({
      facility_id: lease.facility_id,
      tenant_id: lease.tenant_id,
      lease_id: lease.id,
      template_key: templateKey,
      sms_provider_id: sent.id,
    });
    return 'sent';
  } catch (err) {
    await db.from('dunning_log').insert({
      facility_id: lease.facility_id,
      tenant_id: lease.tenant_id,
      lease_id: lease.id,
      template_key: templateKey,
      suppressed_reason: 'send_failed: ' + (err instanceof Error ? err.message : 'unknown'),
    });
    return 'suppressed';
  }
}

function renderTemplate(body: string, vars: Record<string, string>): string {
  return body.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

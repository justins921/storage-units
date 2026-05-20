import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentManager, requireFacility } from '@/lib/auth';
import { getTenantDetail } from '@/lib/admin-queries';
import { Badge, Card, Empty, LeaseStatusBadge, dollars } from '@/lib/ui';
import { ManualActionsPanel } from './manual-actions';

export const dynamic = 'force-dynamic';

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ facility: string; id: string }>;
}) {
  const { facility: slug, id } = await params;
  const manager = await currentManager();
  const facility = await requireFacility(manager, slug);
  const tenant = await getTenantDetail(facility.id, id);
  if (!tenant) notFound();

  const activeLease = tenant.leases.find((l) => l.status === 'active');

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/admin/${slug}/tenants`}
          className="text-xs text-slate-500 underline-offset-2 hover:underline"
        >
          ← All tenants
        </Link>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              {tenant.display_name ?? tenant.email}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {tenant.email}
              {tenant.phone ? ` · ${tenant.phone}` : ''}
            </p>
          </div>
          {tenant.legacy_balance_cents > 0 ? (
            <Badge tone="amber">
              Legacy balance {dollars(tenant.legacy_balance_cents)}
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <Section title="Leases">
            {tenant.leases.length === 0 ? (
              <Empty title="No leases." />
            ) : (
              <Card padded={false}>
                <ul className="divide-y divide-slate-100">
                  {tenant.leases.map((l) => (
                    <li key={l.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                      <div>
                        <p className="font-medium text-slate-900">Unit {l.unit_label}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {dollars(l.monthly_rate_cents)} / mo · started{' '}
                          {new Date(l.started_at).toLocaleDateString()}
                          {l.ended_at
                            ? ` · ended ${new Date(l.ended_at).toLocaleDateString()}`
                            : ''}
                        </p>
                        {l.past_due_since ? (
                          <p className="mt-0.5 text-xs text-red-700">
                            Past due since{' '}
                            {new Date(l.past_due_since).toLocaleDateString()}
                          </p>
                        ) : null}
                        {l.provider_subscription_id ? (
                          <p className="mt-0.5 font-mono text-[10px] text-slate-400">
                            {l.provider_subscription_id}
                          </p>
                        ) : null}
                      </div>
                      <LeaseStatusBadge status={l.status} />
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </Section>

          <Section title="Payment history">
            {tenant.payments.length === 0 ? (
              <Empty title="No payments yet." />
            ) : (
              <Card padded={false}>
                <ul className="divide-y divide-slate-100">
                  {tenant.payments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                      <div>
                        <p className="font-medium capitalize text-slate-900">{p.kind}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {new Date(p.paid_at).toLocaleString()}
                          {p.notes ? ` — ${p.notes}` : ''}
                        </p>
                      </div>
                      <p
                        className={
                          p.kind === 'charge'
                            ? 'font-medium text-emerald-700'
                            : 'font-medium text-amber-700'
                        }
                      >
                        {p.kind === 'refund' ? '−' : ''}
                        {dollars(p.amount_cents)}
                      </p>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </Section>

          <Section title="Dunning history">
            {tenant.dunning.length === 0 ? (
              <Empty title="No SMS yet." />
            ) : (
              <Card padded={false}>
                <ul className="divide-y divide-slate-100">
                  {tenant.dunning.map((d) => (
                    <li key={d.id} className="p-4 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-slate-900">{d.template_key}</p>
                        {d.suppressed_reason ? (
                          <Badge tone="amber">{d.suppressed_reason}</Badge>
                        ) : (
                          <Badge tone="emerald">sent</Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {new Date(d.sent_at).toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </Section>

          <Section title="Audit">
            {tenant.audit.length === 0 ? (
              <Empty title="No admin actions yet." />
            ) : (
              <Card padded={false}>
                <ul className="divide-y divide-slate-100">
                  {tenant.audit.map((a) => (
                    <li key={a.id} className="p-4 text-sm">
                      <p className="font-medium text-slate-900">{a.action}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {new Date(a.created_at).toLocaleString()}
                        {a.notes ? ` — ${a.notes}` : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </Section>
        </div>

        <aside className="lg:col-span-1">
          <div className="sticky top-6">
            <ManualActionsPanel
              facilitySlug={slug}
              tenantId={tenant.id}
              activeLeaseId={activeLease?.id ?? null}
              activeLeaseUnitId={activeLease?.unit_id ?? null}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

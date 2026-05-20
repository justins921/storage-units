import { notFound } from 'next/navigation';
import { currentManager, requireFacility } from '@/lib/auth';
import { getTenantDetail } from '@/lib/admin-queries';
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
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-8">
        <header>
          <h1 className="text-2xl font-semibold">{tenant.display_name ?? tenant.email}</h1>
          <p className="text-sm text-gray-500">
            {tenant.email}
            {tenant.phone ? ` · ${tenant.phone}` : ''}
          </p>
          {tenant.legacy_balance_cents > 0 ? (
            <p className="mt-1 text-sm text-amber-700">
              Legacy balance: ${(tenant.legacy_balance_cents / 100).toFixed(2)}
            </p>
          ) : null}
        </header>

        <section>
          <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500">Leases</h2>
          <ul className="mt-2 space-y-2">
            {tenant.leases.length === 0 ? (
              <li className="text-sm text-gray-500">No leases.</li>
            ) : (
              tenant.leases.map((l) => (
                <li
                  key={l.id}
                  className="flex items-center justify-between rounded border border-gray-200 bg-white p-3 text-sm"
                >
                  <div>
                    <p className="font-medium">Unit {l.unit_label}</p>
                    <p className="text-xs text-gray-500">
                      ${(l.monthly_rate_cents / 100).toFixed(2)}/mo · started{' '}
                      {new Date(l.started_at).toLocaleDateString()}
                      {l.ended_at ? ` · ended ${new Date(l.ended_at).toLocaleDateString()}` : ''}
                    </p>
                    {l.past_due_since ? (
                      <p className="text-xs text-red-700">
                        Past due since {new Date(l.past_due_since).toLocaleDateString()}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      l.status === 'active'
                        ? 'bg-emerald-100 text-emerald-800'
                        : l.status === 'past_due'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {l.status}
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>

        <section>
          <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500">
            Payment history
          </h2>
          <ul className="mt-2 divide-y divide-gray-200 rounded border border-gray-200 bg-white">
            {tenant.payments.length === 0 ? (
              <li className="p-3 text-sm text-gray-500">No payments yet.</li>
            ) : (
              tenant.payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between p-3 text-sm">
                  <div>
                    <p className="font-medium capitalize">{p.kind}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(p.paid_at).toLocaleString()}
                      {p.notes ? ` — ${p.notes}` : ''}
                    </p>
                  </div>
                  <p
                    className={
                      p.kind === 'refund' || p.kind === 'waive' || p.kind === 'credit'
                        ? 'text-amber-700'
                        : 'text-emerald-700'
                    }
                  >
                    {p.kind === 'refund' ? '-' : ''}${(p.amount_cents / 100).toFixed(2)}
                  </p>
                </li>
              ))
            )}
          </ul>
        </section>

        <section>
          <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500">
            Dunning history
          </h2>
          <ul className="mt-2 divide-y divide-gray-200 rounded border border-gray-200 bg-white">
            {tenant.dunning.length === 0 ? (
              <li className="p-3 text-sm text-gray-500">No SMS yet.</li>
            ) : (
              tenant.dunning.map((d) => (
                <li key={d.id} className="p-3 text-sm">
                  <p className="font-medium">{d.template_key}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(d.sent_at).toLocaleString()}
                    {d.suppressed_reason ? ` — suppressed: ${d.suppressed_reason}` : ''}
                  </p>
                </li>
              ))
            )}
          </ul>
        </section>

        <section>
          <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500">Audit</h2>
          <ul className="mt-2 divide-y divide-gray-200 rounded border border-gray-200 bg-white">
            {tenant.audit.length === 0 ? (
              <li className="p-3 text-sm text-gray-500">No admin actions yet.</li>
            ) : (
              tenant.audit.map((a) => (
                <li key={a.id} className="p-3 text-sm">
                  <p className="font-medium">{a.action}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(a.created_at).toLocaleString()}
                    {a.notes ? ` — ${a.notes}` : ''}
                  </p>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <aside className="lg:col-span-1">
        <ManualActionsPanel
          facilitySlug={slug}
          tenantId={tenant.id}
          activeLeaseId={activeLease?.id ?? null}
          activeLeaseUnitId={activeLease?.unit_id ?? null}
        />
      </aside>
    </div>
  );
}

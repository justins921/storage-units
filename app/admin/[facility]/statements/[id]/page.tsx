import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentManager, requireFacility } from '@/lib/auth';
import { serviceDb } from '@/lib/db';
import type { StatementSnapshot } from '@/lib/statements';

export const dynamic = 'force-dynamic';

function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function StatementDetailPage({
  params,
}: {
  params: Promise<{ facility: string; id: string }>;
}) {
  const { facility: slug, id } = await params;
  const manager = await currentManager();
  const facility = await requireFacility(manager, slug);

  const { data } = await serviceDb()
    .from('owner_statements')
    .select('id, facility_id, snapshot_json, generated_at, emailed_at')
    .eq('id', id)
    .maybeSingle();
  if (!data || data.facility_id !== facility.id) notFound();

  const s = data.snapshot_json as StatementSnapshot;

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{s.facility.name}</h1>
          <p className="text-sm text-gray-500">
            {s.period_start} → {s.period_end}
          </p>
        </div>
        <Link
          href={`/api/admin/statements/${id}/pdf`}
          className="rounded bg-gray-900 px-3 py-2 text-sm font-medium text-white"
        >
          Download PDF
        </Link>
      </div>

      <div className="rounded-lg bg-gray-900 p-6 text-white">
        <p className="text-sm uppercase tracking-wide opacity-80">Net payout</p>
        <p className="text-4xl font-semibold">{dollars(s.totals.net_payout_cents)}</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500">Totals</h2>
          <dl className="mt-3 space-y-1 text-sm">
            <Row label="Gross revenue" value={dollars(s.totals.gross_cents)} />
            <Row label="Refunds" value={`-${dollars(s.totals.refunds_cents)}`} />
            <Row label="Credits" value={`-${dollars(s.totals.credits_cents)}`} />
            <Row label="Waives" value={`-${dollars(s.totals.waives_cents)}`} />
            <Row
              label="Net payout"
              value={dollars(s.totals.net_payout_cents)}
              strong
            />
          </dl>
        </div>
        <div className="rounded border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500">
            Outstanding
          </h2>
          <dl className="mt-3 space-y-1 text-sm">
            <Row
              label="Current platform"
              value={dollars(s.totals.outstanding_current_cents)}
            />
            <Row
              label="Legacy (pre-platform)"
              value={dollars(s.totals.outstanding_legacy_cents)}
            />
          </dl>

          <h2 className="mt-6 text-sm font-medium uppercase tracking-wide text-gray-500">
            Occupancy
          </h2>
          <dl className="mt-3 space-y-1 text-sm">
            <Row label="Total units" value={String(s.units.unit_count)} />
            <Row label="Occupied" value={String(s.units.occupied_count)} />
            <Row label="Vacant" value={String(s.units.vacant_count)} />
            <Row label="Occupancy %" value={`${s.units.occupancy_percent}%`} />
          </dl>
        </div>
      </section>

      <section className="rounded border border-gray-200 bg-white">
        <h2 className="border-b border-gray-200 p-3 text-sm font-medium uppercase tracking-wide text-gray-500">
          Unit-level breakdown
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
              <th className="px-3 py-2">Unit</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Tenant</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Paid</th>
            </tr>
          </thead>
          <tbody>
            {s.breakdown.map((b) => (
              <tr key={b.unit_id} className="border-b border-gray-100">
                <td className="px-3 py-2 font-medium">{b.label}</td>
                <td className="px-3 py-2 text-gray-600">{b.unit_type ?? '—'}</td>
                <td className="px-3 py-2 text-gray-600">{b.tenant_email ?? '—'}</td>
                <td className="px-3 py-2 text-gray-600">{b.status}</td>
                <td className="px-3 py-2 text-right">{dollars(b.paid_in_period_cents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? 'font-semibold' : ''}`}>
      <dt className="text-gray-600">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

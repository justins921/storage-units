import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentManager, requireFacility } from '@/lib/auth';
import { serviceDb } from '@/lib/db';
import type { StatementSnapshot } from '@/lib/statements';
import { Button, Card, dollars } from '@/lib/ui';

export const dynamic = 'force-dynamic';

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
    <div className="space-y-8">
      <div>
        <Link
          href={`/admin/${slug}/statements`}
          className="text-xs text-slate-500 underline-offset-2 hover:underline"
        >
          ← All statements
        </Link>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              {s.facility.name}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {s.period_start} → {s.period_end}
            </p>
          </div>
          <Link href={`/api/admin/statements/${id}/pdf`}>
            <Button>Download PDF</Button>
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white shadow-card">
        <p className="text-xs font-medium uppercase tracking-wider opacity-70">
          Net payout
        </p>
        <p className="mt-1 text-4xl font-semibold tracking-tight">
          {dollars(s.totals.net_payout_cents)}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Totals
          </h2>
          <dl className="mt-4 space-y-2 text-sm">
            <Row label="Gross revenue" value={dollars(s.totals.gross_cents)} />
            <Row label="Refunds" value={`−${dollars(s.totals.refunds_cents)}`} />
            <Row label="Credits" value={`−${dollars(s.totals.credits_cents)}`} />
            <Row label="Waives" value={`−${dollars(s.totals.waives_cents)}`} />
            <div className="border-t border-slate-100 pt-2">
              <Row label="Net payout" value={dollars(s.totals.net_payout_cents)} strong />
            </div>
          </dl>
        </Card>
        <Card>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Outstanding
          </h2>
          <dl className="mt-4 space-y-2 text-sm">
            <Row
              label="Current platform"
              value={dollars(s.totals.outstanding_current_cents)}
            />
            <Row
              label="Legacy (pre-platform)"
              value={dollars(s.totals.outstanding_legacy_cents)}
            />
          </dl>

          <h2 className="mt-6 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Occupancy
          </h2>
          <dl className="mt-4 space-y-2 text-sm">
            <Row label="Total units" value={String(s.units.unit_count)} />
            <Row label="Occupied" value={String(s.units.occupied_count)} />
            <Row label="Vacant" value={String(s.units.vacant_count)} />
            <Row label="Occupancy %" value={`${s.units.occupancy_percent}%`} />
          </dl>
        </Card>
      </div>

      <Card padded={false}>
        <h2 className="border-b border-slate-100 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Unit-level breakdown
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
              <th className="px-5 py-2 font-medium">Unit</th>
              <th className="px-5 py-2 font-medium">Type</th>
              <th className="px-5 py-2 font-medium">Tenant</th>
              <th className="px-5 py-2 font-medium">Status</th>
              <th className="px-5 py-2 text-right font-medium">Paid</th>
            </tr>
          </thead>
          <tbody>
            {s.breakdown.map((b) => (
              <tr key={b.unit_id} className="border-b border-slate-50 last:border-0">
                <td className="px-5 py-2.5 font-medium text-slate-900">{b.label}</td>
                <td className="px-5 py-2.5 text-slate-600">{b.unit_type ?? '—'}</td>
                <td className="px-5 py-2.5 text-slate-600">{b.tenant_email ?? '—'}</td>
                <td className="px-5 py-2.5 text-slate-600">{b.status}</td>
                <td className="px-5 py-2.5 text-right text-slate-900">
                  {dollars(b.paid_in_period_cents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? 'font-semibold text-slate-900' : ''}`}>
      <dt className="text-slate-600">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

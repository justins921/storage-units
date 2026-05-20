import Link from 'next/link';
import { currentManager, requireFacility } from '@/lib/auth';
import { serviceDb } from '@/lib/db';
import { Badge, Button, Card, Empty, shortDollars } from '@/lib/ui';
import { GenerateNowButton } from './generate-now';

export const dynamic = 'force-dynamic';

export default async function StatementsPage({
  params,
}: {
  params: Promise<{ facility: string }>;
}) {
  const { facility: slug } = await params;
  const manager = await currentManager();
  const facility = await requireFacility(manager, slug);

  const { data } = await serviceDb()
    .from('owner_statements')
    .select(
      'id, period_start, period_end, generated_at, net_payout_cents, gross_cents, emailed_at',
    )
    .eq('facility_id', facility.id)
    .order('period_start', { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            {facility.name}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            Owner statements
          </h1>
        </div>
        <GenerateNowButton facilitySlug={slug} />
      </div>

      {(data ?? []).length === 0 ? (
        <Empty
          title="No statements yet."
          hint='Click "Generate last month" to create one.'
        />
      ) : (
        <Card padded={false}>
          <ul className="divide-y divide-slate-100">
            {(data ?? []).map((s) => (
              <li
                key={s.id as string}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {String(s.period_start)} → {String(s.period_end)}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Generated {new Date(String(s.generated_at)).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {s.emailed_at ? (
                    <Badge tone="emerald">Emailed</Badge>
                  ) : (
                    <Badge tone="gray">Not emailed</Badge>
                  )}
                  <p className="text-sm font-semibold text-slate-900">
                    {shortDollars(Number(s.net_payout_cents))}
                  </p>
                  <Link href={`/admin/${slug}/statements/${s.id}`}>
                    <Button size="sm" variant="secondary">
                      View
                    </Button>
                  </Link>
                  <Link href={`/api/admin/statements/${s.id}/pdf`}>
                    <Button size="sm">PDF</Button>
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

import Link from 'next/link';
import { currentManager, requireFacility } from '@/lib/auth';
import { serviceDb } from '@/lib/db';
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
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Owner statements</h1>
        <GenerateNowButton facilitySlug={slug} />
      </div>

      <ul className="mt-6 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
        {(data ?? []).length === 0 ? (
          <li className="p-4 text-sm text-gray-500">
            No statements yet. Click “Generate last month” to create one.
          </li>
        ) : (
          (data ?? []).map((s) => (
            <li
              key={s.id as string}
              className="flex items-center justify-between gap-3 p-4 text-sm"
            >
              <div>
                <p className="font-medium">
                  {String(s.period_start)} → {String(s.period_end)}
                </p>
                <p className="text-xs text-gray-500">
                  Generated {new Date(String(s.generated_at)).toLocaleString()}
                  {s.emailed_at
                    ? ` · emailed ${new Date(String(s.emailed_at)).toLocaleDateString()}`
                    : ''}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-medium">
                  ${(Number(s.net_payout_cents) / 100).toFixed(0)}
                </span>
                <Link
                  href={`/admin/${slug}/statements/${s.id}`}
                  className="rounded border border-gray-300 px-2 py-1 text-xs"
                >
                  View
                </Link>
                <Link
                  href={`/api/admin/statements/${s.id}/pdf`}
                  className="rounded border border-gray-300 px-2 py-1 text-xs"
                >
                  PDF
                </Link>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

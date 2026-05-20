import Link from 'next/link';
import { currentManager, requireFacility } from '@/lib/auth';
import { serviceDb } from '@/lib/db';
import { Badge, Button, Card, Empty, dollars } from '@/lib/ui';

export const dynamic = 'force-dynamic';

interface UnitTypeRow {
  id: string;
  name: string;
  width_ft: number | null;
  length_ft: number | null;
  monthly_rate_cents: number;
  features: string[];
  unit_count: number;
}

export default async function UnitTypesList({
  params,
}: {
  params: Promise<{ facility: string }>;
}) {
  const { facility: slug } = await params;
  const manager = await currentManager();
  const facility = await requireFacility(manager, slug);
  const db = serviceDb();

  const [types, units] = await Promise.all([
    db
      .from('unit_types')
      .select('id, name, width_ft, length_ft, monthly_rate_cents, features')
      .eq('facility_id', facility.id)
      .order('monthly_rate_cents', { ascending: true }),
    db.from('units').select('unit_type_id').eq('facility_id', facility.id),
  ]);

  const counts = new Map<string, number>();
  for (const u of (units.data ?? []) as { unit_type_id: string | null }[]) {
    if (!u.unit_type_id) continue;
    counts.set(u.unit_type_id, (counts.get(u.unit_type_id) ?? 0) + 1);
  }

  const rows: UnitTypeRow[] = ((types.data ?? []) as Omit<UnitTypeRow, 'unit_count'>[]).map(
    (t) => ({ ...t, unit_count: counts.get(t.id) ?? 0 }),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <Link
            href={`/admin/${slug}/settings`}
            className="text-xs text-slate-500 underline-offset-2 hover:underline"
          >
            ← Settings
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            Unit types
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Pricing tiers. Each unit at this facility belongs to one type.
          </p>
        </div>
        <Link href={`/admin/${slug}/settings/unit-types/new`}>
          <Button>+ New unit type</Button>
        </Link>
      </div>

      {rows.length === 0 ? (
        <Empty
          title="No unit types yet."
          hint="Create the first one to start adding units."
          action={
            <Link href={`/admin/${slug}/settings/unit-types/new`}>
              <Button>+ New unit type</Button>
            </Link>
          }
        />
      ) : (
        <Card padded={false}>
          <ul className="divide-y divide-slate-100">
            {rows.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/admin/${slug}/settings/unit-types/${t.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:bg-slate-50"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{t.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {t.width_ft && t.length_ft
                        ? `${t.width_ft}×${t.length_ft} ft · `
                        : ''}
                      {dollars(t.monthly_rate_cents)} / mo
                    </p>
                    {t.features.length > 0 ? (
                      <ul className="mt-2 flex flex-wrap gap-1">
                        {t.features.map((f) => (
                          <li key={f}>
                            <Badge tone="gray">{f}</Badge>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <p className="text-base font-semibold text-slate-900">
                      {t.unit_count}
                    </p>
                    <p>units</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

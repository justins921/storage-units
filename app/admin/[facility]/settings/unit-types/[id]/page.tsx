import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentManager, requireFacility } from '@/lib/auth';
import { serviceDb } from '@/lib/db';
import { Card, Empty, UnitStatusBadge, dollars } from '@/lib/ui';
import { EditUnitTypeForm } from './edit-form';
import { AddUnitsForm } from './add-units-form';
import { DeleteUnitButton } from './delete-unit-button';

export const dynamic = 'force-dynamic';

export default async function UnitTypeDetail({
  params,
}: {
  params: Promise<{ facility: string; id: string }>;
}) {
  const { facility: slug, id } = await params;
  const manager = await currentManager();
  const facility = await requireFacility(manager, slug);

  const db = serviceDb();
  const [typeRes, unitsRes] = await Promise.all([
    db
      .from('unit_types')
      .select(
        'id, facility_id, name, width_ft, length_ft, monthly_rate_cents, features, description',
      )
      .eq('id', id)
      .maybeSingle(),
    db
      .from('units')
      .select('id, label, status, monthly_rate_cents')
      .eq('facility_id', facility.id)
      .eq('unit_type_id', id)
      .order('label', { ascending: true }),
  ]);

  if (!typeRes.data || typeRes.data.facility_id !== facility.id) notFound();
  const t = typeRes.data as {
    id: string;
    facility_id: string;
    name: string;
    width_ft: number | null;
    length_ft: number | null;
    monthly_rate_cents: number;
    features: string[];
    description: string | null;
  };
  const units = (unitsRes.data ?? []) as {
    id: string;
    label: string;
    status: string;
    monthly_rate_cents: number;
  }[];

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/admin/${slug}/settings/unit-types`}
          className="text-xs text-slate-500 underline-offset-2 hover:underline"
        >
          ← Unit types
        </Link>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              {t.name}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {t.width_ft && t.length_ft ? `${t.width_ft}×${t.length_ft} ft · ` : ''}
              {dollars(t.monthly_rate_cents)} / mo · {units.length} unit
              {units.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Edit
          </h2>
          <div className="mt-3">
            <EditUnitTypeForm
              facilitySlug={slug}
              unitType={{
                id: t.id,
                name: t.name,
                width_ft: t.width_ft,
                length_ft: t.length_ft,
                monthly_rate_cents: t.monthly_rate_cents,
                features: t.features,
                description: t.description,
              }}
            />
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Add units
          </h2>
          <div className="mt-3">
            <AddUnitsForm facilitySlug={slug} unitTypeId={t.id} />
          </div>
        </section>
      </div>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Units in this tier
        </h2>
        <div className="mt-3">
          {units.length === 0 ? (
            <Empty title="No units yet." hint="Add some with the form above." />
          ) : (
            <Card padded={false}>
              <ul className="divide-y divide-slate-100">
                {units.map((u) => (
                  <li
                    key={u.id}
                    className="flex items-center justify-between gap-3 p-3 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <p className="font-medium text-slate-900">{u.label}</p>
                      <UnitStatusBadge status={u.status} />
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-xs text-slate-500">
                        {dollars(u.monthly_rate_cents)} / mo
                      </p>
                      <DeleteUnitButton
                        facilitySlug={slug}
                        unitId={u.id}
                        disabled={u.status === 'occupied'}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}

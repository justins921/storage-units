import Link from 'next/link';
import { currentManager, requireFacility } from '@/lib/auth';
import { listUnits } from '@/lib/admin-queries';
import { Card, UnitStatusBadge, dollars } from '@/lib/ui';
import { ForceStatusForm } from './force-status-form';

export const dynamic = 'force-dynamic';

export default async function UnitsPage({
  params,
}: {
  params: Promise<{ facility: string }>;
}) {
  const { facility: slug } = await params;
  const manager = await currentManager();
  const facility = await requireFacility(manager, slug);
  const units = await listUnits(facility.id);

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            {facility.name}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Units</h1>
        </div>
        <p className="text-sm text-slate-500">{units.length} total</p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {units.map((u) => (
          <li key={u.id}>
            <Card>
              <div className="flex items-baseline justify-between">
                <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                  {u.label}
                </h2>
                <UnitStatusBadge status={u.status} />
              </div>
              <p className="mt-0.5 text-xs text-slate-500">{u.unit_type_name ?? 'unit'}</p>
              <p className="mt-3 text-sm font-medium text-slate-900">
                {dollars(u.monthly_rate_cents)}
                <span className="font-normal text-slate-500"> / mo</span>
              </p>
              {u.locked_until ? (
                <p className="mt-2 text-xs text-amber-700">
                  Locked until {new Date(u.locked_until).toLocaleString()}
                </p>
              ) : null}
              {u.active_lease ? (
                <p className="mt-3 text-xs text-slate-600">
                  Leased to{' '}
                  <Link
                    href={`/admin/${slug}/tenants/${u.active_lease.tenant_id}`}
                    className="font-medium text-slate-900 underline-offset-2 hover:underline"
                  >
                    {u.active_lease.tenant_email}
                  </Link>
                  <br />
                  <span className="text-slate-500">
                    since {new Date(u.active_lease.started_at).toLocaleDateString()}
                  </span>
                </p>
              ) : null}
              <div className="mt-4 border-t border-slate-100 pt-3">
                <ForceStatusForm
                  unitId={u.id}
                  facilitySlug={slug}
                  currentStatus={u.status}
                />
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

import Link from 'next/link';
import { currentManager, requireFacility } from '@/lib/auth';
import { listUnits } from '@/lib/admin-queries';
import { ForceStatusForm } from './force-status-form';

export const dynamic = 'force-dynamic';

const STATUS_CLASS: Record<string, string> = {
  available: 'bg-emerald-100 text-emerald-800',
  occupied: 'bg-blue-100 text-blue-800',
  maintenance: 'bg-amber-100 text-amber-800',
  out_of_service: 'bg-gray-200 text-gray-700',
};

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
    <div>
      <h1 className="text-2xl font-semibold">Units</h1>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {units.map((u) => {
          const cls = STATUS_CLASS[u.status] ?? 'bg-gray-100 text-gray-700';
          return (
            <li key={u.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-baseline justify-between">
                <h2 className="text-lg font-medium">{u.label}</h2>
                <span className={`rounded-full px-2 py-0.5 text-xs ${cls}`}>{u.status}</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">{u.unit_type_name ?? 'unit'}</p>
              <p className="mt-2 text-sm">${(u.monthly_rate_cents / 100).toFixed(2)}/mo</p>
              {u.locked_until ? (
                <p className="mt-1 text-xs text-amber-700">
                  Locked until {new Date(u.locked_until).toLocaleString()}
                </p>
              ) : null}
              {u.active_lease ? (
                <p className="mt-2 text-xs text-gray-600">
                  Leased to{' '}
                  <Link
                    href={`/admin/${slug}/tenants/${u.active_lease.tenant_id}`}
                    className="underline"
                  >
                    {u.active_lease.tenant_email}
                  </Link>{' '}
                  since {new Date(u.active_lease.started_at).toLocaleDateString()}
                </p>
              ) : null}
              <ForceStatusForm
                unitId={u.id}
                facilitySlug={slug}
                currentStatus={u.status}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

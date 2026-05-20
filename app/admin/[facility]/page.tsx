import { currentManager, requireFacility } from '@/lib/auth';
import { dashboardSummary } from '@/lib/admin-queries';

export const dynamic = 'force-dynamic';

export default async function FacilityDashboard({
  params,
}: {
  params: Promise<{ facility: string }>;
}) {
  const { facility: slug } = await params;
  const manager = await currentManager();
  const facility = await requireFacility(manager, slug);
  const s = await dashboardSummary(facility.id);

  const cards = [
    { label: 'Occupancy', value: `${s.occupancyPercent}%`, sub: `${s.occupiedCount}/${s.unitCount} units` },
    { label: 'Available', value: String(s.availableCount), sub: 'ready to rent' },
    { label: 'Past due', value: String(s.pastDueCount), sub: 'leases' },
    {
      label: 'Revenue 30d',
      value: `$${(s.revenueLast30dCents / 100).toFixed(0)}`,
      sub: 'collected',
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold">{facility.name}</h1>
      <p className="mt-1 text-sm text-gray-500">/{slug}</p>
      <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cards.map((c) => (
          <li key={c.label} className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">{c.label}</p>
            <p className="mt-1 text-2xl font-semibold">{c.value}</p>
            <p className="text-xs text-gray-500">{c.sub}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

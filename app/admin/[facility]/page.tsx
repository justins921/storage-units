import { currentManager, requireFacility } from '@/lib/auth';
import { dashboardSummary } from '@/lib/admin-queries';
import { Stat, shortDollars } from '@/lib/ui';

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

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
          Dashboard
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
          {facility.name}
        </h1>
        <p className="mt-1 text-sm text-slate-500">/{slug}</p>
      </header>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat
          label="Occupancy"
          value={`${s.occupancyPercent}%`}
          sub={`${s.occupiedCount}/${s.unitCount} units`}
          tone={s.occupancyPercent > 80 ? 'emerald' : 'amber'}
        />
        <Stat
          label="Available"
          value={s.availableCount}
          sub="ready to rent"
          tone="emerald"
        />
        <Stat
          label="Past due"
          value={s.pastDueCount}
          sub="leases"
          tone={s.pastDueCount > 0 ? 'red' : 'gray'}
        />
        <Stat
          label="Revenue · 30d"
          value={shortDollars(s.revenueLast30dCents)}
          sub="collected"
          tone="blue"
        />
      </section>
    </div>
  );
}

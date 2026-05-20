import Link from 'next/link';
import { currentManager, requireFacility } from '@/lib/auth';
import { listTenants } from '@/lib/admin-queries';
import { Badge, Card, Empty, shortDollars } from '@/lib/ui';
import { TenantSearch } from './tenant-search';

export const dynamic = 'force-dynamic';

export default async function TenantsPage({
  params,
  searchParams,
}: {
  params: Promise<{ facility: string }>;
  searchParams: Promise<{ q?: string; filter?: string }>;
}) {
  const { facility: slug } = await params;
  const { q, filter } = await searchParams;
  const manager = await currentManager();
  const facility = await requireFacility(manager, slug);
  const all = await listTenants(facility.id);

  let rows = all;
  if (q) {
    const needle = q.toLowerCase();
    rows = rows.filter(
      (t) =>
        t.email.toLowerCase().includes(needle) ||
        (t.display_name?.toLowerCase().includes(needle) ?? false) ||
        (t.phone?.includes(needle) ?? false),
    );
  }
  if (filter === 'past_due') rows = rows.filter((t) => t.past_due_leases > 0);
  if (filter === 'active') rows = rows.filter((t) => t.active_leases > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            {facility.name}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            Tenants
          </h1>
        </div>
        <p className="text-sm text-slate-500">{all.length} total</p>
      </div>

      <TenantSearch facilitySlug={slug} initialQuery={q ?? ''} initialFilter={filter ?? 'all'} />

      {rows.length === 0 ? (
        <Empty title="No tenants match." />
      ) : (
        <Card padded={false}>
          <ul className="divide-y divide-slate-100">
            {rows.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/admin/${slug}/tenants/${t.id}`}
                  className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {t.display_name ?? t.email}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {t.email}
                      {t.phone ? ` · ${t.phone}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {t.active_leases > 0 ? (
                      <Badge tone="emerald">{t.active_leases} active</Badge>
                    ) : null}
                    {t.past_due_leases > 0 ? (
                      <Badge tone="red">{t.past_due_leases} past due</Badge>
                    ) : null}
                    <span className="hidden text-xs text-slate-500 sm:inline">
                      {shortDollars(t.total_paid_cents)} paid
                    </span>
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

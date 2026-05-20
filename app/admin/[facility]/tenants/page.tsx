import Link from 'next/link';
import { currentManager, requireFacility } from '@/lib/auth';
import { listTenants } from '@/lib/admin-queries';
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
    <div>
      <h1 className="text-2xl font-semibold">Tenants</h1>
      <TenantSearch facilitySlug={slug} initialQuery={q ?? ''} initialFilter={filter ?? 'all'} />
      <ul className="mt-4 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
        {rows.length === 0 ? (
          <li className="p-4 text-sm text-gray-500">No tenants match.</li>
        ) : (
          rows.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 p-4">
              <div>
                <Link
                  href={`/admin/${slug}/tenants/${t.id}`}
                  className="text-sm font-medium underline"
                >
                  {t.display_name ?? t.email}
                </Link>
                <p className="text-xs text-gray-500">
                  {t.email}
                  {t.phone ? ` · ${t.phone}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span>{t.active_leases} active</span>
                {t.past_due_leases > 0 ? (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-700">
                    {t.past_due_leases} past due
                  </span>
                ) : null}
                <span className="text-gray-500">
                  ${(t.total_paid_cents / 100).toFixed(0)} paid
                </span>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

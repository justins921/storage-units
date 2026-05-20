import Link from 'next/link';
import { currentManager, managerFacilities, requireFacility } from '@/lib/auth';
import { FacilitySwitcher } from './facility-switcher';
import { AdminNav } from './admin-nav';

export const dynamic = 'force-dynamic';

export default async function FacilityLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ facility: string }>;
}) {
  const { facility: slug } = await params;
  const manager = await currentManager();
  const facility = await requireFacility(manager, slug);
  const facilities = await managerFacilities(manager);

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-3">
            <Link href={`/admin/${slug}`} className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-slate-900" />
              <span className="text-sm font-semibold tracking-tight text-slate-900">
                {facility.name}
              </span>
            </Link>
            {facilities.length > 1 ? (
              <>
                <span className="text-slate-300">/</span>
                <FacilitySwitcher currentSlug={slug} facilities={facilities} />
              </>
            ) : null}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-slate-500 sm:inline">{manager.email}</span>
            <form action="/admin/auth/signout" method="post">
              <button
                type="submit"
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
        <AdminNav slug={slug} />
      </header>
      <div className="mx-auto max-w-6xl px-6 py-10">{children}</div>
    </div>
  );
}

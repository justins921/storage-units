import Link from 'next/link';
import { currentManager, managerFacilities, requireFacility } from '@/lib/auth';
import { FacilitySwitcher } from './facility-switcher';

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

  const nav = [
    { href: `/admin/${slug}`, label: 'Dashboard' },
    { href: `/admin/${slug}/units`, label: 'Units' },
    { href: `/admin/${slug}/tenants`, label: 'Tenants' },
    { href: `/admin/${slug}/statements`, label: 'Statements' },
    { href: `/admin/${slug}/settings/sms-templates`, label: 'SMS templates' },
    { href: `/admin/debug`, label: 'Debug' },
  ];

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="font-semibold">{facility.name}</span>
            {facilities.length > 1 ? (
              <FacilitySwitcher
                currentSlug={slug}
                facilities={facilities}
              />
            ) : null}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-500">{manager.email}</span>
            <form action="/admin/auth/signout" method="post">
              <button type="submit" className="rounded border border-gray-300 px-2 py-1 text-xs">
                Sign out
              </button>
            </form>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-4 overflow-x-auto px-6 pb-3 text-sm">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="text-gray-700 hover:text-gray-900">
              {n.label}
            </Link>
          ))}
        </nav>
      </header>
      <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
    </div>
  );
}


'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function AdminNav({ slug }: { slug: string }) {
  const pathname = usePathname();

  const items = [
    { href: `/admin/${slug}`, label: 'Dashboard', exact: true },
    { href: `/admin/${slug}/units`, label: 'Units' },
    { href: `/admin/${slug}/tenants`, label: 'Tenants' },
    { href: `/admin/${slug}/statements`, label: 'Statements' },
    { href: `/admin/${slug}/settings/sms-templates`, label: 'SMS templates' },
    { href: `/admin/debug`, label: 'Debug' },
  ];

  return (
    <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 text-sm">
      {items.map((it) => {
        const active = it.exact
          ? pathname === it.href
          : pathname === it.href || pathname.startsWith(it.href + '/');
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`-mb-px border-b-2 px-3 py-2.5 text-sm transition-colors ${
              active
                ? 'border-slate-900 font-medium text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}

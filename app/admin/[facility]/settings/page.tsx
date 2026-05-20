import Link from 'next/link';
import { currentManager, requireFacility } from '@/lib/auth';
import { Card } from '@/lib/ui';

export const dynamic = 'force-dynamic';

export default async function SettingsHub({
  params,
}: {
  params: Promise<{ facility: string }>;
}) {
  const { facility: slug } = await params;
  const manager = await currentManager();
  const facility = await requireFacility(manager, slug);

  const sections = [
    {
      href: `/admin/${slug}/settings/facility`,
      title: 'Facility',
      desc: 'Name, slug, hero copy, and brand color.',
    },
    {
      href: `/admin/${slug}/settings/unit-types`,
      title: 'Unit types & units',
      desc: 'Pricing tiers and the individual units that fall under each.',
    },
    {
      href: `/admin/${slug}/settings/sms-templates`,
      title: 'SMS templates',
      desc: 'Dunning messages sent on day 3, 5, 7, 10, 14 past due.',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
          {facility.name}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
          Settings
        </h1>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {sections.map((s) => (
          <li key={s.href}>
            <Link href={s.href}>
              <Card className="transition-all hover:border-slate-300 hover:shadow-cardHover">
                <p className="text-sm font-semibold text-slate-900">{s.title}</p>
                <p className="mt-1 text-xs text-slate-500">{s.desc}</p>
              </Card>
            </Link>
          </li>
        ))}
      </ul>

      <div className="border-t border-slate-200 pt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Operator
        </h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          <li>
            <Link href="/admin/facilities/new">
              <Card className="transition-all hover:border-slate-300 hover:shadow-cardHover">
                <p className="text-sm font-semibold text-slate-900">+ New facility</p>
                <p className="mt-1 text-xs text-slate-500">
                  Add another physical facility to this account.
                </p>
              </Card>
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}

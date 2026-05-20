import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentManager, managerFacilities } from '@/lib/auth';
import { Card, Empty } from '@/lib/ui';

export const dynamic = 'force-dynamic';

export default async function AdminHome() {
  const manager = await currentManager();
  const facilities = await managerFacilities(manager);

  if (facilities.length === 0) {
    return (
      <main className="mx-auto max-w-xl px-6 py-20">
        <Empty
          title="No facilities."
          hint="Your account exists but is not linked to any facilities. Contact your operator."
        />
      </main>
    );
  }

  if (facilities.length === 1) {
    redirect(`/admin/${facilities[0].slug}`);
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-20">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Pick a facility</h1>
      <ul className="mt-6 space-y-2">
        {facilities.map((f) => (
          <li key={f.id}>
            <Link href={`/admin/${f.slug}`}>
              <Card className="hover:border-slate-300 hover:shadow-cardHover">
                <p className="text-base font-medium text-slate-900">{f.name}</p>
                <p className="mt-0.5 text-xs text-slate-500">/{f.slug}</p>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

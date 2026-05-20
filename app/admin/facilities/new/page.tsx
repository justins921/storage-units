import Link from 'next/link';
import { currentManager, managerFacilities } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { NewFacilityForm } from './form';

export const dynamic = 'force-dynamic';

export default async function NewFacilityPage() {
  const manager = await currentManager();
  const facilities = await managerFacilities(manager);
  // A manager needs at least one existing facility so we can inherit org_id.
  // In a brand-new deployment, this means the first facility comes from the
  // seed; subsequent facilities can be added through this form.
  if (facilities.length === 0) redirect('/admin');

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link
        href={`/admin/${facilities[0].slug}/settings`}
        className="text-xs text-slate-500 underline-offset-2 hover:underline"
      >
        ← Settings
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
        New facility
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Adds another physical facility to this operator. You&apos;ll define unit types
        and units on the next screens.
      </p>

      <div className="mt-6">
        <NewFacilityForm />
      </div>
    </main>
  );
}

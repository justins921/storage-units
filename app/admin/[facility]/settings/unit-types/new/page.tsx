import Link from 'next/link';
import { currentManager, requireFacility } from '@/lib/auth';
import { NewUnitTypeForm } from './form';

export const dynamic = 'force-dynamic';

export default async function NewUnitType({
  params,
}: {
  params: Promise<{ facility: string }>;
}) {
  const { facility: slug } = await params;
  const manager = await currentManager();
  await requireFacility(manager, slug);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link
          href={`/admin/${slug}/settings/unit-types`}
          className="text-xs text-slate-500 underline-offset-2 hover:underline"
        >
          ← Unit types
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          New unit type
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Define a pricing tier. You&apos;ll add the individual units on the next screen.
        </p>
      </div>

      <NewUnitTypeForm facilitySlug={slug} />
    </div>
  );
}

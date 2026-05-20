import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentManager, managerFacilities } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Top-level admin page. Single-facility managers get redirected straight
// into their facility; multi-facility managers see the switcher.
export default async function AdminHome() {
  const manager = await currentManager();
  const facilities = await managerFacilities(manager);

  if (facilities.length === 0) {
    return (
      <main className="mx-auto max-w-xl px-6 py-16">
        <h1 className="text-xl font-semibold">No facilities</h1>
        <p className="mt-2 text-sm text-gray-600">
          Your account exists but is not linked to any facilities. Contact your operator.
        </p>
      </main>
    );
  }

  if (facilities.length === 1) {
    redirect(`/admin/${facilities[0].slug}`);
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Pick a facility</h1>
      <ul className="mt-6 space-y-2">
        {facilities.map((f) => (
          <li key={f.id}>
            <Link
              href={`/admin/${f.slug}`}
              className="block rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-400"
            >
              <span className="text-lg font-medium">{f.name}</span>
              <span className="ml-2 text-sm text-gray-500">/{f.slug}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

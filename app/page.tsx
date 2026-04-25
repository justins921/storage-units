import { serviceDb } from '@/lib/db';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

// Root page lists configured facilities. Per-facility landing pages live
// at /[facility]. In production we'll switch on subdomain vs. slug routing
// based on host header; for the scaffold a slug list is sufficient.
export default async function Home() {
  const { data: facilities } = await serviceDb()
    .from('facilities')
    .select('slug, name')
    .order('name', { ascending: true });

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold">{process.env.ORG_NAME ?? 'Storage Co'}</h1>
      <p className="mt-2 text-gray-600">Choose a facility to reserve a unit.</p>
      <ul className="mt-8 space-y-3">
        {(facilities ?? []).map((f) => (
          <li key={f.slug}>
            <Link
              href={`/${f.slug}`}
              className="block rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-400"
            >
              <span className="text-lg font-medium">{f.name}</span>
              <span className="ml-2 text-sm text-gray-500">/{f.slug}</span>
            </Link>
          </li>
        ))}
        {(facilities ?? []).length === 0 && (
          <li className="rounded-lg border border-dashed border-gray-300 p-6 text-sm text-gray-500">
            No facilities seeded yet. Run <code>npm run seed</code>.
          </li>
        )}
      </ul>
    </main>
  );
}

import { serviceDb } from '@/lib/db';
import { Empty } from '@/lib/ui';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const { data: facilities } = await serviceDb()
    .from('facilities')
    .select('slug, name')
    .order('name', { ascending: true });

  return (
    <main className="mx-auto max-w-4xl px-6 py-20">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
          {process.env.ORG_NAME ?? 'Storage Co'}
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900">
          Self-storage, reserved online.
        </h1>
        <p className="max-w-xl text-base text-slate-600">
          Pick a facility to browse available units and reserve in under two minutes.
        </p>
      </div>

      <div className="mt-12">
        {(facilities ?? []).length === 0 ? (
          <Empty
            title="No facilities published yet."
            hint="Run the seed once your Supabase project is provisioned."
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {(facilities ?? []).map((f) => (
              <li key={f.slug}>
                <Link
                  href={`/${f.slug}`}
                  className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-card transition-all hover:border-slate-300 hover:shadow-cardHover"
                >
                  <div>
                    <p className="text-base font-medium text-slate-900">{f.name}</p>
                    <p className="text-xs text-slate-500">storage.example.com/{f.slug}</p>
                  </div>
                  <span className="text-slate-400 transition-transform group-hover:translate-x-0.5">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

import { notFound } from 'next/navigation';
import { getFacilityBySlug, listAvailableUnits } from '@/lib/booking';
import { ReserveButton } from './reserve-button';

export const dynamic = 'force-dynamic';

interface Branding {
  hero_title?: string;
  hero_subtitle?: string;
  primary_color?: string;
  logo_url?: string;
}

export default async function FacilityLanding({
  params,
}: {
  params: Promise<{ facility: string }>;
}) {
  const { facility: slug } = await params;
  const facility = await getFacilityBySlug(slug);
  if (!facility) notFound();

  const branding = (facility.branding_json ?? {}) as Branding;
  const units = await listAvailableUnits(facility.id);

  // Group available units by their type so the page reads as
  // "10x10 — 4 available — $129/mo — Reserve" instead of a flat list.
  const byType = new Map<string, typeof units>();
  for (const u of units) {
    const k = u.unit_type.id;
    const list = byType.get(k);
    if (list) list.push(u);
    else byType.set(k, [u]);
  }

  return (
    <main
      className="min-h-screen"
      style={
        branding.primary_color
          ? ({ ['--color-brand' as never]: hexToRgbTriplet(branding.primary_color) } as never)
          : undefined
      }
    >
      <header className="bg-brand text-brand-fg">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <p className="text-sm uppercase tracking-wide opacity-80">{facility.name}</p>
          <h1 className="mt-2 text-4xl font-semibold">
            {branding.hero_title ?? 'Storage units available now'}
          </h1>
          {branding.hero_subtitle ? (
            <p className="mt-4 max-w-2xl text-lg opacity-90">{branding.hero_subtitle}</p>
          ) : null}
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-12">
        <h2 className="text-2xl font-semibold">Available units</h2>
        {byType.size === 0 ? (
          <p className="mt-6 rounded-lg border border-dashed border-gray-300 p-6 text-gray-500">
            No units available at this facility right now.
          </p>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {Array.from(byType.entries()).map(([typeId, list]) => {
              const t = list[0].unit_type;
              const cheapest = list.reduce(
                (min, u) => (u.monthly_rate_cents < min ? u.monthly_rate_cents : min),
                list[0].monthly_rate_cents,
              );
              const pick = list[0];
              return (
                <li
                  key={typeId}
                  className="flex flex-col rounded-lg border border-gray-200 bg-white p-5"
                >
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-lg font-medium">{t.name}</h3>
                    <span className="text-sm text-gray-500">{list.length} available</span>
                  </div>
                  {t.description ? (
                    <p className="mt-1 text-sm text-gray-600">{t.description}</p>
                  ) : null}
                  {t.features.length > 0 ? (
                    <ul className="mt-2 flex flex-wrap gap-1">
                      {t.features.map((f) => (
                        <li
                          key={f}
                          className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                        >
                          {f}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <p className="mt-4 text-2xl font-semibold">
                    ${(cheapest / 100).toFixed(0)}
                    <span className="text-base font-normal text-gray-500">/mo</span>
                  </p>
                  <ReserveButton unitId={pick.id} unitLabel={pick.label} />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}

function hexToRgbTriplet(hex: string): string {
  const m = hex.replace('#', '');
  const v =
    m.length === 3
      ? m
          .split('')
          .map((c) => c + c)
          .join('')
      : m;
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

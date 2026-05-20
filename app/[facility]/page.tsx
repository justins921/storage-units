import { notFound } from 'next/navigation';
import { getFacilityBySlug, listAvailableUnits } from '@/lib/booking';
import { Badge, Card, Empty } from '@/lib/ui';
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
        <div className="mx-auto max-w-5xl px-6 py-20 sm:py-24">
          <p className="text-xs font-medium uppercase tracking-wider opacity-80">
            {facility.name}
          </p>
          <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
            {branding.hero_title ?? 'Storage units available now.'}
          </h1>
          {branding.hero_subtitle ? (
            <p className="mt-5 max-w-2xl text-lg opacity-90">{branding.hero_subtitle}</p>
          ) : null}
          <div className="mt-8 flex items-center gap-3 text-sm opacity-80">
            <span>✓ Month-to-month</span>
            <span className="opacity-50">·</span>
            <span>✓ 24/7 access</span>
            <span className="opacity-50">·</span>
            <span>✓ Reserve online</span>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="flex items-baseline justify-between">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Available units
          </h2>
          <p className="text-sm text-slate-500">{units.length} ready to rent</p>
        </div>

        {byType.size === 0 ? (
          <div className="mt-6">
            <Empty
              title="No units available at this facility right now."
              hint="Check back soon, or contact the office."
            />
          </div>
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
                <li key={typeId}>
                  <Card>
                    <div className="flex items-baseline justify-between">
                      <h3 className="text-lg font-semibold tracking-tight text-slate-900">
                        {t.name}
                      </h3>
                      <Badge tone="emerald">{list.length} left</Badge>
                    </div>
                    {t.description ? (
                      <p className="mt-1.5 text-sm text-slate-600">{t.description}</p>
                    ) : null}
                    {t.features.length > 0 ? (
                      <ul className="mt-3 flex flex-wrap gap-1.5">
                        {t.features.map((f) => (
                          <li key={f}>
                            <Badge tone="gray">{f}</Badge>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <div className="mt-5 flex items-baseline gap-1">
                      <p className="text-3xl font-semibold tracking-tight text-slate-900">
                        ${(cheapest / 100).toFixed(0)}
                      </p>
                      <p className="text-sm text-slate-500">/mo</p>
                    </div>
                    <ReserveButton unitId={pick.id} unitLabel={pick.label} />
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-8 text-xs text-slate-500">
          © {new Date().getFullYear()} {facility.name}. All rights reserved.
        </div>
      </footer>
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

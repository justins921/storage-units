import Link from 'next/link';
import { currentManager, requireFacility } from '@/lib/auth';
import { serviceDb } from '@/lib/db';
import { FacilityForm } from './form';

export const dynamic = 'force-dynamic';

interface Branding {
  hero_title?: string;
  hero_subtitle?: string;
  primary_color?: string;
  logo_url?: string;
}

export default async function FacilitySettings({
  params,
}: {
  params: Promise<{ facility: string }>;
}) {
  const { facility: slug } = await params;
  const manager = await currentManager();
  const facility = await requireFacility(manager, slug);

  const { data } = await serviceDb()
    .from('facilities')
    .select('id, slug, name, branding_json')
    .eq('id', facility.id)
    .single();

  const branding = (data?.branding_json ?? {}) as Branding;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link
          href={`/admin/${slug}/settings`}
          className="text-xs text-slate-500 underline-offset-2 hover:underline"
        >
          ← Settings
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          Facility info
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Editable without code changes. Slug change rewrites the public URL.
        </p>
      </div>

      <FacilityForm
        currentSlug={slug}
        initial={{
          name: data?.name ?? '',
          slug: data?.slug ?? '',
          hero_title: branding.hero_title ?? '',
          hero_subtitle: branding.hero_subtitle ?? '',
          primary_color: branding.primary_color ?? '',
          logo_url: branding.logo_url ?? '',
        }}
      />
    </div>
  );
}

'use server';

import { revalidatePath } from 'next/cache';
import { currentManager, requireFacility } from '@/lib/auth';
import { serviceDb } from '@/lib/db';
import { writeAudit } from '@/lib/audit';

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export async function saveFacility(input: {
  currentSlug: string;
  name: string;
  slug: string;
  hero_title: string;
  hero_subtitle: string;
  primary_color: string;
  logo_url: string;
}): Promise<{ error?: string; newSlug?: string } | undefined> {
  if (!input.name.trim()) return { error: 'Name is required.' };
  if (!SLUG_RE.test(input.slug)) {
    return { error: 'Slug must be lowercase letters, numbers, and dashes only.' };
  }
  if (input.primary_color && !/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(input.primary_color)) {
    return { error: 'Primary color must be a hex code like #0f4c81.' };
  }

  const manager = await currentManager();
  const facility = await requireFacility(manager, input.currentSlug);

  // If slug changed, make sure the new one is free.
  if (input.slug !== facility.slug) {
    const { data: collision } = await serviceDb()
      .from('facilities')
      .select('id')
      .eq('slug', input.slug)
      .maybeSingle();
    if (collision) return { error: 'That slug is already in use.' };
  }

  const branding: Record<string, string> = {};
  if (input.hero_title) branding.hero_title = input.hero_title;
  if (input.hero_subtitle) branding.hero_subtitle = input.hero_subtitle;
  if (input.primary_color) branding.primary_color = input.primary_color;
  if (input.logo_url) branding.logo_url = input.logo_url;

  const { error } = await serviceDb()
    .from('facilities')
    .update({
      name: input.name,
      slug: input.slug,
      branding_json: branding,
      updated_at: new Date().toISOString(),
    })
    .eq('id', facility.id);
  if (error) return { error: error.message };

  await writeAudit({
    facilityId: facility.id,
    actorManagerId: manager.id,
    action: 'facility_update',
    targetTable: 'facilities',
    targetId: facility.id,
    metadata: { fields: Object.keys(branding).concat(['name', 'slug']) },
  });

  revalidatePath(`/admin/${input.slug}/settings/facility`);
  revalidatePath(`/${input.slug}`);
  return { newSlug: input.slug };
}

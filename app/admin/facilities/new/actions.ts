'use server';

import { revalidatePath } from 'next/cache';
import { currentManager } from '@/lib/auth';
import { serviceDb } from '@/lib/db';
import { writeAudit } from '@/lib/audit';
import { DEFAULT_TEMPLATES, DUNNING_SCHEDULE } from '@/lib/dunning';

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export async function createFacility(input: {
  name: string;
  slug: string;
  hero_title: string;
  hero_subtitle: string;
  primary_color: string;
}): Promise<{ slug?: string; error?: string }> {
  if (!input.name.trim()) return { error: 'Name is required.' };
  if (!SLUG_RE.test(input.slug)) {
    return { error: 'Slug must be lowercase letters, numbers, and dashes only.' };
  }
  if (
    input.primary_color &&
    !/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(input.primary_color)
  ) {
    return { error: 'Primary color must be a hex code like #0f4c81.' };
  }

  const manager = await currentManager();
  if (manager.facility_access.length === 0) {
    return { error: 'No existing facility to inherit org from. Contact support.' };
  }

  const db = serviceDb();

  // Reject collisions early so we can return a clean error.
  const { data: collision } = await db
    .from('facilities')
    .select('id')
    .eq('slug', input.slug)
    .maybeSingle();
  if (collision) return { error: 'That slug is already in use.' };

  // Inherit org_id from the manager's first facility. The architecture
  // rule from the spec: org_id groups multi-facility operators, not
  // cross-client tenancy.
  const { data: existing, error: existingErr } = await db
    .from('facilities')
    .select('org_id')
    .eq('id', manager.facility_access[0])
    .single();
  if (existingErr) return { error: existingErr.message };
  const orgId = (existing as { org_id: string }).org_id;

  const branding: Record<string, string> = {};
  if (input.hero_title) branding.hero_title = input.hero_title;
  if (input.hero_subtitle) branding.hero_subtitle = input.hero_subtitle;
  if (input.primary_color) branding.primary_color = input.primary_color;

  const { data: created, error: createErr } = await db
    .from('facilities')
    .insert({
      org_id: orgId,
      slug: input.slug,
      name: input.name.trim(),
      branding_json: branding,
    })
    .select('id, slug')
    .single();
  if (createErr) return { error: createErr.message };

  const newFacilityId = (created as { id: string; slug: string }).id;

  // Give the creating manager access to the new facility.
  const updatedAccess = Array.from(
    new Set([...manager.facility_access, newFacilityId]),
  );
  const { error: managerErr } = await db
    .from('managers')
    .update({ facility_access: updatedAccess })
    .eq('id', manager.id);
  if (managerErr) return { error: managerErr.message };

  // Seed default SMS templates so dunning works out of the box.
  const templateRows = DUNNING_SCHEDULE.flatMap((step) => {
    const body = DEFAULT_TEMPLATES[step.key];
    if (!body) return [];
    return [{ facility_id: newFacilityId, key: step.key, body }];
  });
  if (templateRows.length > 0) {
    await db.from('sms_templates').insert(templateRows);
  }

  await writeAudit({
    facilityId: newFacilityId,
    actorManagerId: manager.id,
    action: 'facility_create',
    targetTable: 'facilities',
    targetId: newFacilityId,
    metadata: { slug: input.slug, name: input.name },
  });

  revalidatePath('/admin');
  return { slug: (created as { slug: string }).slug };
}

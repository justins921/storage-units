// Idempotent seed runner. Selects the seed file from the SEED env var
// (default: chandler) so each client deployment ships with the right data.
//
// Usage: SEED=chandler npm run seed
//
// To bootstrap an admin user, set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD.
// We provision the auth user via the Supabase admin API and link a
// managers row with facility_access for every seeded facility.

import { serviceDb } from '../lib/db';
import { DEFAULT_TEMPLATES, DUNNING_SCHEDULE } from '../lib/dunning';
import type { SeedClient } from './types';

async function loadSeed(name: string): Promise<SeedClient> {
  const mod = await import(`./${name}.ts`);
  const seed = (mod.default ?? mod[name]) as SeedClient | undefined;
  if (!seed) throw new Error(`seeds/${name}.ts must default-export a SeedClient`);
  return seed;
}

async function ensureSmsTemplates(facilityId: string): Promise<void> {
  const db = serviceDb();
  for (const step of DUNNING_SCHEDULE) {
    const body = DEFAULT_TEMPLATES[step.key];
    if (!body) continue;
    const { data: existing } = await db
      .from('sms_templates')
      .select('id')
      .eq('facility_id', facilityId)
      .eq('key', step.key)
      .maybeSingle();
    if (existing) continue;
    const { error } = await db.from('sms_templates').insert({
      facility_id: facilityId,
      key: step.key,
      body,
    });
    if (error) throw error;
  }
}

async function ensureAdminManager(facilityIds: string[]): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    console.log('[seed] SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set; skipping admin bootstrap.');
    return;
  }
  const db = serviceDb();
  // admin.* requires the service-role key, which serviceDb() uses.
  const list = await db.auth.admin.listUsers();
  let userId: string | undefined = list?.data?.users?.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  )?.id;
  if (!userId) {
    const created = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (created.error) throw created.error;
    userId = created.data.user?.id;
    if (!userId) throw new Error('admin user creation returned no id');
    console.log(`[seed] admin user created: ${email}`);
  } else {
    console.log(`[seed] admin user already exists: ${email}`);
  }

  const { data: existing } = await db
    .from('managers')
    .select('id, facility_access')
    .eq('id', userId)
    .maybeSingle();
  if (existing) {
    const merged = Array.from(new Set([...(existing.facility_access ?? []), ...facilityIds]));
    await db.from('managers').update({ facility_access: merged }).eq('id', userId);
  } else {
    await db
      .from('managers')
      .insert({ id: userId, email, facility_access: facilityIds });
  }
  console.log(`[seed] manager linked to ${facilityIds.length} facilit${facilityIds.length === 1 ? 'y' : 'ies'}`);
}

async function main(): Promise<void> {
  const name = process.env.SEED ?? 'chandler';
  console.log(`[seed] running seeds/${name}.ts`);
  const seed = await loadSeed(name);
  const db = serviceDb();
  const facilityIds: string[] = [];

  for (const f of seed.facilities) {
    // Upsert facility by slug.
    const { data: existing } = await db
      .from('facilities')
      .select('id')
      .eq('slug', f.slug)
      .maybeSingle();

    let facilityId: string;
    if (existing) {
      facilityId = existing.id as string;
      await db
        .from('facilities')
        .update({
          name: f.name,
          branding_json: f.branding,
          org_id: seed.org.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', facilityId);
      console.log(`[seed] facility "${f.slug}" updated (${facilityId})`);
    } else {
      const { data: created, error } = await db
        .from('facilities')
        .insert({
          slug: f.slug,
          name: f.name,
          branding_json: f.branding,
          org_id: seed.org.id,
        })
        .select('id')
        .single();
      if (error) throw error;
      facilityId = created.id as string;
      console.log(`[seed] facility "${f.slug}" created (${facilityId})`);
    }

    for (const ut of f.unit_types) {
      const { data: existingType } = await db
        .from('unit_types')
        .select('id')
        .eq('facility_id', facilityId)
        .eq('name', ut.name)
        .maybeSingle();

      let unitTypeId: string;
      if (existingType) {
        unitTypeId = existingType.id as string;
        await db
          .from('unit_types')
          .update({
            width_ft: ut.width_ft,
            length_ft: ut.length_ft,
            features: ut.features,
            monthly_rate_cents: ut.monthly_rate_cents,
            description: ut.description,
          })
          .eq('id', unitTypeId);
      } else {
        const { data: created, error } = await db
          .from('unit_types')
          .insert({
            facility_id: facilityId,
            name: ut.name,
            width_ft: ut.width_ft,
            length_ft: ut.length_ft,
            features: ut.features,
            monthly_rate_cents: ut.monthly_rate_cents,
            description: ut.description,
          })
          .select('id')
          .single();
        if (error) throw error;
        unitTypeId = created.id as string;
      }

      for (const label of ut.unit_labels) {
        const { data: existingUnit } = await db
          .from('units')
          .select('id')
          .eq('facility_id', facilityId)
          .eq('label', label)
          .maybeSingle();
        if (existingUnit) {
          await db
            .from('units')
            .update({
              unit_type_id: unitTypeId,
              monthly_rate_cents: ut.monthly_rate_cents,
            })
            .eq('id', existingUnit.id);
        } else {
          const { error } = await db.from('units').insert({
            facility_id: facilityId,
            unit_type_id: unitTypeId,
            label,
            status: 'available',
            monthly_rate_cents: ut.monthly_rate_cents,
          });
          if (error) throw error;
        }
      }
      console.log(`[seed]   unit_type "${ut.name}" with ${ut.unit_labels.length} units`);
    }

    await ensureSmsTemplates(facilityId);
    facilityIds.push(facilityId);
  }

  await ensureAdminManager(facilityIds);

  console.log('[seed] done');
}

main().catch((err) => {
  console.error('[seed] failed', err);
  process.exit(1);
});

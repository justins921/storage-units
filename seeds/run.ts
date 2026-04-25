// Idempotent seed runner. Selects the seed file from the SEED env var
// (default: chandler) so each client deployment ships with the right data.
//
// Usage: SEED=chandler npm run seed

import { serviceDb } from '../lib/db';
import type { SeedClient } from './types';

async function loadSeed(name: string): Promise<SeedClient> {
  const mod = await import(`./${name}.ts`);
  const seed = (mod.default ?? mod[name]) as SeedClient | undefined;
  if (!seed) throw new Error(`seeds/${name}.ts must default-export a SeedClient`);
  return seed;
}

async function main(): Promise<void> {
  const name = process.env.SEED ?? 'chandler';
  console.log(`[seed] running seeds/${name}.ts`);
  const seed = await loadSeed(name);
  const db = serviceDb();

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
  }

  console.log('[seed] done');
}

main().catch((err) => {
  console.error('[seed] failed', err);
  process.exit(1);
});

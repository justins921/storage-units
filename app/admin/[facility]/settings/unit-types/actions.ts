'use server';

import { revalidatePath } from 'next/cache';
import { currentManager, requireFacility } from '@/lib/auth';
import { serviceDb } from '@/lib/db';
import { writeAudit } from '@/lib/audit';

function dollarsToCents(s: string): number | null {
  const v = Number.parseFloat(s);
  if (!Number.isFinite(v) || v < 0) return null;
  return Math.round(v * 100);
}

function parseInteger(s: string): number | null {
  if (!s.trim()) return null;
  const v = Number.parseInt(s, 10);
  if (!Number.isFinite(v) || v <= 0) return null;
  return v;
}

function parseFeatures(s: string): string[] {
  return s
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
}

export async function createUnitType(input: {
  facilitySlug: string;
  name: string;
  width_ft: string;
  length_ft: string;
  price: string;
  features: string;
  description: string;
}): Promise<{ id?: string; error?: string }> {
  if (!input.name.trim()) return { error: 'Name is required.' };
  const cents = dollarsToCents(input.price);
  if (cents === null) return { error: 'Monthly rate must be a number.' };

  const manager = await currentManager();
  const facility = await requireFacility(manager, input.facilitySlug);

  const { data, error } = await serviceDb()
    .from('unit_types')
    .insert({
      facility_id: facility.id,
      name: input.name.trim(),
      width_ft: parseInteger(input.width_ft),
      length_ft: parseInteger(input.length_ft),
      features: parseFeatures(input.features),
      monthly_rate_cents: cents,
      description: input.description.trim() || null,
    })
    .select('id')
    .single();

  if (error) {
    if ((error as { code?: string }).code === '23505') {
      return { error: 'A unit type with that name already exists at this facility.' };
    }
    return { error: error.message };
  }

  await writeAudit({
    facilityId: facility.id,
    actorManagerId: manager.id,
    action: 'unit_type_create',
    targetTable: 'unit_types',
    targetId: data.id as string,
    metadata: { name: input.name, monthly_rate_cents: cents },
  });

  revalidatePath(`/admin/${input.facilitySlug}/settings/unit-types`);
  return { id: data.id as string };
}

export async function updateUnitType(input: {
  facilitySlug: string;
  unitTypeId: string;
  name: string;
  width_ft: string;
  length_ft: string;
  price: string;
  features: string;
  description: string;
}): Promise<{ error?: string } | undefined> {
  if (!input.name.trim()) return { error: 'Name is required.' };
  const cents = dollarsToCents(input.price);
  if (cents === null) return { error: 'Monthly rate must be a number.' };

  const manager = await currentManager();
  const facility = await requireFacility(manager, input.facilitySlug);

  const { data: existing } = await serviceDb()
    .from('unit_types')
    .select('id, facility_id')
    .eq('id', input.unitTypeId)
    .maybeSingle();
  if (!existing || existing.facility_id !== facility.id) {
    return { error: 'Unit type not found.' };
  }

  const { error } = await serviceDb()
    .from('unit_types')
    .update({
      name: input.name.trim(),
      width_ft: parseInteger(input.width_ft),
      length_ft: parseInteger(input.length_ft),
      features: parseFeatures(input.features),
      monthly_rate_cents: cents,
      description: input.description.trim() || null,
    })
    .eq('id', input.unitTypeId);
  if (error) {
    if ((error as { code?: string }).code === '23505') {
      return { error: 'Another unit type with that name exists.' };
    }
    return { error: error.message };
  }

  await writeAudit({
    facilityId: facility.id,
    actorManagerId: manager.id,
    action: 'unit_type_update',
    targetTable: 'unit_types',
    targetId: input.unitTypeId,
    metadata: { name: input.name, monthly_rate_cents: cents },
  });

  revalidatePath(`/admin/${input.facilitySlug}/settings/unit-types/${input.unitTypeId}`);
  revalidatePath(`/admin/${input.facilitySlug}/settings/unit-types`);
  return undefined;
}

export async function addUnits(input: {
  facilitySlug: string;
  unitTypeId: string;
  labelsRaw: string;
}): Promise<{ added: number; error?: string }> {
  const labels = input.labelsRaw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (labels.length === 0) return { added: 0, error: 'Enter at least one label.' };

  const manager = await currentManager();
  const facility = await requireFacility(manager, input.facilitySlug);

  const db = serviceDb();
  const { data: type } = await db
    .from('unit_types')
    .select('id, facility_id, monthly_rate_cents')
    .eq('id', input.unitTypeId)
    .maybeSingle();
  if (!type || type.facility_id !== facility.id) {
    return { added: 0, error: 'Unit type not found.' };
  }

  // Skip labels that already exist at this facility.
  const { data: existing } = await db
    .from('units')
    .select('label')
    .eq('facility_id', facility.id)
    .in('label', labels);
  const taken = new Set(((existing ?? []) as { label: string }[]).map((u) => u.label));
  const fresh = labels.filter((l) => !taken.has(l));
  if (fresh.length === 0) {
    return { added: 0, error: 'All of those labels already exist at this facility.' };
  }

  const rows = fresh.map((label) => ({
    facility_id: facility.id,
    unit_type_id: type.id,
    label,
    status: 'available',
    monthly_rate_cents: type.monthly_rate_cents,
  }));

  const { error } = await db.from('units').insert(rows);
  if (error) return { added: 0, error: error.message };

  await writeAudit({
    facilityId: facility.id,
    actorManagerId: manager.id,
    action: 'units_add',
    targetTable: 'unit_types',
    targetId: type.id,
    metadata: { count: rows.length, labels: fresh },
  });

  revalidatePath(`/admin/${input.facilitySlug}/settings/unit-types/${input.unitTypeId}`);
  revalidatePath(`/admin/${input.facilitySlug}/units`);
  revalidatePath(`/${input.facilitySlug}`);
  return { added: rows.length };
}

export async function deleteUnit(input: {
  facilitySlug: string;
  unitId: string;
}): Promise<{ error?: string } | undefined> {
  const manager = await currentManager();
  const facility = await requireFacility(manager, input.facilitySlug);

  const db = serviceDb();
  const { data: unit } = await db
    .from('units')
    .select('id, facility_id, status, unit_type_id')
    .eq('id', input.unitId)
    .maybeSingle();
  if (!unit || unit.facility_id !== facility.id) return { error: 'Unit not found.' };
  if (unit.status === 'occupied') return { error: 'Unit is occupied. End the lease first.' };

  const { data: anyLease } = await db
    .from('leases')
    .select('id')
    .eq('unit_id', input.unitId)
    .limit(1);
  if ((anyLease ?? []).length > 0) {
    return {
      error:
        'This unit has lease history. Set status to out_of_service instead of deleting.',
    };
  }

  const { error } = await db.from('units').delete().eq('id', input.unitId);
  if (error) return { error: error.message };

  await writeAudit({
    facilityId: facility.id,
    actorManagerId: manager.id,
    action: 'unit_delete',
    targetTable: 'units',
    targetId: input.unitId,
  });

  revalidatePath(`/admin/${input.facilitySlug}/settings/unit-types/${unit.unit_type_id}`);
  revalidatePath(`/admin/${input.facilitySlug}/units`);
  return undefined;
}

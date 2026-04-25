import { serviceDb } from './db';

// Booking-side reads/writes that are too small for their own modules.

export interface FacilityRecord {
  id: string;
  org_id: string;
  slug: string;
  name: string;
  branding_json: Record<string, unknown>;
}

export async function getFacilityBySlug(slug: string): Promise<FacilityRecord | null> {
  const db = serviceDb();
  const { data, error } = await db
    .from('facilities')
    .select('id, org_id, slug, name, branding_json')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return data as FacilityRecord | null;
}

export interface AvailableUnit {
  id: string;
  label: string;
  status: string;
  monthly_rate_cents: number;
  unit_type: {
    id: string;
    name: string;
    width_ft: number | null;
    length_ft: number | null;
    features: string[];
    description: string | null;
  };
}

// Lock-aware availability: a unit counts as "available" only if its status
// is 'available' AND it isn't currently locked by a different session.
// The landing page passes no sessionId; admin tools may.
export async function listAvailableUnits(facilityId: string): Promise<AvailableUnit[]> {
  const db = serviceDb();
  const nowIso = new Date().toISOString();
  const { data, error } = await db
    .from('units')
    .select(
      `id, label, status, monthly_rate_cents,
       unit_type:unit_types ( id, name, width_ft, length_ft, features, description )`,
    )
    .eq('facility_id', facilityId)
    .eq('status', 'available')
    .or(`locked_until.is.null,locked_until.lt.${nowIso}`)
    .order('label', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as AvailableUnit[];
}

export interface UnitForCheckout {
  id: string;
  facility_id: string;
  label: string;
  status: string;
  monthly_rate_cents: number;
  unit_type_name: string;
}

export async function getUnitForCheckout(unitId: string): Promise<UnitForCheckout | null> {
  const db = serviceDb();
  const { data, error } = await db
    .from('units')
    .select(
      `id, facility_id, label, status, monthly_rate_cents,
       unit_type:unit_types ( name )`,
    )
    .eq('id', unitId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const ut = (data.unit_type ?? {}) as { name?: string };
  return {
    id: data.id as string,
    facility_id: data.facility_id as string,
    label: data.label as string,
    status: data.status as string,
    monthly_rate_cents: data.monthly_rate_cents as number,
    unit_type_name: ut.name ?? 'Unit',
  };
}

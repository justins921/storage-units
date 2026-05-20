'use server';

import { revalidatePath } from 'next/cache';
import { currentManager, requireFacility } from '@/lib/auth';
import { serviceDb } from '@/lib/db';
import { writeAudit } from '@/lib/audit';

const ALLOWED = new Set(['available', 'maintenance', 'out_of_service']);

export async function forceUnitStatus(input: {
  unitId: string;
  facilitySlug: string;
  status: string;
}): Promise<{ error?: string } | undefined> {
  if (!ALLOWED.has(input.status)) return { error: 'Invalid status.' };
  const manager = await currentManager();
  const facility = await requireFacility(manager, input.facilitySlug);

  const db = serviceDb();
  const { data: unit } = await db
    .from('units')
    .select('id, facility_id, status')
    .eq('id', input.unitId)
    .maybeSingle();
  if (!unit || unit.facility_id !== facility.id) return { error: 'Unit not found.' };
  if (unit.status === 'occupied') {
    return { error: 'Unit is occupied. End the lease first.' };
  }

  const { error } = await db
    .from('units')
    .update({
      status: input.status,
      locked_until: null,
      locked_by_session_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.unitId);
  if (error) return { error: error.message };

  await writeAudit({
    facilityId: facility.id,
    actorManagerId: manager.id,
    action: 'force_unit_status',
    targetTable: 'units',
    targetId: input.unitId,
    metadata: { from: unit.status, to: input.status },
  });

  revalidatePath(`/admin/${input.facilitySlug}/units`);
  return undefined;
}

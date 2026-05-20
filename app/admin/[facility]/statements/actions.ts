'use server';

import { revalidatePath } from 'next/cache';
import { currentManager, requireFacility } from '@/lib/auth';
import { generateStatement, previousMonthPeriod, saveStatement } from '@/lib/statements';
import { writeAudit } from '@/lib/audit';

export async function generateLastMonth(input: {
  facilitySlug: string;
}): Promise<{ error?: string } | undefined> {
  const manager = await currentManager();
  const facility = await requireFacility(manager, input.facilitySlug);
  const period = previousMonthPeriod();

  try {
    const snapshot = await generateStatement(facility.id, period.start, period.end);
    await saveStatement(snapshot);
    await writeAudit({
      facilityId: facility.id,
      actorManagerId: manager.id,
      action: 'statement_generate',
      metadata: { period_start: period.startISO, period_end: period.endISO },
    });
    revalidatePath(`/admin/${input.facilitySlug}/statements`);
    return undefined;
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed.' };
  }
}

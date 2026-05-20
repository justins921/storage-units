'use server';

import { revalidatePath } from 'next/cache';
import { currentManager, requireFacility } from '@/lib/auth';
import { serviceDb } from '@/lib/db';
import { writeAudit } from '@/lib/audit';

export async function saveSmsTemplate(input: {
  facilitySlug: string;
  key: string;
  body: string;
  enabled: boolean;
}): Promise<{ error?: string } | undefined> {
  if (!input.body.trim()) return { error: 'Body required.' };
  const manager = await currentManager();
  const facility = await requireFacility(manager, input.facilitySlug);

  const { error } = await serviceDb().from('sms_templates').upsert(
    {
      facility_id: facility.id,
      key: input.key,
      body: input.body,
      enabled: input.enabled,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'facility_id,key' },
  );
  if (error) return { error: error.message };

  await writeAudit({
    facilityId: facility.id,
    actorManagerId: manager.id,
    action: 'sms_template_save',
    targetTable: 'sms_templates',
    metadata: { key: input.key, enabled: input.enabled },
  });

  revalidatePath(`/admin/${input.facilitySlug}/settings/sms-templates`);
  return undefined;
}

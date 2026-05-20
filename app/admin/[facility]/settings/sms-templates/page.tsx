import { currentManager, requireFacility } from '@/lib/auth';
import { serviceDb } from '@/lib/db';
import { DUNNING_SCHEDULE, DEFAULT_TEMPLATES } from '@/lib/dunning';
import { SmsTemplateForm } from './form';

export const dynamic = 'force-dynamic';

export default async function SmsTemplatesPage({
  params,
}: {
  params: Promise<{ facility: string }>;
}) {
  const { facility: slug } = await params;
  const manager = await currentManager();
  const facility = await requireFacility(manager, slug);

  const { data } = await serviceDb()
    .from('sms_templates')
    .select('key, body, enabled')
    .eq('facility_id', facility.id);

  const existing = new Map<string, { body: string; enabled: boolean }>();
  for (const row of (data ?? []) as { key: string; body: string; enabled: boolean }[]) {
    existing.set(row.key, { body: row.body, enabled: row.enabled });
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">SMS templates</h1>
      <p className="mt-1 text-sm text-gray-500">
        Edit dunning messages for {facility.name}. Variables:{' '}
        <code>{'{first_name}'}</code>, <code>{'{facility_name}'}</code>,{' '}
        <code>{'{portal_url}'}</code>.
      </p>
      <ul className="mt-6 space-y-4">
        {DUNNING_SCHEDULE.map((step) => {
          const current = existing.get(step.key);
          return (
            <li key={step.key} className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-sm font-medium">{step.key}</p>
              <p className="text-xs text-gray-500">Sent on day {step.days} past due</p>
              <SmsTemplateForm
                facilitySlug={slug}
                templateKey={step.key}
                initialBody={current?.body ?? DEFAULT_TEMPLATES[step.key] ?? ''}
                initialEnabled={current?.enabled ?? true}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

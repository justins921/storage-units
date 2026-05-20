import { currentManager, requireFacility } from '@/lib/auth';
import { serviceDb } from '@/lib/db';
import { DUNNING_SCHEDULE, DEFAULT_TEMPLATES } from '@/lib/dunning';
import { Badge, Card } from '@/lib/ui';
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
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
          {facility.name} · Settings
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
          SMS templates
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Edit dunning messages sent to past-due tenants. Variables:{' '}
          <Code>{`{first_name}`}</Code>, <Code>{`{facility_name}`}</Code>,{' '}
          <Code>{`{portal_url}`}</Code>.
        </p>
      </div>

      <ul className="space-y-4">
        {DUNNING_SCHEDULE.map((step) => {
          const current = existing.get(step.key);
          return (
            <li key={step.key}>
              <Card>
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{step.key}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Sent on day {step.days} past due
                    </p>
                  </div>
                  {current?.enabled === false ? (
                    <Badge tone="gray">Disabled</Badge>
                  ) : (
                    <Badge tone="emerald">Enabled</Badge>
                  )}
                </div>
                <SmsTemplateForm
                  facilitySlug={slug}
                  templateKey={step.key}
                  initialBody={current?.body ?? DEFAULT_TEMPLATES[step.key] ?? ''}
                  initialEnabled={current?.enabled ?? true}
                />
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-700">
      {children}
    </code>
  );
}

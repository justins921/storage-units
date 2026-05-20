import { readMockLog } from '@/lib/providers/mock-log';
import { serviceDb } from '@/lib/db';
import { currentManager } from '@/lib/auth';
import { Badge, Card, Empty } from '@/lib/ui';
import { DevTools } from './dev-tools';

export const dynamic = 'force-dynamic';

export default async function DebugPage() {
  await currentManager();
  const events = readMockLog(50);
  const { data: providerEvents } = await serviceDb()
    .from('provider_events')
    .select('id, provider, event_type, event_id, received_at, processed_at, error')
    .order('received_at', { ascending: false })
    .limit(25);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
          Internal
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
          Debug
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Auth-gated tools for testing mock-provider flows.
        </p>
      </div>

      <div className="mt-8">
        <DevTools />
      </div>

      <section className="mt-10">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          In-memory mock log
        </h2>
        <div className="mt-3 space-y-2">
          {events.length === 0 ? (
            <Empty title="No mock activity yet." />
          ) : (
            events.map((e) => (
              <Card key={e.id} padded={false}>
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
                  <span className="font-mono text-xs text-slate-500">
                    {e.at.toISOString()} · {e.provider}
                  </span>
                  <Badge tone="violet">{e.kind}</Badge>
                </div>
                <pre className="overflow-auto px-4 py-3 text-xs text-slate-700">
                  {JSON.stringify(e.payload, null, 2)}
                </pre>
              </Card>
            ))
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          provider_events (last 25)
        </h2>
        <div className="mt-3 space-y-2">
          {(providerEvents ?? []).length === 0 ? (
            <Empty title="No webhook events yet." />
          ) : (
            (providerEvents ?? []).map((e) => (
              <Card key={e.id as string}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-slate-500">
                    {String(e.received_at)} · {String(e.provider)}
                  </span>
                  <Badge tone={e.error ? 'red' : e.processed_at ? 'emerald' : 'amber'}>
                    {String(e.event_type)}
                  </Badge>
                </div>
                <p className="mt-2 font-mono text-[11px] text-slate-500">
                  id: {String(e.event_id)}
                </p>
                {e.error ? (
                  <p className="mt-1 text-xs text-red-600">error: {String(e.error)}</p>
                ) : null}
              </Card>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

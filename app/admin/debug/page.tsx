import { readMockLog } from '@/lib/providers/mock-log';
import { serviceDb } from '@/lib/db';
import { currentManager } from '@/lib/auth';
import { DevTools } from './dev-tools';

export const dynamic = 'force-dynamic';

// Auth-gated debug panel. Shows mock activity (in-memory) and
// provider_events (durable). Also exposes dev-only helpers that mark
// a lease past_due so the dunning cron has something to send against.
export default async function DebugPage() {
  await currentManager();
  const events = readMockLog(50);
  const { data: providerEvents } = await serviceDb()
    .from('provider_events')
    .select('id, provider, event_type, event_id, received_at, processed_at, error')
    .order('received_at', { ascending: false })
    .limit(25);

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-semibold">Mock provider debug</h1>
      <p className="mt-2 text-sm text-gray-500">
        Auth-gated. Use these tools while testing in mock-provider mode.
      </p>

      <DevTools />


      <h2 className="mt-8 text-lg font-medium">In-memory mock log</h2>
      <ul className="mt-3 space-y-2">
        {events.length === 0 ? (
          <li className="text-sm text-gray-500">No mock activity yet.</li>
        ) : (
          events.map((e) => (
            <li key={e.id} className="rounded border border-gray-200 bg-white p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-gray-500">
                  {e.at.toISOString()} · {e.provider}
                </span>
                <span className="text-xs font-medium">{e.kind}</span>
              </div>
              <pre className="mt-1 overflow-auto text-xs text-gray-700">
                {JSON.stringify(e.payload, null, 2)}
              </pre>
            </li>
          ))
        )}
      </ul>

      <h2 className="mt-10 text-lg font-medium">provider_events (last 25)</h2>
      <ul className="mt-3 space-y-2">
        {(providerEvents ?? []).map((e) => (
          <li
            key={e.id as string}
            className="rounded border border-gray-200 bg-white p-3 text-sm"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-gray-500">
                {String(e.received_at)} · {String(e.provider)}
              </span>
              <span className="text-xs font-medium">{String(e.event_type)}</span>
            </div>
            <p className="mt-1 text-xs text-gray-600">id: {String(e.event_id)}</p>
            <p className="text-xs text-gray-600">
              processed: {e.processed_at ? String(e.processed_at) : '—'}
            </p>
            {e.error ? (
              <p className="text-xs text-red-600">error: {String(e.error)}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </main>
  );
}

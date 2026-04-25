// In-memory log shared across mock providers so the admin debug panel
// can render every checkout session, SMS, and email the app produced
// during a dev session.
//
// In production this is irrelevant: real providers log via their own
// dashboards.

export type MockLogEntry = {
  id: string;
  at: Date;
  provider: 'payment' | 'sms' | 'email';
  kind: string;
  payload: unknown;
};

const buffer: MockLogEntry[] = [];
const MAX = 500;

export function recordMock(entry: Omit<MockLogEntry, 'id' | 'at'>): MockLogEntry {
  const full: MockLogEntry = {
    id: crypto.randomUUID(),
    at: new Date(),
    ...entry,
  };
  buffer.unshift(full);
  if (buffer.length > MAX) buffer.length = MAX;
  // Always echo to stdout so Railway logs show mock activity even without
  // the debug panel.

  console.log(`[mock:${entry.provider}] ${entry.kind}`, entry.payload);
  return full;
}

export function readMockLog(limit = 100): MockLogEntry[] {
  return buffer.slice(0, limit);
}

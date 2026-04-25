import type { SmsMessageInput, SmsProvider } from './types';
import { recordMock } from './mock-log';

const stops = new Set<string>();

export class MockSmsProvider implements SmsProvider {
  readonly name = 'mock' as const;

  async send(input: SmsMessageInput): Promise<{ id: string }> {
    if (input.optOutKey && stops.has(input.optOutKey)) {
      recordMock({ provider: 'sms', kind: 'send.suppressed', payload: input });
      return { id: 'sms_suppressed_' + crypto.randomUUID() };
    }
    const id = 'sms_mock_' + crypto.randomUUID();
    recordMock({ provider: 'sms', kind: 'send', payload: { id, ...input } });
    return { id };
  }

  async isOptedOut(optOutKey: string): Promise<boolean> {
    return stops.has(optOutKey);
  }

  async recordStop(optOutKey: string): Promise<void> {
    stops.add(optOutKey);
    recordMock({ provider: 'sms', kind: 'stop.recorded', payload: { optOutKey } });
  }
}

import type { SmsMessageInput, SmsProvider } from './types';

export class TwilioSmsProvider implements SmsProvider {
  readonly name = 'twilio' as const;

  async send(_input: SmsMessageInput): Promise<{ id: string }> {
    throw new Error(
      'TwilioSmsProvider not implemented. Set SMS_PROVIDER=mock until Phase 6 cutover.',
    );
  }

  async isOptedOut(_optOutKey: string): Promise<boolean> {
    throw new Error('TwilioSmsProvider not implemented.');
  }

  async recordStop(_optOutKey: string): Promise<void> {
    throw new Error('TwilioSmsProvider not implemented.');
  }
}

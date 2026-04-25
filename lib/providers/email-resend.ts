import type { EmailMessageInput, EmailProvider } from './types';

export class ResendEmailProvider implements EmailProvider {
  readonly name = 'resend' as const;

  async send(_input: EmailMessageInput): Promise<{ id: string }> {
    throw new Error(
      'ResendEmailProvider not implemented. Set EMAIL_PROVIDER=mock until Phase 6 cutover.',
    );
  }
}

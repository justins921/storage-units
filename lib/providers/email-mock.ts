import type { EmailMessageInput, EmailProvider } from './types';
import { recordMock } from './mock-log';

export class MockEmailProvider implements EmailProvider {
  readonly name = 'mock' as const;

  async send(input: EmailMessageInput): Promise<{ id: string }> {
    const id = 'email_mock_' + crypto.randomUUID();
    recordMock({
      provider: 'email',
      kind: 'send',
      payload: {
        id,
        to: input.to,
        subject: input.subject,
        text: input.text,
        attachmentCount: input.attachments?.length ?? 0,
      },
    });
    return { id };
  }
}

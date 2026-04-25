import { NextResponse } from 'next/server';
import { z } from 'zod';
import { newMockCustomerId, newMockEventId, newMockSubscriptionId } from '@/lib/providers/payment-mock';
import { env } from '@/lib/env';
import type { NormalizedEvent } from '@/lib/providers/types';

export const runtime = 'nodejs';

const Body = z.object({
  kind: z.enum(['pay', 'cancel']),
  sessionId: z.string().min(1),
  metadataJson: z.string().min(2),
  email: z.string().email(),
});

// Dev-only endpoint. The mock checkout page POSTs here, we synthesize a
// normalized webhook event, and forward it to our real webhook endpoint
// so the production code path runs in mock mode too.
export async function POST(req: Request): Promise<Response> {
  if (env().PAYMENT_PROVIDER !== 'mock') {
    return NextResponse.json({ error: 'Mock endpoint disabled.' }, { status: 404 });
  }
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'Bad input.' }, { status: 400 });

  const metadata = JSON.parse(parsed.data.metadataJson) as Record<string, string>;
  const event: NormalizedEvent =
    parsed.data.kind === 'pay'
      ? {
          type: 'checkout.session.completed',
          providerEventId: newMockEventId(),
          data: {
            sessionId: parsed.data.sessionId,
            subscriptionId: newMockSubscriptionId(),
            customerId: newMockCustomerId(),
            customerEmail: parsed.data.email,
            metadata,
          },
        }
      : {
          type: 'checkout.session.expired',
          providerEventId: newMockEventId(),
          data: { sessionId: parsed.data.sessionId, metadata },
        };

  const origin = new URL(req.url).origin;
  const res = await fetch(`${origin}/api/webhooks/payment`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(event),
  });
  return NextResponse.json({ ok: res.ok }, { status: res.ok ? 200 : 500 });
}

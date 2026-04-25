import { NextResponse } from 'next/server';
import { paymentProvider } from '@/lib/providers';
import { applyEvent } from '@/lib/webhook-handler';

export const runtime = 'nodejs';

// Single payment-provider webhook endpoint. The provider abstraction owns
// signature verification + event normalization; this handler focuses on
// idempotency and DB application.
export async function POST(req: Request): Promise<Response> {
  const rawBody = await req.text();
  const signature = req.headers.get('stripe-signature');
  const provider = paymentProvider();

  let event;
  try {
    event = await provider.parseWebhook(rawBody, signature);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'invalid';
    console.error('[webhook] parse failed', message);
    return NextResponse.json({ error: 'invalid webhook' }, { status: 400 });
  }

  try {
    await applyEvent(provider.name, event);
  } catch (err) {
    console.error('[webhook] apply failed', err);
    // Return 500 so the provider retries. provider_events keeps us
    // idempotent across retries.
    return NextResponse.json({ error: 'apply failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

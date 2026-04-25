import { NextResponse } from 'next/server';
import { z } from 'zod';
import { paymentProvider } from '@/lib/providers';
import { getUnitForCheckout } from '@/lib/booking';
import { acquireUnitLock } from '@/lib/locking';

export const runtime = 'nodejs';

const Body = z.object({
  unitId: z.string().uuid(),
  customerEmail: z.string().email(),
});

// Starts a checkout session for a unit.
// Flow:
//   1. Validate request, load unit.
//   2. Acquire a unit lock keyed by a fresh checkout session ID.
//   3. Ask the payment provider to create the hosted session, passing the
//      session ID + unit/facility IDs as metadata so the webhook can
//      reconcile back without trusting client input.
//   4. Return the redirect URL to the browser.
export async function POST(req: Request): Promise<Response> {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const unit = await getUnitForCheckout(parsed.data.unitId);
  if (!unit) return NextResponse.json({ error: 'Unit not found.' }, { status: 404 });
  if (unit.status !== 'available') {
    return NextResponse.json({ error: 'Unit is not available.' }, { status: 409 });
  }

  const sessionId = crypto.randomUUID();
  const lock = await acquireUnitLock({ unitId: unit.id, sessionId });
  if (!lock.acquired) {
    return NextResponse.json(
      { error: 'Unit just got reserved by someone else. Try another.' },
      { status: 409 },
    );
  }

  const origin = new URL(req.url).origin;
  const provider = paymentProvider();
  const session = await provider.createCheckoutSession({
    facilityId: unit.facility_id,
    unitId: unit.id,
    unitLabel: unit.label,
    unitTypeName: unit.unit_type_name,
    monthlyRateCents: unit.monthly_rate_cents,
    customerEmail: parsed.data.customerEmail,
    successUrl: `${origin}/checkout/success?session_id=${sessionId}`,
    cancelUrl: `${origin}/checkout/cancel?session_id=${sessionId}`,
    metadata: {
      lock_session_id: sessionId,
      unit_id: unit.id,
      facility_id: unit.facility_id,
      customer_email: parsed.data.customerEmail,
    },
    idempotencyKey: sessionId,
  });

  // Mock provider returns a relative URL; build an absolute URL for the
  // browser when needed.
  const url = session.url.startsWith('http') ? session.url : `${origin}${session.url}`;
  return NextResponse.json({ url });
}

import type {
  CheckoutSession,
  CheckoutSessionInput,
  NormalizedEvent,
  PaymentProvider,
} from './types';
import { recordMock } from './mock-log';

// MockPaymentProvider mimics a hosted-checkout flow without any external
// service. createCheckoutSession returns a URL on our own /mock/checkout
// route; the page presents Pay / Cancel buttons that POST back to our own
// webhook endpoint with a synthetic event. This lets us run end-to-end
// booking flows with zero third-party setup.

const SUBSCRIPTION_PREFIX = 'sub_mock_';
const CUSTOMER_PREFIX = 'cus_mock_';
const SESSION_PREFIX = 'cs_mock_';
const EVENT_PREFIX = 'evt_mock_';

export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock' as const;

  async createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSession> {
    const sessionId = SESSION_PREFIX + crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    // The mock checkout page reads its parameters from the URL.
    const params = new URLSearchParams({
      session_id: sessionId,
      facility_id: input.facilityId,
      unit_id: input.unitId,
      unit_label: input.unitLabel,
      unit_type: input.unitTypeName,
      amount_cents: String(input.monthlyRateCents),
      email: input.customerEmail,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      metadata: JSON.stringify(input.metadata),
    });
    const url = `/mock/checkout?${params.toString()}`;
    recordMock({
      provider: 'payment',
      kind: 'checkout.session.created',
      payload: { sessionId, ...input },
    });
    return { id: sessionId, url, expiresAt };
  }

  async parseWebhook(rawBody: string): Promise<NormalizedEvent> {
    // Mock webhooks send already-normalized JSON. No signature to verify.
    const parsed = JSON.parse(rawBody) as NormalizedEvent;
    if (!parsed.providerEventId) {
      throw new Error('mock webhook payload missing providerEventId');
    }
    recordMock({
      provider: 'payment',
      kind: `webhook.${parsed.type}`,
      payload: parsed,
    });
    return parsed;
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    recordMock({
      provider: 'payment',
      kind: 'subscription.cancel',
      payload: { subscriptionId },
    });
  }
}

// Helpers used by the mock checkout page when it synthesizes webhook events
// to POST back into our app.
export function newMockSubscriptionId(): string {
  return SUBSCRIPTION_PREFIX + crypto.randomUUID();
}

export function newMockCustomerId(): string {
  return CUSTOMER_PREFIX + crypto.randomUUID();
}

export function newMockEventId(): string {
  return EVENT_PREFIX + crypto.randomUUID();
}

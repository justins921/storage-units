import type {
  CheckoutSession,
  CheckoutSessionInput,
  NormalizedEvent,
  PaymentProvider,
} from './types';

// Real Stripe adapter. Intentionally a stub: wire this up at Phase 6
// cutover. Implementing it now would require the `stripe` SDK and live
// credentials, both of which we explicitly defer per the spec.

export class StripePaymentProvider implements PaymentProvider {
  readonly name = 'stripe' as const;

  async createCheckoutSession(_input: CheckoutSessionInput): Promise<CheckoutSession> {
    throw new Error(
      'StripePaymentProvider not implemented. Set PAYMENT_PROVIDER=mock until Phase 6 cutover.',
    );
  }

  async parseWebhook(_rawBody: string, _signature: string | null): Promise<NormalizedEvent> {
    throw new Error('StripePaymentProvider not implemented.');
  }

  async cancelSubscription(_subscriptionId: string): Promise<void> {
    throw new Error('StripePaymentProvider not implemented.');
  }
}

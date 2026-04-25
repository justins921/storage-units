// Shared shapes used across all provider modules. Webhook events are
// normalized to a small, provider-agnostic union: real adapters translate
// their native shapes into these. The rest of the app never depends on
// Stripe/Twilio/Resend types directly.

export interface CheckoutSessionInput {
  facilityId: string;
  unitId: string;
  unitLabel: string;
  unitTypeName: string;
  monthlyRateCents: number;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
  // metadata is echoed back to us in webhook events; we use it to map
  // checkout sessions to internal entities without round-tripping the DB.
  metadata: Record<string, string>;
  idempotencyKey: string;
}

export interface CheckoutSession {
  id: string;
  url: string;
  expiresAt: Date;
}

export type NormalizedEvent =
  | {
      type: 'checkout.session.completed';
      providerEventId: string;
      data: {
        sessionId: string;
        subscriptionId: string;
        customerId: string;
        customerEmail: string;
        metadata: Record<string, string>;
      };
    }
  | {
      type: 'checkout.session.expired';
      providerEventId: string;
      data: { sessionId: string; metadata: Record<string, string> };
    }
  | {
      type: 'invoice.paid';
      providerEventId: string;
      data: {
        subscriptionId: string;
        customerId: string;
        amountPaidCents: number;
        invoiceId: string;
      };
    }
  | {
      type: 'invoice.payment_failed';
      providerEventId: string;
      data: {
        subscriptionId: string;
        customerId: string;
        amountDueCents: number;
        invoiceId: string;
      };
    }
  | {
      type: 'customer.subscription.deleted';
      providerEventId: string;
      data: { subscriptionId: string; customerId: string };
    };

export interface PaymentProvider {
  readonly name: 'mock' | 'stripe';
  createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSession>;
  parseWebhook(rawBody: string, signature: string | null): Promise<NormalizedEvent>;
  cancelSubscription(subscriptionId: string): Promise<void>;
}

export interface SmsMessageInput {
  to: string;
  body: string;
  // For dunning compliance: a per-tenant key we can check against the STOP
  // list before sending.
  optOutKey?: string;
}

export interface SmsProvider {
  readonly name: 'mock' | 'twilio';
  send(input: SmsMessageInput): Promise<{ id: string }>;
  isOptedOut(optOutKey: string): Promise<boolean>;
  recordStop(optOutKey: string): Promise<void>;
}

export interface EmailMessageInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  attachments?: { filename: string; contentBase64: string; contentType: string }[];
}

export interface EmailProvider {
  readonly name: 'mock' | 'resend';
  send(input: EmailMessageInput): Promise<{ id: string }>;
}

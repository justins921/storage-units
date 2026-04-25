import { env } from '../env';
import type { EmailProvider, PaymentProvider, SmsProvider } from './types';
import { MockPaymentProvider } from './payment-mock';
import { StripePaymentProvider } from './payment-stripe';
import { MockSmsProvider } from './sms-mock';
import { TwilioSmsProvider } from './sms-twilio';
import { MockEmailProvider } from './email-mock';
import { ResendEmailProvider } from './email-resend';

// Provider factories. The selection is env-driven so a single deployment
// can flip individual providers from mock to real without code changes.
// Each provider is memoized per-process for a stable identity.

let paymentInstance: PaymentProvider | null = null;
let smsInstance: SmsProvider | null = null;
let emailInstance: EmailProvider | null = null;

export function paymentProvider(): PaymentProvider {
  if (paymentInstance) return paymentInstance;
  paymentInstance =
    env().PAYMENT_PROVIDER === 'stripe' ? new StripePaymentProvider() : new MockPaymentProvider();
  return paymentInstance;
}

export function smsProvider(): SmsProvider {
  if (smsInstance) return smsInstance;
  smsInstance =
    env().SMS_PROVIDER === 'twilio' ? new TwilioSmsProvider() : new MockSmsProvider();
  return smsInstance;
}

export function emailProvider(): EmailProvider {
  if (emailInstance) return emailInstance;
  emailInstance =
    env().EMAIL_PROVIDER === 'resend' ? new ResendEmailProvider() : new MockEmailProvider();
  return emailInstance;
}

export type { PaymentProvider, SmsProvider, EmailProvider } from './types';

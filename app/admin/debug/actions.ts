'use server';

import { revalidatePath } from 'next/cache';
import { currentManager } from '@/lib/auth';
import { applyEvent } from '@/lib/webhook-handler';
import { paymentProvider } from '@/lib/providers';
import { runDunningOnce } from '@/lib/dunning';
import { env } from '@/lib/env';
import { newMockEventId } from '@/lib/providers/payment-mock';

function ensureMock(): { error?: string } | undefined {
  if (env().PAYMENT_PROVIDER !== 'mock') {
    return { error: 'Dev tools are mock-only.' };
  }
  return undefined;
}

export async function simulateInvoicePaid(input: {
  subId: string;
  amount: string;
}): Promise<{ ok?: boolean; error?: string; result?: unknown }> {
  const block = ensureMock();
  if (block) return block;
  await currentManager();
  const cents = Math.round(Number.parseFloat(input.amount) * 100);
  if (!Number.isFinite(cents) || cents <= 0) return { error: 'Bad amount.' };

  await applyEvent(paymentProvider().name, {
    type: 'invoice.paid',
    providerEventId: newMockEventId(),
    data: {
      subscriptionId: input.subId,
      customerId: 'cus_mock_dev',
      amountPaidCents: cents,
      invoiceId: 'inv_mock_' + crypto.randomUUID(),
    },
  });
  revalidatePath('/admin/debug');
  return { ok: true };
}

export async function simulateInvoiceFailed(input: {
  subId: string;
  amount: string;
}): Promise<{ ok?: boolean; error?: string; result?: unknown }> {
  const block = ensureMock();
  if (block) return block;
  await currentManager();
  const cents = Math.round(Number.parseFloat(input.amount) * 100);
  if (!Number.isFinite(cents) || cents <= 0) return { error: 'Bad amount.' };

  await applyEvent(paymentProvider().name, {
    type: 'invoice.payment_failed',
    providerEventId: newMockEventId(),
    data: {
      subscriptionId: input.subId,
      customerId: 'cus_mock_dev',
      amountDueCents: cents,
      invoiceId: 'inv_mock_' + crypto.randomUUID(),
    },
  });
  revalidatePath('/admin/debug');
  return { ok: true };
}

export async function runDunningNow(): Promise<{
  ok?: boolean;
  error?: string;
  result?: unknown;
}> {
  await currentManager();
  const result = await runDunningOnce();
  return { ok: true, result };
}

export async function backdatePastDue(input: {
  subId: string;
  daysAgo: string;
}): Promise<{ ok?: boolean; error?: string; result?: unknown }> {
  const block = ensureMock();
  if (block) return block;
  await currentManager();
  const days = Number.parseInt(input.daysAgo, 10);
  if (!Number.isFinite(days) || days < 0) return { error: 'Bad days.' };

  const { serviceDb } = await import('@/lib/db');
  const when = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await serviceDb()
    .from('leases')
    .update({
      status: 'past_due',
      past_due_since: when,
      updated_at: new Date().toISOString(),
    })
    .eq('provider_subscription_id', input.subId)
    .select('id, past_due_since');
  if (error) return { error: error.message };
  return { ok: true, result: data };
}

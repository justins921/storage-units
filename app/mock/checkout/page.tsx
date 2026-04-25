import { MockCheckoutForm } from './form';

export const dynamic = 'force-dynamic';

// Stand-in for a hosted Stripe Checkout page. Shown only when
// PAYMENT_PROVIDER=mock. The form POSTs synthesized webhook events to our
// own /api/webhooks/payment endpoint, then redirects to success/cancel.
//
// Read query params on the server, hand them to a client form for the
// actual POST.
export default async function MockCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const get = (k: string) => sp[k] ?? '';
  const amountCents = Number.parseInt(get('amount_cents') || '0', 10);

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-amber-600">Mock checkout</p>
        <h1 className="mt-1 text-xl font-semibold">Confirm reservation</h1>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">Unit</dt>
            <dd>
              {get('unit_label')} ({get('unit_type')})
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Email</dt>
            <dd>{get('email')}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Monthly</dt>
            <dd>${(amountCents / 100).toFixed(2)}</dd>
          </div>
        </dl>
        <MockCheckoutForm
          sessionId={get('session_id')}
          successUrl={get('success_url')}
          cancelUrl={get('cancel_url')}
          metadataJson={get('metadata')}
          email={get('email')}
        />
      </div>
    </main>
  );
}

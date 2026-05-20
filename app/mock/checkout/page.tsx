import { Badge, Card } from '@/lib/ui';
import { MockCheckoutForm } from './form';

export const dynamic = 'force-dynamic';

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
      <Card>
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Checkout
          </p>
          <Badge tone="amber">Mock</Badge>
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
          Confirm reservation
        </h1>
        <dl className="mt-6 divide-y divide-slate-100 text-sm">
          <Row label="Unit" value={`${get('unit_label')} (${get('unit_type')})`} />
          <Row label="Email" value={get('email')} />
          <Row label="Monthly" value={`$${(amountCents / 100).toFixed(2)}`} bold />
        </dl>
        <MockCheckoutForm
          sessionId={get('session_id')}
          successUrl={get('success_url')}
          cancelUrl={get('cancel_url')}
          metadataJson={get('metadata')}
          email={get('email')}
        />
      </Card>
    </main>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between py-2.5">
      <dt className="text-slate-500">{label}</dt>
      <dd className={bold ? 'font-semibold text-slate-900' : 'text-slate-700'}>{value}</dd>
    </div>
  );
}

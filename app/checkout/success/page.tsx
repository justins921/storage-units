import { Card } from '@/lib/ui';

export const dynamic = 'force-dynamic';

export default function CheckoutSuccess() {
  return (
    <main className="mx-auto max-w-md px-6 py-24">
      <Card>
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            ✓
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">
            You're booked.
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Check your email for confirmation and gate access details.
          </p>
        </div>
      </Card>
    </main>
  );
}

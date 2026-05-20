import { Card } from '@/lib/ui';

export const dynamic = 'force-dynamic';

export default function CheckoutCancel() {
  return (
    <main className="mx-auto max-w-md px-6 py-24">
      <Card>
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            ↺
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">
            Reservation cancelled.
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            The unit has been released. You can pick a different one any time.
          </p>
        </div>
      </Card>
    </main>
  );
}

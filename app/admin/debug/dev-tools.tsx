'use client';

import { useState, useTransition } from 'react';
import {
  backdatePastDue,
  runDunningNow,
  simulateInvoiceFailed,
  simulateInvoicePaid,
} from './actions';

export function DevTools() {
  const [subId, setSubId] = useState('');
  const [amount, setAmount] = useState('129');
  const [daysAgo, setDaysAgo] = useState('5');
  const [out, setOut] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function call(fn: () => Promise<{ ok?: boolean; error?: string; result?: unknown }>) {
    setOut(null);
    startTransition(async () => {
      const r = await fn();
      if (r.error) setOut(`error: ${r.error}`);
      else setOut(JSON.stringify(r.result ?? { ok: true }, null, 2));
    });
  }

  return (
    <section className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <h2 className="text-sm font-medium uppercase tracking-wide text-amber-700">Dev tools</h2>
      <p className="mt-1 text-xs text-amber-800">
        Simulate provider events against a known subscription ID. Use the value shown on a
        lease (provider_subscription_id) to test dunning + auto-pause.
      </p>

      <div className="mt-3 flex flex-wrap items-end gap-2 text-xs">
        <label className="flex-1">
          Subscription ID
          <input
            value={subId}
            onChange={(e) => setSubId(e.target.value)}
            placeholder="sub_mock_…"
            className="mt-1 w-full rounded border border-amber-300 bg-white px-2 py-1"
          />
        </label>
        <label>
          Amount (USD)
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-24 rounded border border-amber-300 bg-white px-2 py-1"
          />
        </label>
        <button
          type="button"
          disabled={isPending || !subId}
          onClick={() => call(() => simulateInvoicePaid({ subId, amount }))}
          className="rounded border border-emerald-400 bg-emerald-100 px-2 py-1 text-emerald-800 disabled:opacity-50"
        >
          invoice.paid
        </button>
        <button
          type="button"
          disabled={isPending || !subId}
          onClick={() => call(() => simulateInvoiceFailed({ subId, amount }))}
          className="rounded border border-red-400 bg-red-100 px-2 py-1 text-red-800 disabled:opacity-50"
        >
          invoice.payment_failed
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => call(() => runDunningNow())}
          className="rounded border border-gray-400 bg-white px-2 py-1 disabled:opacity-50"
        >
          Run dunning
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-2 text-xs">
        <label>
          Days ago
          <input
            value={daysAgo}
            onChange={(e) => setDaysAgo(e.target.value)}
            className="mt-1 w-20 rounded border border-amber-300 bg-white px-2 py-1"
          />
        </label>
        <button
          type="button"
          disabled={isPending || !subId}
          onClick={() => call(() => backdatePastDue({ subId, daysAgo }))}
          className="rounded border border-amber-400 bg-white px-2 py-1 disabled:opacity-50"
        >
          Backdate past_due
        </button>
        <span className="text-amber-800">
          (mark a lease past_due as if it failed N days ago)
        </span>
      </div>

      {out ? (
        <pre className="mt-3 overflow-auto rounded bg-white p-2 text-xs text-gray-700">
          {out}
        </pre>
      ) : null}
    </section>
  );
}

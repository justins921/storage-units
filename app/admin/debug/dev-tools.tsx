'use client';

import { useState, useTransition } from 'react';
import { Button, Card, Field, Input } from '@/lib/ui';
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
    <Card className="border-amber-200 bg-amber-50/50">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-800">
          Dev tools
        </h2>
        <span className="text-[10px] uppercase tracking-wider text-amber-700">
          Mock mode
        </span>
      </div>
      <p className="mt-1 text-xs text-amber-800">
        Simulate provider events against a known subscription ID (see lease detail).
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <Field label="Subscription ID">
          <Input
            value={subId}
            onChange={(e) => setSubId(e.target.value)}
            placeholder="sub_mock_…"
            className="font-mono"
          />
        </Field>
        <Field label="Amount (USD)">
          <Input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-28"
          />
        </Field>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="primary"
          disabled={isPending || !subId}
          onClick={() => call(() => simulateInvoicePaid({ subId, amount }))}
          className="bg-emerald-700 hover:bg-emerald-800"
        >
          invoice.paid
        </Button>
        <Button
          size="sm"
          variant="primary"
          disabled={isPending || !subId}
          onClick={() => call(() => simulateInvoiceFailed({ subId, amount }))}
          className="bg-red-700 hover:bg-red-800"
        >
          invoice.payment_failed
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={isPending}
          onClick={() => call(() => runDunningNow())}
        >
          Run dunning
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <Field label="Days ago">
          <Input
            value={daysAgo}
            onChange={(e) => setDaysAgo(e.target.value)}
            className="w-24"
          />
        </Field>
        <Button
          size="sm"
          variant="secondary"
          disabled={isPending || !subId}
          onClick={() => call(() => backdatePastDue({ subId, daysAgo }))}
        >
          Backdate past_due
        </Button>
        <p className="text-xs text-amber-800">
          Marks a lease past_due as if it failed N days ago.
        </p>
      </div>

      {out ? (
        <pre className="mt-4 overflow-auto rounded-lg bg-white p-3 text-xs text-slate-700">
          {out}
        </pre>
      ) : null}
    </Card>
  );
}

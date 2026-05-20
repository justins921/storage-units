'use client';

import { useState, useTransition } from 'react';
import { endLease, recordCredit, recordNote, recordRefund, recordWaive } from './actions';

interface Props {
  facilitySlug: string;
  tenantId: string;
  activeLeaseId: string | null;
  activeLeaseUnitId: string | null;
}

type ActionKey = 'waive' | 'credit' | 'refund' | 'note' | 'end_lease';

export function ManualActionsPanel(props: Props) {
  const [active, setActive] = useState<ActionKey>('waive');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const needsLease: Record<ActionKey, boolean> = {
    waive: true,
    credit: true,
    refund: true,
    note: false,
    end_lease: true,
  };
  const needsAmount: Record<ActionKey, boolean> = {
    waive: true,
    credit: true,
    refund: true,
    note: false,
    end_lease: false,
  };

  function submit() {
    setError(null);
    setDone(null);
    if (needsLease[active] && !props.activeLeaseId) {
      setError('No active lease on this tenant.');
      return;
    }
    startTransition(async () => {
      let res: { error?: string } | undefined;
      const common = {
        facilitySlug: props.facilitySlug,
        tenantId: props.tenantId,
        leaseId: props.activeLeaseId!,
        amount,
        notes,
      };
      switch (active) {
        case 'waive':
          res = await recordWaive(common);
          break;
        case 'credit':
          res = await recordCredit(common);
          break;
        case 'refund':
          res = await recordRefund(common);
          break;
        case 'note':
          res = await recordNote({
            facilitySlug: props.facilitySlug,
            tenantId: props.tenantId,
            notes,
          });
          break;
        case 'end_lease':
          res = await endLease({
            facilitySlug: props.facilitySlug,
            tenantId: props.tenantId,
            leaseId: props.activeLeaseId!,
            notes,
          });
          break;
      }
      if (res?.error) {
        setError(res.error);
        return;
      }
      setAmount('');
      setNotes('');
      setDone(`${active} recorded`);
    });
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        Manual actions
      </h3>
      <div className="mt-3 flex flex-wrap gap-1 text-xs">
        {(['waive', 'credit', 'refund', 'note', 'end_lease'] as ActionKey[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setActive(k)}
            className={`rounded px-2 py-1 ${
              active === k ? 'bg-gray-900 text-white' : 'border border-gray-300'
            }`}
          >
            {k.replace('_', ' ')}
          </button>
        ))}
      </div>
      {needsAmount[active] ? (
        <label className="mt-3 block text-xs">
          Amount (USD)
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
          />
        </label>
      ) : null}
      <label className="mt-3 block text-xs">
        Notes
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
        />
      </label>
      <button
        type="button"
        onClick={submit}
        disabled={isPending}
        className="mt-3 w-full rounded bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {isPending ? 'Saving…' : `Record ${active.replace('_', ' ')}`}
      </button>
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
      {done ? <p className="mt-2 text-xs text-emerald-700">{done}</p> : null}
      {!props.activeLeaseId ? (
        <p className="mt-3 text-xs text-gray-500">No active lease — only “note” works.</p>
      ) : null}
    </div>
  );
}

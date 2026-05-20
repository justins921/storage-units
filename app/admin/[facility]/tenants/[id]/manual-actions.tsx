'use client';

import { useState, useTransition } from 'react';
import { Button, Card, Field, Input, Textarea } from '@/lib/ui';
import { endLease, recordCredit, recordNote, recordRefund, recordWaive } from './actions';

interface Props {
  facilitySlug: string;
  tenantId: string;
  activeLeaseId: string | null;
  activeLeaseUnitId: string | null;
}

type ActionKey = 'waive' | 'credit' | 'refund' | 'note' | 'end_lease';

const ACTIONS: { key: ActionKey; label: string }[] = [
  { key: 'waive', label: 'Waive' },
  { key: 'credit', label: 'Credit' },
  { key: 'refund', label: 'Refund' },
  { key: 'note', label: 'Note' },
  { key: 'end_lease', label: 'End lease' },
];

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
      setDone(`${active.replace('_', ' ')} recorded`);
    });
  }

  return (
    <Card>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        Manual actions
      </h3>

      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {ACTIONS.map((a) => (
          <button
            key={a.key}
            type="button"
            onClick={() => {
              setActive(a.key);
              setError(null);
              setDone(null);
            }}
            className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
              active === a.key
                ? 'bg-slate-900 text-white'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {needsAmount[active] ? (
          <Field label="Amount (USD)">
            <Input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </Field>
        ) : null}
        <Field label="Notes">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Optional"
          />
        </Field>
        <Button
          variant={active === 'end_lease' ? 'danger' : 'primary'}
          onClick={submit}
          disabled={isPending}
          className="w-full"
        >
          {isPending ? 'Saving…' : `Record ${active.replace('_', ' ')}`}
        </Button>
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
        {done ? <p className="text-xs text-emerald-700">{done}</p> : null}
        {!props.activeLeaseId ? (
          <p className="text-xs text-slate-500">
            No active lease — only “note” works.
          </p>
        ) : null}
      </div>
    </Card>
  );
}

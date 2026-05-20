'use client';

import { useState, useTransition } from 'react';
import { Button, Card, Field, Textarea } from '@/lib/ui';
import { addUnits } from '../actions';

export function AddUnitsForm({
  facilitySlug,
  unitTypeId,
}: {
  facilitySlug: string;
  unitTypeId: string;
}) {
  const [labels, setLabels] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    setDone(null);
    startTransition(async () => {
      const res = await addUnits({ facilitySlug, unitTypeId, labelsRaw: labels });
      if (res.error) {
        setError(res.error);
        return;
      }
      setDone(`Added ${res.added} unit${res.added === 1 ? '' : 's'}.`);
      setLabels('');
    });
  }

  return (
    <Card>
      <Field
        label="Unit labels"
        hint="One per line or comma-separated. Labels must be unique within this facility."
      >
        <Textarea
          rows={5}
          value={labels}
          onChange={(e) => setLabels(e.target.value)}
          placeholder={'B7\nB8\nB9'}
          className="font-mono"
        />
      </Field>
      <div className="mt-3 flex items-center justify-between">
        <div className="text-xs">
          {done ? <span className="text-emerald-700">{done}</span> : null}
          {error ? <span className="text-red-600">{error}</span> : null}
        </div>
        <Button onClick={submit} disabled={isPending || !labels.trim()}>
          {isPending ? 'Adding…' : 'Add units'}
        </Button>
      </div>
    </Card>
  );
}

'use client';

import { useState, useTransition } from 'react';
import { Button, Card, Field, Input, Textarea } from '@/lib/ui';
import { createUnitType } from '../actions';

export function NewUnitTypeForm({ facilitySlug }: { facilitySlug: string }) {
  const [name, setName] = useState('');
  const [width, setWidth] = useState('');
  const [length, setLength] = useState('');
  const [price, setPrice] = useState('');
  const [features, setFeatures] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await createUnitType({
        facilitySlug,
        name,
        width_ft: width,
        length_ft: length,
        price,
        features,
        description,
      });
      if (res?.error) {
        setError(res.error);
        return;
      }
      if (res?.id) {
        window.location.href = `/admin/${facilitySlug}/settings/unit-types/${res.id}`;
      }
    });
  }

  return (
    <Card>
      <div className="space-y-4">
        <Field
          label="Name"
          hint='Short label like "10x10" or "10x20 climate".'
        >
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Width (ft)">
            <Input
              type="number"
              inputMode="numeric"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
            />
          </Field>
          <Field label="Length (ft)">
            <Input
              type="number"
              inputMode="numeric"
              value={length}
              onChange={(e) => setLength(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Monthly rate (USD)">
          <Input
            type="text"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="129"
          />
        </Field>
        <Field
          label="Features"
          hint='Comma-separated. e.g. "climate, drive-up, ground floor"'
        >
          <Input
            value={features}
            onChange={(e) => setFeatures(e.target.value)}
            placeholder="climate, drive-up"
          />
        </Field>
        <Field label="Description (optional)">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="A bedroom of furniture, comfortably."
          />
        </Field>

        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          {error ? <span className="text-xs text-red-600">{error}</span> : <span />}
          <Button onClick={submit} disabled={isPending || !name || !price}>
            {isPending ? 'Creating…' : 'Create unit type'}
          </Button>
        </div>
      </div>
    </Card>
  );
}

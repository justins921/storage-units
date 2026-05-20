'use client';

import { useState, useTransition } from 'react';
import { Button, Card, Field, Input, Textarea } from '@/lib/ui';
import { updateUnitType } from '../actions';

interface UnitTypeInput {
  id: string;
  name: string;
  width_ft: number | null;
  length_ft: number | null;
  monthly_rate_cents: number;
  features: string[];
  description: string | null;
}

export function EditUnitTypeForm({
  facilitySlug,
  unitType,
}: {
  facilitySlug: string;
  unitType: UnitTypeInput;
}) {
  const [name, setName] = useState(unitType.name);
  const [width, setWidth] = useState(unitType.width_ft?.toString() ?? '');
  const [length, setLength] = useState(unitType.length_ft?.toString() ?? '');
  const [price, setPrice] = useState((unitType.monthly_rate_cents / 100).toString());
  const [features, setFeatures] = useState(unitType.features.join(', '));
  const [description, setDescription] = useState(unitType.description ?? '');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    setDone(null);
    startTransition(async () => {
      const res = await updateUnitType({
        facilitySlug,
        unitTypeId: unitType.id,
        name,
        width_ft: width,
        length_ft: length,
        price,
        features,
        description,
      });
      if (res?.error) setError(res.error);
      else setDone('saved');
    });
  }

  return (
    <Card>
      <div className="space-y-4">
        <Field label="Name">
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
        <Field
          label="Monthly rate (USD)"
          hint="Changing this does NOT update existing units. Edit them individually if needed."
        >
          <Input
            type="text"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </Field>
        <Field label="Features" hint="Comma-separated.">
          <Input value={features} onChange={(e) => setFeatures(e.target.value)} />
        </Field>
        <Field label="Description (optional)">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        </Field>

        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <div className="text-xs">
            {done ? <span className="text-emerald-700">{done}</span> : null}
            {error ? <span className="text-red-600">{error}</span> : null}
          </div>
          <Button onClick={submit} disabled={isPending}>
            {isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </Card>
  );
}

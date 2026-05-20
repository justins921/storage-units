'use client';

import { useState, useTransition } from 'react';
import { Button, Card, Field, Input, Textarea } from '@/lib/ui';
import { saveFacility } from './actions';

interface Initial {
  name: string;
  slug: string;
  hero_title: string;
  hero_subtitle: string;
  primary_color: string;
  logo_url: string;
}

export function FacilityForm({
  currentSlug,
  initial,
}: {
  currentSlug: string;
  initial: Initial;
}) {
  const [state, setState] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function update<K extends keyof Initial>(k: K, v: Initial[K]) {
    setState((s) => ({ ...s, [k]: v }));
  }

  function submit() {
    setError(null);
    setDone(null);
    startTransition(async () => {
      const res = await saveFacility({ currentSlug, ...state });
      if (res?.error) {
        setError(res.error);
        return;
      }
      setDone('saved');
      if (res?.newSlug && res.newSlug !== currentSlug) {
        window.location.href = `/admin/${res.newSlug}/settings/facility`;
      }
    });
  }

  return (
    <Card>
      <div className="space-y-4">
        <Field label="Facility name">
          <Input value={state.name} onChange={(e) => update('name', e.target.value)} />
        </Field>
        <Field
          label="Slug"
          hint="Used in the public URL: /{slug}. Lowercase letters, numbers, dashes only."
        >
          <Input
            value={state.slug}
            onChange={(e) => update('slug', e.target.value)}
            className="font-mono"
          />
        </Field>
        <Field label="Hero title">
          <Input
            value={state.hero_title}
            onChange={(e) => update('hero_title', e.target.value)}
            placeholder="Climate-controlled storage in ..."
          />
        </Field>
        <Field label="Hero subtitle">
          <Textarea
            rows={2}
            value={state.hero_subtitle}
            onChange={(e) => update('hero_subtitle', e.target.value)}
            placeholder="Drive-up access, 24/7 gate, month-to-month leases…"
          />
        </Field>
        <Field
          label="Primary brand color"
          hint="Hex like #0f4c81. Used for the hero background and primary buttons."
        >
          <Input
            value={state.primary_color}
            onChange={(e) => update('primary_color', e.target.value)}
            placeholder="#0f4c81"
            className="font-mono"
          />
        </Field>
        <Field label="Logo URL (optional)">
          <Input
            value={state.logo_url}
            onChange={(e) => update('logo_url', e.target.value)}
            placeholder="https://..."
          />
        </Field>

        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <div className="text-xs">
            {done ? <span className="text-emerald-700">{done}</span> : null}
            {error ? <span className="text-red-600">{error}</span> : null}
          </div>
          <Button onClick={submit} disabled={isPending}>
            {isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </div>
    </Card>
  );
}

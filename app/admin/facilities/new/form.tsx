'use client';

import { useState, useTransition } from 'react';
import { Button, Card, Field, Input, Textarea } from '@/lib/ui';
import { createFacility } from './actions';

export function NewFacilityForm() {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [heroTitle, setHeroTitle] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [primaryColor, setPrimaryColor] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await createFacility({
        name,
        slug,
        hero_title: heroTitle,
        hero_subtitle: heroSubtitle,
        primary_color: primaryColor,
      });
      if (res?.error) {
        setError(res.error);
        return;
      }
      if (res?.slug) {
        window.location.href = `/admin/${res.slug}/settings/unit-types`;
      }
    });
  }

  return (
    <Card>
      <div className="space-y-4">
        <Field label="Facility name">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Yellowstone Storage"
          />
        </Field>
        <Field
          label="Slug"
          hint="Lowercase letters, numbers, dashes only. Becomes /{slug} on the public site."
        >
          <Input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="font-mono"
            placeholder="yellowstone"
          />
        </Field>
        <Field label="Hero title (optional)">
          <Input
            value={heroTitle}
            onChange={(e) => setHeroTitle(e.target.value)}
            placeholder="Climate-controlled storage in ..."
          />
        </Field>
        <Field label="Hero subtitle (optional)">
          <Textarea
            rows={2}
            value={heroSubtitle}
            onChange={(e) => setHeroSubtitle(e.target.value)}
          />
        </Field>
        <Field
          label="Primary brand color (optional)"
          hint="Hex like #0f4c81."
        >
          <Input
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            placeholder="#0f4c81"
            className="font-mono"
          />
        </Field>

        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          {error ? <span className="text-xs text-red-600">{error}</span> : <span />}
          <Button onClick={submit} disabled={isPending || !name || !slug}>
            {isPending ? 'Creating…' : 'Create facility'}
          </Button>
        </div>
      </div>
    </Card>
  );
}

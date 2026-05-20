'use client';

import { useState, useTransition } from 'react';
import { Button, Field, Input } from '@/lib/ui';

export function ReserveButton({ unitId, unitLabel }: { unitId: string; unitLabel: string }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reserve() {
    setError(null);
    startTransition(async () => {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ unitId, customerEmail: email }),
      });
      const body = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !body.url) {
        setError(body.error ?? 'Could not start checkout.');
        return;
      }
      window.location.href = body.url;
    });
  }

  return (
    <div className="mt-5 space-y-3">
      <Field label="Your email" error={error}>
        <Input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </Field>
      <Button
        onClick={reserve}
        disabled={isPending || !email}
        className="w-full"
        variant="primary"
      >
        {isPending ? 'Starting checkout…' : `Reserve unit ${unitLabel}`}
      </Button>
    </div>
  );
}

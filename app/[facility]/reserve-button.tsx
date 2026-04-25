'use client';

import { useState, useTransition } from 'react';

interface Props {
  unitId: string;
  unitLabel: string;
}

export function ReserveButton({ unitId, unitLabel }: Props) {
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
    <div className="mt-4 space-y-2">
      <label className="block text-sm text-gray-600">
        Your email
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
      </label>
      <button
        type="button"
        onClick={reserve}
        disabled={isPending || !email}
        className="w-full rounded bg-brand px-4 py-2 text-sm font-medium text-brand-fg disabled:opacity-50"
      >
        {isPending ? 'Starting checkout…' : `Reserve unit ${unitLabel}`}
      </button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

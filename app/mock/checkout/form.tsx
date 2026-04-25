'use client';

import { useState, useTransition } from 'react';

interface Props {
  sessionId: string;
  successUrl: string;
  cancelUrl: string;
  metadataJson: string;
  email: string;
}

export function MockCheckoutForm({
  sessionId,
  successUrl,
  cancelUrl,
  metadataJson,
  email,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function fire(kind: 'pay' | 'cancel') {
    setError(null);
    startTransition(async () => {
      const res = await fetch('/api/mock/fire-event', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind, sessionId, metadataJson, email }),
      });
      if (!res.ok) {
        setError('Mock event failed; check server logs.');
        return;
      }
      window.location.href = kind === 'pay' ? successUrl : cancelUrl;
    });
  }

  return (
    <div className="mt-6 space-y-2">
      <button
        type="button"
        onClick={() => fire('pay')}
        disabled={isPending}
        className="w-full rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {isPending ? 'Processing…' : 'Pay (mock)'}
      </button>
      <button
        type="button"
        onClick={() => fire('cancel')}
        disabled={isPending}
        className="w-full rounded border border-gray-300 px-4 py-2 text-sm"
      >
        Cancel
      </button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

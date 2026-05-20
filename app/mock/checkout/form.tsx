'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/lib/ui';

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
      <Button
        onClick={() => fire('pay')}
        disabled={isPending}
        className="w-full bg-emerald-600 hover:bg-emerald-700"
      >
        {isPending ? 'Processing…' : 'Pay (mock)'}
      </Button>
      <Button onClick={() => fire('cancel')} disabled={isPending} variant="secondary" className="w-full">
        Cancel
      </Button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

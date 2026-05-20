'use client';

import { useTransition, useState } from 'react';
import { Button } from '@/lib/ui';
import { generateLastMonth } from './actions';

export function GenerateNowButton({ facilitySlug }: { facilitySlug: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
      <Button
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const res = await generateLastMonth({ facilitySlug });
            if (res?.error) setError(res.error);
          });
        }}
        disabled={isPending}
      >
        {isPending ? 'Generating…' : 'Generate last month'}
      </Button>
    </div>
  );
}

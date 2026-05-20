'use client';

import { useTransition, useState } from 'react';
import { generateLastMonth } from './actions';

export function GenerateNowButton({ facilitySlug }: { facilitySlug: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
      <button
        type="button"
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const res = await generateLastMonth({ facilitySlug });
            if (res?.error) setError(res.error);
          });
        }}
        disabled={isPending}
        className="rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {isPending ? 'Generating…' : 'Generate last month'}
      </button>
    </div>
  );
}

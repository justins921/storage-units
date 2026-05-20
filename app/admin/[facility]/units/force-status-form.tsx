'use client';

import { useState, useTransition } from 'react';
import { forceUnitStatus } from './actions';

const OPTIONS = ['available', 'maintenance', 'out_of_service'];

export function ForceStatusForm({
  unitId,
  facilitySlug,
  currentStatus,
}: {
  unitId: string;
  facilitySlug: string;
  currentStatus: string;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (status === currentStatus) return;
    setError(null);
    startTransition(async () => {
      const result = await forceUnitStatus({ unitId, facilitySlug, status });
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="mt-3 flex items-center gap-2 text-xs">
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="rounded border border-gray-300 px-2 py-1"
      >
        {OPTIONS.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
        {currentStatus === 'occupied' ? (
          <option value="occupied" disabled>
            occupied (end lease first)
          </option>
        ) : null}
      </select>
      <button
        type="button"
        onClick={submit}
        disabled={isPending || status === currentStatus || currentStatus === 'occupied'}
        className="rounded border border-gray-300 px-2 py-1 disabled:opacity-50"
      >
        Force
      </button>
      {error ? <span className="text-red-600">{error}</span> : null}
    </div>
  );
}

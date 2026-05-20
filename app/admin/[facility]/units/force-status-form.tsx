'use client';

import { useState, useTransition } from 'react';
import { Button, Select } from '@/lib/ui';
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
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="flex-1 text-xs"
          disabled={currentStatus === 'occupied'}
        >
          {OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o.replace('_', ' ')}
            </option>
          ))}
          {currentStatus === 'occupied' ? (
            <option value="occupied" disabled>
              occupied
            </option>
          ) : null}
        </Select>
        <Button
          size="sm"
          variant="secondary"
          onClick={submit}
          disabled={
            isPending || status === currentStatus || currentStatus === 'occupied'
          }
        >
          Set
        </Button>
      </div>
      {currentStatus === 'occupied' ? (
        <p className="text-xs text-slate-500">End the lease to change status.</p>
      ) : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/lib/ui';
import { deleteUnit } from '../actions';

export function DeleteUnitButton({
  facilitySlug,
  unitId,
  disabled,
}: {
  facilitySlug: string;
  unitId: string;
  disabled?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!confirm('Delete this unit? Only allowed if it has no lease history.')) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteUnit({ facilitySlug, unitId });
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="flex items-center gap-2">
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
      <Button size="sm" variant="secondary" onClick={submit} disabled={disabled || isPending}>
        Delete
      </Button>
    </div>
  );
}

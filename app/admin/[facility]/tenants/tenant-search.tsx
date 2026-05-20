'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Input, Select } from '@/lib/ui';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'past_due', label: 'Past due' },
];

export function TenantSearch({
  facilitySlug,
  initialQuery,
  initialFilter,
}: {
  facilitySlug: string;
  initialQuery: string;
  initialFilter: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const [filter, setFilter] = useState(initialFilter);

  function go(nextQ: string, nextFilter: string) {
    const url = new URLSearchParams();
    if (nextQ) url.set('q', nextQ);
    if (nextFilter && nextFilter !== 'all') url.set('filter', nextFilter);
    const qs = url.toString();
    router.push(`/admin/${facilitySlug}/tenants${qs ? `?${qs}` : ''}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') go(q, filter);
        }}
        placeholder="Search email, name, phone"
        className="w-64"
      />
      <Select
        value={filter}
        onChange={(e) => {
          setFilter(e.target.value);
          go(q, e.target.value);
        }}
      >
        {FILTERS.map((f) => (
          <option key={f.value} value={f.value}>
            {f.label}
          </option>
        ))}
      </Select>
      <Button variant="secondary" onClick={() => go(q, filter)}>
        Search
      </Button>
    </div>
  );
}

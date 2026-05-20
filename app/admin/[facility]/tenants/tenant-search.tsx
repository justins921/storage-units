'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

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
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') go(q, filter);
        }}
        placeholder="Search email, name, phone"
        className="w-64 rounded border border-gray-300 px-3 py-2 text-sm"
      />
      <select
        value={filter}
        onChange={(e) => {
          setFilter(e.target.value);
          go(q, e.target.value);
        }}
        className="rounded border border-gray-300 px-2 py-2 text-sm"
      >
        {FILTERS.map((f) => (
          <option key={f.value} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => go(q, filter)}
        className="rounded border border-gray-300 px-3 py-2 text-sm"
      >
        Search
      </button>
    </div>
  );
}

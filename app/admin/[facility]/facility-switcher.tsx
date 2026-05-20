'use client';

import { Select } from '@/lib/ui';

export function FacilitySwitcher({
  currentSlug,
  facilities,
}: {
  currentSlug: string;
  facilities: { id: string; slug: string; name: string }[];
}) {
  return (
    <Select
      defaultValue={currentSlug}
      onChange={(e) => {
        window.location.href = `/admin/${e.target.value}`;
      }}
      className="text-sm"
    >
      {facilities.map((f) => (
        <option key={f.id} value={f.slug}>
          {f.name}
        </option>
      ))}
    </Select>
  );
}

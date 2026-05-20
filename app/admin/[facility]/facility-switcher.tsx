'use client';

export function FacilitySwitcher({
  currentSlug,
  facilities,
}: {
  currentSlug: string;
  facilities: { id: string; slug: string; name: string }[];
}) {
  return (
    <select
      defaultValue={currentSlug}
      className="rounded border border-gray-300 px-2 py-1 text-sm"
      onChange={(e) => {
        window.location.href = `/admin/${e.target.value}`;
      }}
    >
      {facilities.map((f) => (
        <option key={f.id} value={f.slug}>
          {f.name}
        </option>
      ))}
    </select>
  );
}

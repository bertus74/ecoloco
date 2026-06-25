"use client";

export function InlineSelect({
  defaultValue,
  options,
  onChangeValue,
}: {
  defaultValue: string;
  options: { value: string; label: string }[];
  onChangeValue: (value: string) => Promise<void>;
}) {
  return (
    <select
      defaultValue={defaultValue}
      onChange={(e) => onChangeValue(e.target.value)}
      className="rounded-md border border-[var(--border)] px-2 py-1 text-sm"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

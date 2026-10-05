import type { Pack } from "@/lib/types";

export function PackPills({ packs }: { packs: Pack[] }) {
  if (packs.length === 0) return <span className="text-xs text-[var(--muted)]">—</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {packs.map((p) => (
        <span
          key={p.id}
          title={p.label}
          className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-xs"
        >
          {p.emoji}
        </span>
      ))}
    </span>
  );
}

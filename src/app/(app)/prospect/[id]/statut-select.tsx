"use client";

const STATUTS = [
  "Nouveau", "Contacté", "Intéressé", "RDV planifié", "Diagnostic vendu", "Perdu", "Blacklist",
];

export function StatutSelect({
  statutActuel,
  onChangeStatut,
}: {
  statutActuel: string;
  onChangeStatut: (statut: string) => Promise<void>;
}) {
  return (
    <select
      defaultValue={statutActuel}
      onChange={(e) => onChangeStatut(e.target.value)}
      className="rounded-md border border-[var(--border)] px-2 py-1 text-sm"
    >
      {STATUTS.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  );
}

import type { NiveauScore } from "@/lib/types";

const STYLES: Record<NiveauScore, { label: string; className: string; dot: string }> = {
  Chaud: { label: "Chaud", className: "bg-[var(--danger-light)] text-[var(--danger)]", dot: "bg-[var(--danger)]" },
  Tiede: { label: "Tiède", className: "bg-[var(--warning-light)] text-[var(--warning)]", dot: "bg-[var(--warning)]" },
  Froid: { label: "Froid", className: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
};

export function NiveauBadge({ niveau }: { niveau: NiveauScore | null }) {
  if (!niveau) return <span className="text-xs text-[var(--muted)]">—</span>;
  const s = STYLES[niveau];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${s.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

const STATUT_STYLES: Record<string, string> = {
  Nouveau: "bg-slate-100 text-slate-700",
  Contacté: "bg-[#eaf0fa] text-[#2e5fa6]",
  Intéressé: "bg-[#f0ebfa] text-[#7040b0]",
  "RDV planifié": "bg-[#fef0e6] text-[#a8541f]",
  "Diagnostic vendu": "bg-[var(--primary-light)] text-[var(--primary-dark)]",
  Perdu: "bg-[var(--danger-light)] text-[var(--danger)]",
  Blacklist: "bg-slate-200 text-slate-600",
};

export function StatutBadge({ statut }: { statut: string | null }) {
  if (!statut) return null;
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${STATUT_STYLES[statut] ?? "bg-slate-100 text-slate-700"}`}>
      {statut}
    </span>
  );
}

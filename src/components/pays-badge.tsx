/** Repère les prospects situés hors de France : l'enrichissement automatique (surface, DPE) ne les couvre pas. */
export const MESSAGE_HORS_FRANCE =
  "Hors de France : la surface et le DPE ne sont pas récupérés automatiquement. Le score et le CA potentiel reposent sur des valeurs par défaut (80 m²) et des ratios français : à prendre comme indicatifs.";

export function PaysBadge({ pays }: { pays: string | null }) {
  if (!pays || pays === "France") return null;
  return (
    <span
      title={MESSAGE_HORS_FRANCE}
      className="ml-1.5 inline-flex rounded-full bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-800"
    >
      {pays}
    </span>
  );
}

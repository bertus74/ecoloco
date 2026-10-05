// Statuts du CHECK Supabase `commerc.statut_prospect` (Blacklist et À valider exclus du kanban).
export const COLONNES_KANBAN = ["Nouveau", "Contacté", "Intéressé", "RDV planifié", "Diagnostic vendu", "Perdu"];

export const COULEURS_COLONNES: Record<string, string> = {
  Nouveau: "#6b7280",
  Contacté: "#2e5fa6",
  Intéressé: "#7040b0",
  "RDV planifié": "#e07b39",
  "Diagnostic vendu": "#1a7a4a",
  Perdu: "#a32d2d",
};

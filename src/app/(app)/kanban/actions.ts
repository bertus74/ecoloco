"use server";

import { rafraichirVues } from "@/lib/rafraichir";
import { createClient } from "@/lib/supabase/server";
import { COLONNES_KANBAN } from "./colonnes";

export async function deplacerProspect(prospectId: number, statut: string, montant?: number | null, packsVendus?: string[]) {
  if (!COLONNES_KANBAN.includes(statut)) throw new Error(`Statut inconnu : ${statut}`);
  if (montant != null && (!Number.isFinite(montant) || montant <= 0 || montant > 10_000_000)) throw new Error("Montant invalide");
  const supabase = await createClient();
  // RLS ne renvoie pas d'erreur si la ligne n'appartient pas au commercial : on vérifie qu'une ligne a bien bougé.
  const { data, error } = await supabase
    .from("commerc")
    // Le montant du contrat n'est écrit qu'à la vente ; en changeant de colonne ensuite il est conservé.
    .update(statut === "Diagnostic vendu"
        ? { statut_prospect: statut, ...(montant != null ? { montant_devis: montant } : {}), ...(packsVendus ? { packs_vendus: [...new Set(packsVendus)].filter((x) => x.length <= 50) } : {}) }
        : { statut_prospect: statut })
    .eq("id", prospectId)
    .select("id");
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error("Prospect introuvable ou non autorisé");
  rafraichirVues();
}

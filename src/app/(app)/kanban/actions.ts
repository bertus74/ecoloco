"use server";

import { rafraichirVues } from "@/lib/rafraichir";
import { createClient } from "@/lib/supabase/server";
import { COLONNES_KANBAN } from "./colonnes";

export async function deplacerProspect(prospectId: number, statut: string) {
  if (!COLONNES_KANBAN.includes(statut)) throw new Error(`Statut inconnu : ${statut}`);
  const supabase = await createClient();
  // RLS ne renvoie pas d'erreur si la ligne n'appartient pas au commercial : on vérifie qu'une ligne a bien bougé.
  const { data, error } = await supabase
    .from("commerc")
    .update({ statut_prospect: statut })
    .eq("id", prospectId)
    .select("id");
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error("Prospect introuvable ou non autorisé");
  rafraichirVues();
}

"use server";

import { rafraichirVues } from "@/lib/rafraichir";
import { createClient } from "@/lib/supabase/server";

export type CiblePurge = "perdus" | "nouveaux_sans_contact";

/** Supprime définitivement des prospects (et, en cascade, leurs interactions, RDV et historique de score). Réservé au DG. */
export async function purgerProspects(cible: CiblePurge): Promise<{ supprimes: number }> {
  if (cible !== "perdus" && cible !== "nouveaux_sans_contact") throw new Error("Cible de purge inconnue");
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Non authentifié");
  const { data: profil } = await supabase.from("commerciaux").select("role").eq("auth_user_id", auth.user.id).single();
  if (profil?.role !== "dg") throw new Error("Réservé à la direction");

  // Les prospects « Blacklist » ne sont jamais purgés : leur trace évite de les recontacter après un nouveau scraping.
  const requete = supabase.from("commerc").delete({ count: "exact" });
  const { error, count } = await (cible === "perdus"
    ? requete.eq("statut_prospect", "Perdu")
    : requete.eq("statut_prospect", "Nouveau").is("derniere_interaction", null));
  if (error) throw new Error(error.message);

  rafraichirVues();
  return { supprimes: count ?? 0 };
}

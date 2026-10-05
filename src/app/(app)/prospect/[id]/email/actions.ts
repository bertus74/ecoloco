"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { genererBrouillon } from "@/lib/email-ia";
import type { Commerc, Commercial } from "@/lib/types";
import { chargerArgumentaire } from "@/lib/argumentaire-server";

async function getCommercial(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Non authentifié");
  const { data } = await supabase
    .from("commerciaux")
    .select("*")
    .eq("auth_user_id", auth.user.id)
    .single<Commercial>();
  if (!data) throw new Error("Profil commercial introuvable");
  return data;
}

export async function redigerAvecIA(prospectId: string, variables: Record<string, string>) {
  const supabase = await createClient();
  await getCommercial(supabase);
  const { data: prospect } = await supabase
    .from("commerc")
    .select("*")
    .eq("id", prospectId)
    .single<Commerc>();
  if (!prospect) throw new Error("Prospect introuvable");
  const argumentaire = await chargerArgumentaire(supabase, prospect);
  return genererBrouillon(prospect, argumentaire, variables);
}

// Appelé quand le commercial valide l'email : trace l'envoi dans l'historique
// et fait passer un prospect "Nouveau" en "Contacté".
export async function enregistrerEmailValide(prospectId: string, objet: string) {
  const supabase = await createClient();
  const commercial = await getCommercial(supabase);
  const maintenant = new Date().toISOString();

  await supabase.from("interactions").insert({
    commerc_id: Number(prospectId),
    commercial_id: commercial.id,
    type_interaction: "Email",
    note: `Email validé — « ${objet} »`,
    date_interaction: maintenant,
  });

  await supabase
    .from("commerc")
    .update({ derniere_interaction: maintenant, prochaine_relance_le: null, nb_reports_relance: 0 })
    .eq("id", prospectId);

  await supabase
    .from("commerc")
    .update({ statut_prospect: "Contacté" })
    .eq("id", prospectId)
    .eq("statut_prospect", "Nouveau");

  revalidatePath(`/prospect/${prospectId}`);
}

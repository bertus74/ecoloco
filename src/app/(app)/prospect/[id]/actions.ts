"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function getCurrentCommercialId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Non authentifié");
  const { data: profile } = await supabase
    .from("commerciaux")
    .select("id")
    .eq("auth_user_id", auth.user.id)
    .single();
  if (!profile) throw new Error("Profil commercial introuvable");
  return profile.id as number;
}

export async function updateContact(prospectId: string, formData: FormData) {
  const supabase = await createClient();
  await supabase
    .from("commerc")
    .update({
      Tel: String(formData.get("tel") ?? "") || null,
      email: String(formData.get("email") ?? "") || null,
      URL: String(formData.get("url") ?? "") || null,
    })
    .eq("id", prospectId);
  revalidatePath(`/prospect/${prospectId}`);
}

export async function addInteraction(prospectId: string, formData: FormData) {
  const supabase = await createClient();
  const commercialId = await getCurrentCommercialId(supabase);

  const type_interaction = String(formData.get("type_interaction") ?? "Note");
  const note = String(formData.get("note") ?? "");

  await supabase.from("interactions").insert({
    commerc_id: Number(prospectId),
    commercial_id: commercialId,
    type_interaction,
    note: note || null,
    date_interaction: new Date().toISOString(),
  });

  await supabase
    .from("commerc")
    .update({
      derniere_interaction: new Date().toISOString(),
      prochaine_relance_le: null,
      nb_reports_relance: 0,
    })
    .eq("id", prospectId);

  revalidatePath(`/prospect/${prospectId}`);
}

export async function reporterRelance(prospectId: string, nbReportsActuel: number) {
  const supabase = await createClient();
  if (nbReportsActuel >= 3) throw new Error("Plafond de 3 reports atteint");

  const dans10jours = new Date();
  dans10jours.setDate(dans10jours.getDate() + 10);

  await supabase
    .from("commerc")
    .update({
      prochaine_relance_le: dans10jours.toISOString().slice(0, 10),
      nb_reports_relance: nbReportsActuel + 1,
    })
    .eq("id", prospectId);

  revalidatePath(`/prospect/${prospectId}`);
}

export async function changerStatut(prospectId: string, statut: string) {
  const supabase = await createClient();
  await supabase.from("commerc").update({ statut_prospect: statut }).eq("id", prospectId);
  revalidatePath(`/prospect/${prospectId}`);
}

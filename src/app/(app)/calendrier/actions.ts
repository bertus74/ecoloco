"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function creerRdv(formData: FormData) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Non authentifié");

  const { data: profile } = await supabase
    .from("commerciaux")
    .select("id")
    .eq("auth_user_id", auth.user.id)
    .single();
  if (!profile) throw new Error("Profil commercial introuvable");

  const commerc_id = Number(formData.get("commerc_id"));
  const date = String(formData.get("date") ?? "");
  const heure = String(formData.get("heure") ?? "09:00");
  const duree_minutes = Number(formData.get("duree_minutes") ?? 60);
  const lieu = String(formData.get("lieu") ?? "");
  const note = String(formData.get("note") ?? "");

  if (!commerc_id || !date) throw new Error("Prospect et date requis");

  const date_rdv = new Date(`${date}T${heure}:00`).toISOString();

  await supabase.from("rdv").insert({
    commerc_id,
    commercial_id: profile.id,
    date_rdv,
    duree_minutes,
    lieu: lieu || null,
    note: note || null,
    statut: "Planifié",
  });

  await supabase
    .from("commerc")
    .update({ statut_prospect: "RDV planifié" })
    .eq("id", commerc_id);

  revalidatePath("/calendrier");
}

export async function changerStatutRdv(rdvId: number, statut: string) {
  const supabase = await createClient();
  await supabase.from("rdv").update({ statut }).eq("id", rdvId);
  revalidatePath("/calendrier");
}

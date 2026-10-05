"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parisVersIso } from "@/lib/heure-paris";

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

  const date_rdv = parisVersIso(date, heure);

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

export async function modifierRdv(rdvId: number, formData: FormData) {
  const supabase = await createClient();

  const date = String(formData.get("date") ?? "");
  const heure = String(formData.get("heure") ?? "09:00");
  const duree_minutes = Number(formData.get("duree_minutes") ?? 60);
  const lieu = String(formData.get("lieu") ?? "");
  const note = String(formData.get("note") ?? "");
  const statut = String(formData.get("statut") ?? "Planifié");

  if (!date) throw new Error("Date requise");

  const date_rdv = parisVersIso(date, heure);

  await supabase
    .from("rdv")
    .update({
      date_rdv,
      duree_minutes,
      lieu: lieu || null,
      note: note || null,
      statut,
    })
    .eq("id", rdvId);

  revalidatePath("/calendrier");
}

export async function supprimerRdv(rdvId: number) {
  const supabase = await createClient();
  await supabase.from("rdv").delete().eq("id", rdvId);
  revalidatePath("/calendrier");
}

// Recherche de prospects pour le formulaire de RDV (scope RLS : les siens, ou tous pour la DG).
export async function chercherProspects(terme: string) {
  const q = terme.trim().replace(/[%,()]/g, " ");
  if (q.length < 2) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("commerc")
    .select("id, Nom, Ville")
    .not("statut_prospect", "in", '("Perdu","Blacklist","À valider")')
    .or(`Nom.ilike.%${q}%,Ville.ilike.%${q}%`)
    .order("Nom")
    .limit(30);
  return (data ?? []) as { id: number; Nom: string | null; Ville: string | null }[];
}

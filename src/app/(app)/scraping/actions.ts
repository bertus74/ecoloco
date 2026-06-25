"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const WF01_WEBHOOK_URL = "https://bertus74.app.n8n.cloud/webhook/lancer-prospection";

export async function lancerProspection(formData: FormData) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Non authentifié");

  const { data: profile } = await supabase
    .from("commerciaux")
    .select("id")
    .eq("auth_user_id", auth.user.id)
    .single();
  if (!profile) throw new Error("Profil commercial introuvable");

  const pays = String(formData.get("pays") ?? "France");
  const code_postal = String(formData.get("code_postal") ?? "").trim();
  const type_commerce = String(formData.get("type_commerce") ?? "");
  const rayon_km = Number(formData.get("rayon_km") ?? 2);

  if (!code_postal) throw new Error("Code postal ou ville requis");

  const { data: demande, error } = await supabase
    .from("demandes_scraping")
    .insert({
      commercial_id: profile.id,
      pays,
      code_postal,
      type_commerce,
      rayon_km,
      statut: "En attente",
    })
    .select()
    .single();

  if (error || !demande) throw new Error(error?.message ?? "Échec de la création de la demande");

  const url = new URL(WF01_WEBHOOK_URL);
  url.searchParams.set("demande_id", String(demande.id));
  url.searchParams.set("commercial_id", String(profile.id));
  url.searchParams.set("code_postal", code_postal);
  url.searchParams.set("pays", pays);
  url.searchParams.set("type_commerce", type_commerce);

  try {
    const res = await fetch(url.toString(), { method: "GET" });
    if (!res.ok) {
      console.error("WF-01 webhook non-OK:", res.status, await res.text());
    }
  } catch (e) {
    console.error("WF-01 webhook fetch failed:", e);
    await supabase
      .from("demandes_scraping")
      .update({ statut: "Erreur" })
      .eq("id", demande.id);
  }

  revalidatePath("/scraping");
}

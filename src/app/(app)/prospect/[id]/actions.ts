"use server";

import { rafraichirVues } from "@/lib/rafraichir";
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
  rafraichirVues();
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

  rafraichirVues();
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

  rafraichirVues();
}

export async function changerStatut(prospectId: string, statut: string) {
  const supabase = await createClient();
  await supabase.from("commerc").update({ statut_prospect: statut }).eq("id", prospectId);
  rafraichirVues();
}

export async function changerCommercial(prospectId: string, commercialId: string) {
  const supabase = await createClient();
  await supabase
    .from("commerc")
    .update({ commercial_id: Number(commercialId) })
    .eq("id", prospectId);
  rafraichirVues();
}

export interface Qualification {
  niveau: "Chaud" | "Tiede" | "Froid";
  packs: string[];
  note: string;
  prochaineEtape: string;
  prochaineDate: string | null;
  accordRgpd: boolean;
}

export async function qualifierProspect(prospectId: string, q: Qualification) {
  if (!q.accordRgpd) throw new Error("L'accord RGPD du prospect est obligatoire pour qualifier.");
  if (!["Chaud", "Tiede", "Froid"].includes(q.niveau)) throw new Error("Niveau invalide");

  const supabase = await createClient();
  const commercialId = await getCurrentCommercialId(supabase);
  const maintenant = new Date().toISOString();

  const { data: prospect } = await supabase
    .from("commerc")
    .select("statut_prospect")
    .eq("id", prospectId)
    .single();

  // Un prospect chaud ou tiède qualifié passe en "Intéressé" (= qualifié, cf. CHECK statut_prospect).
  const passeInteresse =
    q.niveau !== "Froid" && ["Nouveau", "Contacté"].includes(prospect?.statut_prospect ?? "");

  const { error } = await supabase
    .from("commerc")
    .update({
      niveau_qualifie: q.niveau,
      packs_pertinents: q.packs,
      prochaine_etape: q.prochaineEtape || null,
      prochaine_relance_le: q.prochaineDate || null,
      nb_reports_relance: 0,
      rgpd_accord_le: maintenant,
      qualifie_le: maintenant,
      derniere_interaction: maintenant,
      ...(passeInteresse ? { statut_prospect: "Intéressé" } : {}),
    })
    .eq("id", prospectId);
  if (error) throw new Error(error.message);

  const resume = [
    `Qualification : ${q.niveau === "Tiede" ? "Tiède" : q.niveau}`,
    q.prochaineEtape ? `prochaine étape : ${q.prochaineEtape}${q.prochaineDate ? ` le ${new Date(q.prochaineDate).toLocaleDateString("fr-FR")}` : ""}` : null,
    q.note || null,
  ]
    .filter(Boolean)
    .join(" — ");

  await supabase.from("interactions").insert({
    commerc_id: Number(prospectId),
    commercial_id: commercialId,
    type_interaction: "Note",
    note: resume,
    date_interaction: maintenant,
  });

  rafraichirVues();
}

function montantValide(montant: number | null): number | null {
  if (montant == null) return null;
  if (!Number.isFinite(montant) || montant <= 0 || montant > 10_000_000) throw new Error("Montant invalide");
  return Math.round(montant * 100) / 100;
}

/** Passage en « Diagnostic vendu » avec le montant du contrat (€ HT) ; `null` = montant à saisir plus tard. */
export async function enregistrerVente(prospectId: string, montant: number | null) {
  const m = montantValide(montant);
  const supabase = await createClient();
  const commercialId = await getCurrentCommercialId(supabase);

  const { data, error } = await supabase
    .from("commerc")
    .update(m != null ? { statut_prospect: "Diagnostic vendu", montant_devis: m } : { statut_prospect: "Diagnostic vendu" })
    .eq("id", prospectId)
    .select("id");
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error("Prospect introuvable ou non autorisé");

  await supabase.from("interactions").insert({
    commerc_id: Number(prospectId),
    commercial_id: commercialId,
    type_interaction: "Note",
    note: m != null ? `Diagnostic vendu — contrat de ${m.toLocaleString("fr-FR")} € HT` : "Diagnostic vendu — montant à saisir",
    date_interaction: new Date().toISOString(),
  });

  rafraichirVues();
}

/** Corrige ou renseigne le montant du contrat après coup. */
export async function modifierMontant(prospectId: string, montant: number | null) {
  const m = montantValide(montant);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("commerc")
    .update({ montant_devis: m })
    .eq("id", prospectId)
    .select("id");
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error("Prospect introuvable ou non autorisé");
  rafraichirVues();
}

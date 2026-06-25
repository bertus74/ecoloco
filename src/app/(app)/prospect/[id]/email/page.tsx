import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Commerc, Commercial } from "@/lib/types";
import { EmailForm } from "./email-form";

function genererBrouillon(prospect: Commerc, commercial: Commercial | null) {
  const nom = prospect.Nom ?? "votre établissement";
  const ville = prospect.Ville ?? "";
  const avis = prospect.Nbre_Avis ?? 0;
  const note = prospect.note_google ?? null;
  const ca = prospect.ca_potentiel;
  const surface = prospect.surface;

  const lignes: string[] = [];
  lignes.push("Bonjour,");
  lignes.push("");

  let intro = `En tant que ${prospect.Cat_scraping?.toLowerCase() || "commerce"} reconnu${ville ? ` à ${ville}` : ""}`;
  if (note != null && avis > 0) intro += ` (${avis} avis, ${note}/5)`;
  intro += ", votre facture énergétique pourrait être optimisée significativement.";
  lignes.push(intro);
  lignes.push("");

  if (ca != null) {
    lignes.push(
      `Nous estimons un potentiel d'économie d'environ ${ca.toLocaleString("fr-FR")} € par an pour ${nom}, en mobilisant notamment les aides CEE disponibles.`,
    );
  } else if (surface != null) {
    lignes.push(
      `Avec une surface de ${surface} m², ${nom} entre typiquement dans les profils où nos diagnostics révèlent un fort potentiel d'économie, aides CEE à la clé.`,
    );
  } else {
    lignes.push(
      `Les commerces de ce secteur ont souvent un potentiel d'économie énergétique important, avec des aides CEE pouvant couvrir une partie des travaux.`,
    );
  }
  lignes.push("");
  lignes.push("Seriez-vous disponible pour un diagnostic gratuit cette semaine ?");
  lignes.push("");
  lignes.push("Cordialement,");
  lignes.push(`${commercial ? `${commercial.Prénom} ${commercial.Nom}` : ""}`);
  lignes.push("EcoLoco");

  return lignes.join("\n");
}

export default async function EmailProspectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: prospect } = await supabase
    .from("commerc")
    .select("*")
    .eq("id", id)
    .single<Commerc>();

  if (!prospect) notFound();

  const { data: auth } = await supabase.auth.getUser();
  let commercial: Commercial | null = null;
  if (auth.user) {
    const { data } = await supabase
      .from("commerciaux")
      .select("*")
      .eq("auth_user_id", auth.user.id)
      .single();
    commercial = data;
  }

  const brouillon = genererBrouillon(prospect, commercial);
  const objet = `Réduisez vos coûts énergétiques — diagnostic gratuit pour ${prospect.Nom}`;

  return (
    <div className="max-w-2xl">
      <Link href={`/prospect/${id}`} className="mb-4 inline-block text-sm text-[var(--muted)]">
        ← Retour à la fiche
      </Link>

      <h1 className="mb-1 text-xl font-medium">Email pour {prospect.Nom}</h1>
      <p className="mb-5 text-sm text-[var(--muted)]">
        Brouillon généré à partir des données du prospect — relisez avant envoi.
      </p>

      <EmailForm
        destinataire={prospect.email ?? ""}
        objet={objet}
        corps={brouillon}
        hasEmail={!!prospect.email}
      />
    </div>
  );
}

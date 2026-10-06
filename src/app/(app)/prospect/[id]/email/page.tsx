import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Commerc, TemplateEmail } from "@/lib/types";
import { SECTEURS, secteurDe } from "@/lib/secteurs";
import { variablesEmail } from "@/lib/argumentaire";
import { chargerArgumentaire } from "@/lib/argumentaire-server";
import { EmailEditor } from "./email-form";

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

  if (prospect.statut_prospect === "Blacklist") {
    return (
      <div className="max-w-6xl">
        <Link href={`/prospect/${id}`} className="mb-4 inline-block text-sm text-[var(--muted)]">
          ← Retour à la fiche
        </Link>
        <p className="rounded-md bg-[var(--danger-light)] px-4 py-3 text-sm text-[var(--danger)]">
          {prospect.Nom} est en liste d&apos;opposition (Blacklist) : aucun email ne peut lui être envoyé.
        </p>
      </div>
    );
  }


  const secteur = secteurDe(prospect.Cat_scraping);

  const { data: templates } = await supabase
    .from("templates_email")
    .select("*")
    .in("secteur", [secteur, "autre"])
    .returns<TemplateEmail[]>();
  const template =
    templates?.find((t) => t.secteur === secteur) ??
    templates?.find((t) => t.secteur === "autre") ?? { secteur: "autre", objet: "", corps: "" };

  const argumentaire = await chargerArgumentaire(supabase, prospect);
  // Emails signés « Eco-Locaux » uniquement, sans nom de commercial.
  const variables = variablesEmail(argumentaire);

  return (
    <div className="max-w-6xl">
      <Link href={`/prospect/${id}`} className="mb-4 inline-block text-sm text-[var(--muted)]">
        ← Retour à la fiche
      </Link>

      <h1 className="mb-1 text-xl font-medium">Email pour {prospect.Nom}</h1>
      <p className="mb-5 text-sm text-[var(--muted)]">
        Template « {SECTEURS[secteur].label} » pré-rempli avec les chiffres du prospect : économies, packs et financement.
        Relisez puis validez avant envoi.
      </p>

      <EmailEditor
        prospectId={id}
        destinataire={prospect.email ?? ""}
        objetInitial={template.objet}
        corpsInitial={template.corps}
        variablesInitiales={variables}
      />
    </div>
  );
}

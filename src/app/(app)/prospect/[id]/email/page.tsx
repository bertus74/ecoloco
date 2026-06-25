import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Commercial } from "@/lib/types";
import { genererBrouillon } from "@/lib/email-ia";
import { EmailForm } from "./email-form";

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

  const { corps: brouillon, viaIA } = await genererBrouillon(prospect, commercial);
  const objet = `Réduisez vos coûts énergétiques — diagnostic gratuit pour ${prospect.Nom}`;

  return (
    <div className="max-w-2xl">
      <Link href={`/prospect/${id}`} className="mb-4 inline-block text-sm text-[var(--muted)]">
        ← Retour à la fiche
      </Link>

      <h1 className="mb-1 text-xl font-medium">Email pour {prospect.Nom}</h1>
      <p className="mb-5 text-sm text-[var(--muted)]">
        {viaIA
          ? "Brouillon généré par IA à partir des données du prospect — relisez avant envoi."
          : "Brouillon généré (mode dégradé, sans IA) — relisez avant envoi."}
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

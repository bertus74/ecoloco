import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Commerc } from "@/lib/types";

export default async function ProspectPage({
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

  return (
    <div className="max-w-3xl">
      <Link href="/pipeline" className="mb-4 inline-block text-sm text-[var(--muted)]">
        ← Retour au pipeline
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-medium">{prospect.Nom}</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {prospect.Adresse}, {prospect.Ville}{prospect.pays ? `, ${prospect.pays}` : ""}
          </p>
        </div>
        <span className="rounded-md bg-[var(--danger-light)] px-3 py-1 text-sm font-medium text-[var(--danger)]">
          Score {prospect.Score_Energ ?? "—"} · {prospect.Niveau ?? "—"}
        </span>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="mb-3 text-base font-medium">Coordonnées</h2>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>{prospect.Tel || "Téléphone manquant"}</div>
          <div>{prospect.email || "Email manquant"}</div>
          <div>{prospect.URL || "Site manquant"}</div>
        </div>
      </div>

      <p className="mt-6 text-sm text-[var(--muted)]">
        Argumentaire, historique des démarches, génération d&apos;email et carte à
        implémenter — squelette de page en place.
      </p>
    </div>
  );
}

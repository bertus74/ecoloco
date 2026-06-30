import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Commerc } from "@/lib/types";
import { ValiderList } from "./valider-list";

type ChampValider = "nom" | "score" | "avis" | "scrape";

const CHAMPS_VALIDER: Record<ChampValider, (p: Commerc) => string | number> = {
  nom: (p) => p.Nom ?? "",
  score: (p) => p.Score_Energ ?? -1,
  avis: (p) => p.Nbre_Avis ?? -1,
  scrape: (p) => p.created_at ?? "",
};

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ sortV?: string; dirV?: string }>;
}) {
  const { sortV, dirV } = await searchParams;

  const champTriValider: ChampValider = (
    ["nom", "score", "avis", "scrape"] as ChampValider[]
  ).includes(sortV as ChampValider)
    ? (sortV as ChampValider)
    : "scrape";
  const sensTriValider = dirV === "asc" ? "asc" : "desc";

  const supabase = await createClient();

  const { data: aValider } = await supabase
    .from("commerc")
    .select("*")
    .eq("statut_prospect", "À valider")
    .order("created_at", { ascending: false })
    .returns<Commerc[]>();

  const aValiderBrut = aValider ?? [];
  const getValeurValider = CHAMPS_VALIDER[champTriValider];
  const enAttenteValidation = [...aValiderBrut].sort((a, b) => {
    const va = getValeurValider(a);
    const vb = getValeurValider(b);
    const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
    return sensTriValider === "asc" ? cmp : -cmp;
  });

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium">Pipeline d&apos;entrée</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Commerces scrappés en attente de validation. Une fois validés, ils rejoignent{" "}
            <Link href="/prospects" className="underline">
              vos prospects
            </Link>
            .
          </p>
        </div>
        <Link
          href="/scraping"
          className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--primary-dark)]"
        >
          Lancer un scraping
        </Link>
      </div>

      {enAttenteValidation.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-[var(--border)] px-4 py-12 text-center">
          <p className="text-sm text-[var(--muted)]">Aucun prospect pour le moment.</p>
          <Link
            href="/scraping"
            className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--primary-dark)]"
          >
            Lancer un scraping ?
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-2 flex justify-end gap-3 px-1 text-xs">
            {(
              [
                ["nom", "Nom"],
                ["score", "Score"],
                ["avis", "Avis"],
                ["scrape", "Scrappé le"],
              ] as [ChampValider, string][]
            ).map(([champ, label]) => {
              const prochainSens = champTriValider === champ && sensTriValider === "asc" ? "desc" : "asc";
              return (
                <Link
                  key={champ}
                  href={`/pipeline?sortV=${champ}&dirV=${prochainSens}`}
                  className="flex items-center gap-1 text-[var(--muted)] hover:text-[var(--foreground)]"
                >
                  Trier par {label}
                  {champTriValider === champ ? <span>{sensTriValider === "asc" ? "↑" : "↓"}</span> : null}
                </Link>
              );
            })}
          </div>
          <ValiderList items={enAttenteValidation} />
        </>
      )}
    </div>
  );
}

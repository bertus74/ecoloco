import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Commerc } from "@/lib/types";
import { ValiderList } from "./valider-list";

function scoreBadgeClass(niveau: string | null) {
  if (niveau === "Chaud") return "bg-[var(--danger-light)] text-[var(--danger)]";
  if (niveau === "Tiede") return "bg-[var(--primary-light)] text-[var(--primary-dark)]";
  return "bg-[var(--background)] text-[var(--muted)]";
}

function joursSans(date: string | null) {
  if (!date) return null;
  const diff = Date.now() - new Date(date).getTime();
  return Math.floor(diff / 86_400_000);
}

function fmtDate(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("fr-FR");
}

type Champ = "nom" | "score" | "statut" | "avis" | "scrape" | "activite";

const CHAMPS: Record<Champ, (p: Commerc) => string | number> = {
  nom: (p) => p.Nom ?? "",
  score: (p) => p.Score_Energ ?? -1,
  statut: (p) => p.statut_prospect ?? "",
  avis: (p) => p.Nbre_Avis ?? -1,
  scrape: (p) => p.created_at ?? "",
  activite: (p) => p.derniere_interaction ?? "",
};

type ChampValider = "nom" | "score" | "avis";

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string; sortV?: string; dirV?: string }>;
}) {
  const { sort, dir, sortV, dirV } = await searchParams;
  const champTri: Champ = (
    ["nom", "score", "statut", "avis", "scrape", "activite"] as Champ[]
  ).includes(sort as Champ)
    ? (sort as Champ)
    : "score";
  const sensTri = dir === "asc" ? "asc" : "desc";

  const champTriValider: ChampValider = (
    ["nom", "score", "avis"] as ChampValider[]
  ).includes(sortV as ChampValider)
    ? (sortV as ChampValider)
    : "score";
  const sensTriValider = dirV === "asc" ? "asc" : "desc";

  const supabase = await createClient();

  const today = new Date().toISOString().slice(0, 10);
  const dansSeptJours = new Date();
  dansSeptJours.setDate(dansSeptJours.getDate() + 7);

  const { data: prospects } = await supabase
    .from("commerc")
    .select("*")
    .not("statut_prospect", "in", '("Perdu","Blacklist","Diagnostic vendu","À valider")')
    .order("Score_Energ", { ascending: false, nullsFirst: false })
    .returns<Commerc[]>();

  const { data: aValider } = await supabase
    .from("commerc")
    .select("*")
    .eq("statut_prospect", "À valider")
    .order("created_at", { ascending: false })
    .returns<Commerc[]>();

  const { data: ventes } = await supabase
    .from("commerc")
    .select("montant_devis")
    .eq("statut_prospect", "Diagnostic vendu");

  const { count: rdvSemaine } = await supabase
    .from("rdv")
    .select("id", { count: "exact", head: true })
    .gte("date_rdv", new Date().toISOString())
    .lte("date_rdv", dansSeptJours.toISOString());

  const listeBrute = prospects ?? [];
  const getValeur = CHAMPS[champTri];
  const list = [...listeBrute].sort((a, b) => {
    const va = getValeur(a);
    const vb = getValeur(b);
    const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
    return sensTri === "asc" ? cmp : -cmp;
  });
  const aValiderBrut = aValider ?? [];
  const getValeurValider = CHAMPS[champTriValider];
  const enAttenteValidation = [...aValiderBrut].sort((a, b) => {
    const va = getValeurValider(a);
    const vb = getValeurValider(b);
    const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
    return sensTriValider === "asc" ? cmp : -cmp;
  });
  const aRelancer = list.filter(
    (p) => p.prochaine_relance_le && p.prochaine_relance_le <= today,
  ).length;
  const caPotentiel = list.reduce((sum, p) => sum + (p.ca_potentiel ?? 0), 0);
  const caGenere = (ventes ?? []).reduce((sum, v) => sum + (v.montant_devis ?? 0), 0);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium">Mon pipeline</h1>
        </div>
        <Link
          href="/scraping"
          className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--primary-dark)]"
        >
          Lancer un scraping
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="rounded-md bg-[var(--surface)] border border-[var(--border)] p-4">
          <p className="mb-1 text-xs text-[var(--muted)]">Prospects actifs</p>
          <p className="text-2xl font-medium">{list.length}</p>
        </div>
        <div className="rounded-md bg-[var(--surface)] border border-[var(--border)] p-4">
          <p className="mb-1 text-xs text-[var(--muted)]">En attente de validation</p>
          <p className="text-2xl font-medium text-[var(--warning)]">{enAttenteValidation.length}</p>
        </div>
        <div className="rounded-md bg-[var(--surface)] border border-[var(--border)] p-4">
          <p className="mb-1 text-xs text-[var(--muted)]">À relancer</p>
          <p className="text-2xl font-medium text-[var(--warning)]">{aRelancer}</p>
        </div>
        <div className="rounded-md bg-[var(--surface)] border border-[var(--border)] p-4">
          <p className="mb-1 text-xs text-[var(--muted)]">RDV à venir (7j)</p>
          <p className="text-2xl font-medium">{rdvSemaine ?? 0}</p>
        </div>
        <div className="rounded-md bg-[var(--surface)] border border-[var(--border)] p-4">
          <p className="mb-1 text-xs text-[var(--muted)]">CA généré</p>
          <p className="text-2xl font-medium text-[var(--success)]">
            {caGenere.toLocaleString("fr-FR")}&nbsp;€
          </p>
        </div>
        <div className="rounded-md bg-[var(--surface)] border border-[var(--border)] p-4">
          <p className="mb-1 text-xs text-[var(--muted)]">CA potentiel</p>
          <p className="text-2xl font-medium">
            {caPotentiel.toLocaleString("fr-FR")}&nbsp;€
          </p>
        </div>
      </div>

      {enAttenteValidation.length > 0 ? (
        <div className="mb-2 flex justify-end gap-3 px-1 text-xs">
          {(
            [
              ["nom", "Nom"],
              ["score", "Score"],
              ["avis", "Avis"],
            ] as [ChampValider, string][]
          ).map(([champ, label]) => {
            const prochainSens = champTriValider === champ && sensTriValider === "asc" ? "desc" : "asc";
            return (
              <Link
                key={champ}
                href={`/pipeline?sort=${champTri}&dir=${sensTri}&sortV=${champ}&dirV=${prochainSens}`}
                className="flex items-center gap-1 text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                Trier par {label}
                {champTriValider === champ ? <span>{sensTriValider === "asc" ? "↑" : "↓"}</span> : null}
              </Link>
            );
          })}
        </div>
      ) : null}
      {enAttenteValidation.length > 0 ? <ValiderList items={enAttenteValidation} /> : null}

      <div className="overflow-hidden rounded-lg border border-[var(--border)]">
        <div className="grid grid-cols-[1.4fr_0.7fr_0.9fr_0.6fr_0.9fr_1fr] gap-0 bg-[var(--background)] px-4 py-2.5 text-xs text-[var(--muted)]">
          {(
            [
              ["nom", "Prospect"],
              ["score", "Score"],
              ["statut", "Statut"],
              ["avis", "Avis"],
              ["scrape", "Scrappé le"],
              ["activite", "Dernière activité"],
            ] as [Champ, string][]
          ).map(([champ, label]) => {
            const prochainSens = champTri === champ && sensTri === "asc" ? "desc" : "asc";
            return (
              <Link
                key={champ}
                href={`/pipeline?sort=${champ}&dir=${prochainSens}&sortV=${champTriValider}&dirV=${sensTriValider}`}
                className="flex items-center gap-1 hover:text-[var(--foreground)]"
              >
                {label}
                {champTri === champ ? <span>{sensTri === "asc" ? "↑" : "↓"}</span> : null}
              </Link>
            );
          })}
        </div>

        {list.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-[var(--muted)]">
            Aucun prospect actif. Lancez une prospection pour commencer.
          </div>
        ) : (
          list.map((p) => {
            const jours = joursSans(p.derniere_interaction);
            return (
              <Link
                key={p.id}
                href={`/prospect/${p.id}`}
                className="grid grid-cols-[1.4fr_0.7fr_0.9fr_0.6fr_0.9fr_1fr] items-center gap-0 border-t border-[var(--border)] px-4 py-3 hover:bg-[var(--background)]"
              >
                <div>
                  <p className="text-sm font-medium">{p.Nom}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {p.Ville}{p.pays ? `, ${p.pays}` : ""}
                  </p>
                </div>
                <div>
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs ${scoreBadgeClass(p.Niveau)}`}
                  >
                    {p.Score_Energ ?? "—"}
                  </span>
                </div>
                <div className="text-sm">{p.statut_prospect}</div>
                <div className="text-sm">{p.Nbre_Avis ?? "—"}</div>
                <div className="text-xs text-[var(--muted)]">{fmtDate(p.created_at)}</div>
                <div className="text-xs text-[var(--muted)]">
                  {jours === null
                    ? "Jamais contacté"
                    : jours === 0
                      ? "Aujourd'hui"
                      : `Il y a ${jours}j`}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

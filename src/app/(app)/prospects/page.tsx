import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Commerc, Interaction } from "@/lib/types";

function scoreBadgeClass(niveau: string | null) {
  if (niveau === "Chaud") return "bg-[var(--danger-light)] text-[var(--danger)]";
  if (niveau === "Tiede") return "bg-[var(--primary-light)] text-[var(--primary-dark)]";
  return "bg-[var(--background)] text-[var(--muted)]";
}

function fmtDate(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("fr-FR");
}

type Champ = "nom" | "score" | "statut" | "scrape" | "entree" | "action";

const CHAMPS: Record<Champ, (p: Commerc, derniereAction: { date: string | null }) => string | number> = {
  nom: (p) => p.Nom ?? "",
  score: (p) => p.Score_Energ ?? -1,
  statut: (p) => p.statut_prospect ?? "",
  scrape: (p) => p.created_at ?? "",
  entree: (p) => p.valide_le ?? "",
  action: (_p, derniereAction) => derniereAction.date ?? "",
};

export default async function ProspectsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string }>;
}) {
  const { sort, dir } = await searchParams;
  const champTri: Champ = (
    ["nom", "score", "statut", "scrape", "entree", "action"] as Champ[]
  ).includes(sort as Champ)
    ? (sort as Champ)
    : "entree";
  const sensTri = dir === "asc" ? "asc" : "desc";

  const supabase = await createClient();

  const today = new Date().toISOString().slice(0, 10);
  const dansSeptJours = new Date();
  dansSeptJours.setDate(dansSeptJours.getDate() + 7);

  const { data: prospects } = await supabase
    .from("commerc")
    .select("*")
    .not("valide_le", "is", null)
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

  const liste = prospects ?? [];
  const ids = liste.map((p) => p.id);

  const actifs = liste.filter(
    (p) => !["Perdu", "Blacklist", "Diagnostic vendu"].includes(p.statut_prospect ?? ""),
  );
  const aRelancer = actifs.filter(
    (p) => p.prochaine_relance_le && p.prochaine_relance_le <= today,
  ).length;
  const caPotentiel = actifs.reduce((sum, p) => sum + (p.devis_potentiel ?? 0), 0);
  const caGenere = (ventes ?? []).reduce((sum, v) => sum + (v.montant_devis ?? 0), 0);

  const { data: interactions } = ids.length
    ? await supabase
        .from("interactions")
        .select("*")
        .in("commerc_id", ids)
        .order("created_at", { ascending: false })
        .returns<Interaction[]>()
    : { data: [] as Interaction[] };

  const derniereActionParId = new Map<number, Interaction>();
  for (const it of interactions ?? []) {
    if (!derniereActionParId.has(it.commerc_id)) {
      derniereActionParId.set(it.commerc_id, it);
    }
  }

  const getValeur = CHAMPS[champTri];
  const listeTriee = [...liste].sort((a, b) => {
    const actionA = { date: derniereActionParId.get(a.id)?.date_interaction ?? derniereActionParId.get(a.id)?.created_at ?? null };
    const actionB = { date: derniereActionParId.get(b.id)?.date_interaction ?? derniereActionParId.get(b.id)?.created_at ?? null };
    const va = getValeur(a, actionA);
    const vb = getValeur(b, actionB);
    const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
    return sensTri === "asc" ? cmp : -cmp;
  });

  const colonnes: [Champ, string][] = [
    ["nom", "Prospect"],
    ["score", "Score"],
    ["statut", "Statut"],
    ["scrape", "Date de scraping"],
    ["entree", "Entrée en prospect"],
    ["action", "Dernière action"],
  ];

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium">Prospects</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Tous les scrappés validés comme prospects, tous statuts confondus.
          </p>
        </div>
        <span className="text-sm text-[var(--muted)]">{listeTriee.length} prospect{listeTriee.length === 1 ? "" : "s"}</span>
      </div>

      <div className="mb-6 grid grid-cols-4 gap-3">
        <div className="rounded-md bg-[var(--surface)] border border-[var(--border)] p-4">
          <p className="mb-1 text-xs text-[var(--muted)]">Prospects actifs</p>
          <p className="text-2xl font-medium">{actifs.length}</p>
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

      <div className="overflow-hidden rounded-lg border border-[var(--border)]">
        <div className="grid grid-cols-[1.4fr_0.7fr_0.9fr_1fr_1fr_1.2fr] gap-0 bg-[var(--background)] px-4 py-2.5 text-xs text-[var(--muted)]">
          {colonnes.map(([champ, label]) => {
            const prochainSens = champTri === champ && sensTri === "asc" ? "desc" : "asc";
            return (
              <Link
                key={champ}
                href={`/prospects?sort=${champ}&dir=${prochainSens}`}
                className="flex items-center gap-1 hover:text-[var(--foreground)]"
              >
                {label}
                {champTri === champ ? <span>{sensTri === "asc" ? "↑" : "↓"}</span> : null}
              </Link>
            );
          })}
        </div>

        {listeTriee.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-[var(--muted)]">
            Aucun prospect validé pour le moment.
          </div>
        ) : (
          listeTriee.map((p) => {
            const action = derniereActionParId.get(p.id);
            return (
              <Link
                key={p.id}
                href={`/prospect/${p.id}`}
                className="grid grid-cols-[1.4fr_0.7fr_0.9fr_1fr_1fr_1.2fr] items-center gap-0 border-t border-[var(--border)] px-4 py-3 hover:bg-[var(--background)]"
              >
                <div>
                  <p className="text-sm font-medium">{p.Nom}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {p.Ville}{p.pays ? `, ${p.pays}` : ""}
                  </p>
                </div>
                <div>
                  <span className={`rounded-md px-2 py-0.5 text-xs ${scoreBadgeClass(p.Niveau)}`}>
                    {p.Score_Energ ?? "—"}
                  </span>
                </div>
                <div className="text-sm">{p.statut_prospect}</div>
                <div className="text-xs text-[var(--muted)]">{fmtDate(p.created_at)}</div>
                <div className="text-xs text-[var(--muted)]">{fmtDate(p.valide_le)}</div>
                <div className="text-xs text-[var(--muted)]">
                  {action ? `${action.type_interaction} — ${fmtDate(action.date_interaction ?? action.created_at)}` : "Aucune"}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Commerc } from "@/lib/types";

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

export default async function PipelinePage() {
  const supabase = await createClient();

  const today = new Date().toISOString().slice(0, 10);

  const { data: prospects } = await supabase
    .from("commerc")
    .select("*")
    .not("statut_prospect", "in", '("Perdu","Blacklist","Diagnostic vendu")')
    .order("Score_Energ", { ascending: false, nullsFirst: false })
    .returns<Commerc[]>();

  const list = prospects ?? [];
  const aRelancer = list.filter(
    (p) => p.prochaine_relance_le && p.prochaine_relance_le <= today,
  ).length;
  const caPotentiel = list.reduce((sum, p) => sum + (p.ca_potentiel ?? 0), 0);

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

      <div className="mb-6 grid grid-cols-4 gap-3">
        <div className="rounded-md bg-[var(--surface)] border border-[var(--border)] p-4">
          <p className="mb-1 text-xs text-[var(--muted)]">Prospects actifs</p>
          <p className="text-2xl font-medium">{list.length}</p>
        </div>
        <div className="rounded-md bg-[var(--surface)] border border-[var(--border)] p-4">
          <p className="mb-1 text-xs text-[var(--muted)]">À relancer</p>
          <p className="text-2xl font-medium text-[var(--warning)]">{aRelancer}</p>
        </div>
        <div className="rounded-md bg-[var(--surface)] border border-[var(--border)] p-4">
          <p className="mb-1 text-xs text-[var(--muted)]">RDV cette semaine</p>
          <p className="text-2xl font-medium">—</p>
        </div>
        <div className="rounded-md bg-[var(--surface)] border border-[var(--border)] p-4">
          <p className="mb-1 text-xs text-[var(--muted)]">CA potentiel</p>
          <p className="text-2xl font-medium">
            {caPotentiel.toLocaleString("fr-FR")}&nbsp;€
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-[var(--border)]">
        <div className="grid grid-cols-[1.6fr_0.8fr_1fr_0.8fr_1fr] gap-0 bg-[var(--background)] px-4 py-2.5 text-xs text-[var(--muted)]">
          <div>Prospect</div>
          <div>Score</div>
          <div>Statut</div>
          <div>Avis</div>
          <div>Dernière activité</div>
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
                className="grid grid-cols-[1.6fr_0.8fr_1fr_0.8fr_1fr] items-center gap-0 border-t border-[var(--border)] px-4 py-3 hover:bg-[var(--background)]"
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

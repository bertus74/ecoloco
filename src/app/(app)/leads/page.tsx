import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Commerc, Pack } from "@/lib/types";
import { PackPills } from "@/components/pack-pills";
import { niveauAffiche, packsDuProspect } from "@/lib/packs";
import { NiveauBadge, StatutBadge } from "@/components/niveau-badge";
import { SECTEURS, euros, factureEstimee, secteurDe } from "@/lib/secteurs";

const NB_LEADS = 20;
const STATUTS_ACTIFS = ["Nouveau", "Contacté", "Intéressé", "RDV planifié"];

export default async function LeadsDuJourPage() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  // Prospects actifs (scope RLS : les siens pour un commercial, tous pour la DG),
  // hors relances reportées à plus tard.
  const { data } = await supabase
    .from("commerc")
    .select("*")
    .in("statut_prospect", STATUTS_ACTIFS)
    .or(`prochaine_relance_le.is.null,prochaine_relance_le.lte.${today}`)
    .order("Score_Energ", { ascending: false, nullsFirst: false })
    .limit(NB_LEADS)
    .returns<Commerc[]>();

  const { data: packs } = await supabase.from("packs").select("*").order("ordre").returns<Pack[]>();

  const leads = data ?? [];
  const compte = (n: string) => leads.filter((p) => niveauAffiche(p) === n).length;
  const factureTotale = leads.reduce((s, p) => s + factureEstimee(p), 0);

  const stats = [
    { label: "Leads chauds", value: compte("Chaud") },
    { label: "Leads tièdes", value: compte("Tiede") },
    { label: "Leads froids", value: compte("Froid") },
    { label: "Factures cumulées", value: euros(factureTotale) },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-5">
        <h1 className="text-xl font-medium">Leads du jour</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Les {NB_LEADS} prospects actifs les mieux scorés, à traiter en priorité.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="mb-1 text-xs text-[var(--muted)]">{s.label}</p>
            <p className="text-2xl font-medium tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        <div className="grid grid-cols-[32px_1.5fr_1.1fr_56px_84px_110px_130px_110px] gap-3 border-b border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-xs text-[var(--muted)]">
          <span>#</span>
          <span>Prospect</span>
          <span>Secteur</span>
          <span className="text-right">Score</span>
          <span>Température</span>
          <span className="text-right">Facture estimée</span>
          <span>Packs</span>
          <span>Statut</span>
        </div>

        {leads.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-[var(--muted)]">Aucun lead actif pour le moment.</p>
        ) : (
          leads.map((p, i) => (
            <Link
              key={p.id}
              href={`/prospect/${p.id}`}
              className="grid grid-cols-[32px_1.5fr_1.1fr_56px_84px_110px_130px_110px] items-center gap-3 border-t border-[var(--border)] px-4 py-3 first:border-0 hover:bg-[var(--background)]"
            >
              <span className="text-xs tabular-nums text-[var(--muted)]">{i + 1}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{p.Nom}</p>
                <p className="truncate text-xs text-[var(--muted)]">
                  {p.Ville}
                  {p.pays ? `, ${p.pays}` : ""}
                </p>
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm">{SECTEURS[secteurDe(p.Cat_scraping)].label}</p>
                <p className="truncate text-xs text-[var(--muted)]">{p.Cat_scraping}</p>
              </div>
              <span className="text-right text-sm font-medium tabular-nums">{p.Score_Energ ?? "—"}</span>
              <span>
                <NiveauBadge niveau={niveauAffiche(p)} />
              </span>
              <span className="text-right text-sm tabular-nums">
                {euros(factureEstimee(p))}
                <span className="text-xs text-[var(--muted)]">/an</span>
              </span>
              <PackPills packs={packsDuProspect(p, packs ?? []).packs} />
              <span>
                <StatutBadge statut={p.statut_prospect} />
              </span>
            </Link>
          ))
        )}
      </div>
      <p className="mt-3 text-xs text-[var(--muted)]">
        Facture estimée = surface × ratio de consommation du secteur × 0,19 €/kWh (voir docs/ca-potentiel-formule.md).
      </p>
    </div>
  );
}

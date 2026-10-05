import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Commerc, Rdv } from "@/lib/types";
import { NiveauBadge, StatutBadge } from "@/components/niveau-badge";
import { niveauAffiche } from "@/lib/packs";

const STATUTS_ACTIFS = ["Nouveau", "Contacté", "Intéressé", "RDV planifié"];

// Date du jour à Paris (le serveur Vercel tourne en UTC).
function jourParis(d: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(d);
}

function joursDepuis(date: string | null, maintenant: Date) {
  if (!date) return null;
  return Math.floor((maintenant.getTime() - new Date(date).getTime()) / 86_400_000);
}

type Ligne = Pick<
  Commerc,
  | "id" | "Nom" | "Ville" | "Tel" | "Score_Energ" | "Niveau" | "niveau_qualifie" | "statut_prospect"
  | "prochaine_relance_le" | "prochaine_etape" | "derniere_interaction"
>;

export default async function AujourdhuiPage() {
  const supabase = await createClient();
  const maintenant = new Date();
  const t = maintenant.getTime();
  const aujourdhui = jourParis(maintenant);

  const colonnes =
    "id, Nom, Ville, Tel, Score_Energ, Niveau, niveau_qualifie, statut_prospect, prochaine_relance_le, prochaine_etape, derniere_interaction";

  // 1. Prospects dont la prochaine action est prévue aujourd'hui (ou en retard).
  const { data: aContacter } = await supabase
    .from("commerc")
    .select(colonnes)
    .in("statut_prospect", STATUTS_ACTIFS)
    .lte("prochaine_relance_le", aujourdhui)
    .order("prochaine_relance_le")
    .returns<Ligne[]>();

  // 2. Relances : prospects contactés, sans nouvelle démarche depuis 3 jours ou plus, sans action planifiée plus tard.
  const ilYa3Jours = new Date(t - 3 * 86_400_000).toISOString();
  const { data: sansReponse } = await supabase
    .from("commerc")
    .select(colonnes)
    .in("statut_prospect", ["Contacté", "Intéressé"])
    .lte("derniere_interaction", ilYa3Jours)
    .or(`prochaine_relance_le.is.null,prochaine_relance_le.lte.${aujourdhui}`)
    .order("derniere_interaction")
    .returns<Ligne[]>();
  const dejaListes = new Set((aContacter ?? []).map((p) => p.id));
  const relances = (sansReponse ?? []).filter((p) => !dejaListes.has(p.id));
  const relancesJ7 = relances.filter((p) => (joursDepuis(p.derniere_interaction, maintenant) ?? 0) >= 7);
  const relancesJ3 = relances.filter((p) => (joursDepuis(p.derniere_interaction, maintenant) ?? 0) < 7);

  // 3. RDV du jour (fenêtre large côté requête, filtrage exact sur le jour de Paris).
  const { data: rdvProches } = await supabase
    .from("rdv")
    .select("*")
    .gte("date_rdv", new Date(t - 86_400_000).toISOString())
    .lte("date_rdv", new Date(t + 2 * 86_400_000).toISOString())
    .neq("statut", "Annulé")
    .order("date_rdv")
    .returns<Rdv[]>();
  const rdvDuJour = (rdvProches ?? []).filter((r) => jourParis(new Date(r.date_rdv)) === aujourdhui);

  const idsRdv = rdvDuJour.map((r) => r.commerc_id);
  const { data: prospectsRdv } = idsRdv.length
    ? await supabase.from("commerc").select("id, Nom, Ville, Tel").in("id", idsRdv)
    : { data: [] as { id: number; Nom: string | null; Ville: string | null; Tel: string | null }[] };
  const prospectParId = new Map((prospectsRdv ?? []).map((p) => [p.id, p]));

  const dateLongue = maintenant.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Paris",
  });

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5">
        <h1 className="text-xl font-medium">Aujourd&apos;hui</h1>
        <p className="mt-1 text-sm capitalize text-[var(--muted)]">{dateLongue}</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "À contacter", value: aContacter?.length ?? 0 },
          { label: "Relances J+3", value: relancesJ3.length },
          { label: "Relances J+7", value: relancesJ7.length },
          { label: "RDV du jour", value: rdvDuJour.length },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="mb-1 text-xs text-[var(--muted)]">{s.label}</p>
            <p className="text-2xl font-medium tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      <Section titre="RDV du jour" vide="Aucun rendez-vous aujourd'hui.">
        {rdvDuJour.map((r) => {
          const p = prospectParId.get(r.commerc_id);
          return (
            <Link
              key={r.id}
              href={`/prospect/${r.commerc_id}`}
              className="flex items-center gap-4 border-t border-[var(--border)] px-4 py-3 first:border-0 hover:bg-[var(--background)]"
            >
              <span className="w-14 text-sm font-medium tabular-nums">
                {new Date(r.date_rdv).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{p?.Nom ?? `Prospect #${r.commerc_id}`}</p>
                <p className="truncate text-xs text-[var(--muted)]">{r.lieu ?? p?.Ville}</p>
              </div>
              <span className="text-xs text-[var(--muted)]">{r.statut}</span>
            </Link>
          );
        })}
      </Section>

      <Section
        titre="À contacter aujourd'hui"
        sousTitre="Prochaine étape prévue aujourd'hui ou en retard"
        vide={
          <>
            Rien de planifié. Piochez dans les{" "}
            <Link href="/leads" className="underline">
              leads du jour
            </Link>
            .
          </>
        }
      >
        {(aContacter ?? []).map((p) => (
          <LigneProspect
            key={p.id}
            p={p}
            detail={`${p.prochaine_etape ?? "Relance"}${
              p.prochaine_relance_le && p.prochaine_relance_le < aujourdhui
                ? ` — en retard depuis le ${new Date(p.prochaine_relance_le).toLocaleDateString("fr-FR")}`
                : ""
            }`}
          />
        ))}
      </Section>

      <Section titre="Relances J+7" sousTitre="Sans nouvelle démarche depuis 7 jours ou plus" vide="Aucune relance J+7 en attente.">
        {relancesJ7.map((p) => (
          <LigneProspect key={p.id} p={p} detail={`Dernière démarche il y a ${joursDepuis(p.derniere_interaction, maintenant)} j`} />
        ))}
      </Section>

      <Section titre="Relances J+3" sousTitre="Sans nouvelle démarche depuis 3 à 6 jours" vide="Aucune relance J+3 en attente.">
        {relancesJ3.map((p) => (
          <LigneProspect key={p.id} p={p} detail={`Dernière démarche il y a ${joursDepuis(p.derniere_interaction, maintenant)} j`} />
        ))}
      </Section>
    </div>
  );
}

function Section({
  titre,
  sousTitre,
  vide,
  children,
}: {
  titre: string;
  sousTitre?: string;
  vide: React.ReactNode;
  children: React.ReactNode[];
}) {
  return (
    <section className="mb-5">
      <div className="mb-2 flex items-baseline gap-2">
        <h2 className="text-base font-medium">{titre}</h2>
        {sousTitre ? <span className="text-xs text-[var(--muted)]">{sousTitre}</span> : null}
      </div>
      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        {children.length === 0 ? <p className="px-4 py-6 text-center text-sm text-[var(--muted)]">{vide}</p> : children}
      </div>
    </section>
  );
}

function LigneProspect({ p, detail }: { p: Ligne; detail: string }) {
  return (
    <Link
      href={`/prospect/${p.id}`}
      className="grid grid-cols-[1.4fr_1.6fr_84px_110px_110px] items-center gap-3 border-t border-[var(--border)] px-4 py-3 first:border-0 hover:bg-[var(--background)]"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{p.Nom}</p>
        <p className="truncate text-xs text-[var(--muted)]">{p.Ville}</p>
      </div>
      <span className="truncate text-sm text-[var(--muted)]">{detail}</span>
      <NiveauBadge niveau={niveauAffiche(p)} />
      <StatutBadge statut={p.statut_prospect} />
      <span className="text-right text-xs tabular-nums text-[var(--muted)]">{p.Tel ?? "—"}</span>
    </Link>
  );
}

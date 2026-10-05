import { BarresGroupees, Camembert, Courbes } from "./charts";
import { COULEURS_COLONNES } from "../kanban/colonnes";
import { COULEURS_PACKS, SERIES_COULEURS } from "./couleurs";

export interface CockpitDonnees {
  dateLongue: string;
  nbEnCours: number;
  nbProspects: number;
  nbVentes: number;
  caPotentielTotal: number;
  caSigneTotal: number;
  ventesSansMontant: number;
  parCommercial: {
    id: number;
    nom: string;
    initiales: string;
    leadsActifs: number;
    caPotentiel: number;
    devisVendus: number;
    caSigne: number;
  }[];
  kpiCommerciaux: { nom: string; contactes: number; interactions: number; rdv: number; vendus: number }[];
  libellesSemaines: string[];
  semaines: { valides: number[]; demarches: number[]; rdv: number[] };
  secteurs: [string, { total: number; chauds: number }][];
  lignesPacks: { id: string; label: string; ca: number }[];
  caTotalPacks: number;
  statutLabels: string[];
  statutCounts: number[];
}

/** Affichage du cockpit DG (présentation seule : les données viennent de page.tsx). */
export function CockpitVue({
  dateLongue,
  nbEnCours,
  nbProspects,
  nbVentes,
  caPotentielTotal,
  caSigneTotal,
  ventesSansMontant,
  parCommercial,
  kpiCommerciaux,
  libellesSemaines,
  semaines,
  secteurs,
  lignesPacks,
  caTotalPacks,
  statutLabels,
  statutCounts,
}: CockpitDonnees) {
  const maxCaSigne = Math.max(1, ...parCommercial.map((c) => c.caSigne));

  return (
    <div className="mx-auto max-w-7xl">
      {/* Bandeau d'accueil */}
      <div
        className="mb-6 overflow-hidden rounded-2xl p-6 text-white shadow-sm"
        style={{ background: "linear-gradient(135deg, #125535 0%, #1A7A4A 55%, #0F766E 100%)" }}
      >
        <p className="text-sm capitalize text-white/85">{dateLongue}</p>
        <h1 className="mt-1 text-2xl font-semibold">Cockpit direction 🌿</h1>
        <p className="mt-2 text-sm text-white/90">
          {nbVentes > 0
            ? `🎉 ${nbVentes} diagnostic${nbVentes > 1 ? "s" : ""} vendu${nbVentes > 1 ? "s" : ""}, ${caSigneTotal.toLocaleString("fr-FR")} € signés. Bravo à l'équipe !`
            : `${nbEnCours} leads en cours : le prochain diagnostic vendu s'affichera ici.`}
        </p>
      </div>

      {/* Indicateurs */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Kpi emoji="🎯" label="Leads en cours" valeur={String(nbEnCours)} ton="bleu" />
        <Kpi emoji="💡" label="CA potentiel" valeur={`${caPotentielTotal.toLocaleString("fr-FR")} €`} ton="violet" />
        <Kpi emoji="🏆" label="Devis vendus" valeur={String(nbVentes)} ton="orange" />
        <Kpi
          emoji="🎉"
          label="CA signé"
          valeur={`${caSigneTotal.toLocaleString("fr-FR")} €`}
          ton="vert"
          note={
            ventesSansMontant > 0
              ? `${ventesSansMontant} vente${ventesSansMontant > 1 ? "s" : ""} sans montant`
              : undefined
          }
        />
        <Kpi emoji="📇" label="Total prospects" valeur={String(nbProspects)} ton="rose" />
      </div>

      {/* Équipe */}
      <Section emoji="👥" titre="Performance par commercial" accent="#1A7A4A">
        <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr_1.4fr] gap-2 border-b border-[var(--border)] pb-2 text-xs text-[#4B5563]">
          <div>Commercial</div>
          <div>Leads actifs</div>
          <div>CA potentiel</div>
          <div>Devis vendus</div>
          <div>CA signé</div>
        </div>
        {parCommercial.map(({ id, nom, initiales, leadsActifs, caPotentiel, devisVendus, caSigne }, i) => {
          return (
            <div
              key={id}
              className="grid grid-cols-[1.6fr_1fr_1fr_1fr_1.4fr] items-center gap-2 border-b border-[var(--border)] py-3 text-sm last:border-0"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                  style={{ background: AVATARS[i % AVATARS.length] }}
                >
                  {initiales}
                </span>
                <span className="font-medium">{nom}</span>
              </div>
              <div>
                <span className="rounded-full bg-[#E8EFF9] px-2.5 py-0.5 text-xs font-medium tabular-nums text-[#1F4378]">
                  {leadsActifs}
                </span>
              </div>
              <div className="font-medium tabular-nums text-[#512B8A]">{caPotentiel.toLocaleString("fr-FR")} €</div>
              <div>
                <span className="rounded-full bg-[#FDEFE4] px-2.5 py-0.5 text-xs font-medium tabular-nums text-[#9A4A14]">
                  {devisVendus} 🏆
                </span>
              </div>
              <div>
                <p className="font-semibold tabular-nums text-[#125535]">{caSigne.toLocaleString("fr-FR")} €</p>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#E6F4EC]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.round((caSigne / maxCaSigne) * 100)}%`, background: "#1A7A4A" }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </Section>

      <div className="mt-5">
        <Section emoji="📣" titre="Activité par commercial" accent="#2E5FA6" sous="Prospects contactés, démarches, RDV et diagnostics vendus">
          <BarresGroupees
            ariaLabel="KPIs par commercial : contactés, démarches, RDV, vendus"
            labels={kpiCommerciaux.map((k) => k.nom)}
            series={[
              { label: "Contactés", data: kpiCommerciaux.map((k) => k.contactes), color: SERIES_COULEURS[0] },
              { label: "Démarches", data: kpiCommerciaux.map((k) => k.interactions), color: SERIES_COULEURS[1] },
              { label: "RDV", data: kpiCommerciaux.map((k) => k.rdv), color: SERIES_COULEURS[2] },
              { label: "Vendus", data: kpiCommerciaux.map((k) => k.vendus), color: SERIES_COULEURS[3] },
            ]}
          />
        </Section>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section emoji="📈" titre="Pipeline par semaine" accent="#7040B0" sous={`${libellesSemaines.length} dernières semaines, semaine du lundi`}>
          <Courbes
            ariaLabel="Évolution hebdomadaire des prospects validés, démarches et RDV"
            labels={libellesSemaines}
            series={[
              { label: "Prospects validés", data: semaines.valides, color: SERIES_COULEURS[0] },
              { label: "Démarches", data: semaines.demarches, color: SERIES_COULEURS[1] },
              { label: "RDV pris", data: semaines.rdv, color: SERIES_COULEURS[2] },
            ]}
          />
        </Section>
        <Section emoji="🏪" titre="Répartition par secteur" accent="#E07B39" sous="Tous prospects validés, dont leads chauds">
          <BarresGroupees
            horizontal
            ariaLabel="Nombre de prospects et de leads chauds par secteur"
            labels={secteurs.map(([label]) => label)}
            series={[
              { label: "Prospects", data: secteurs.map(([, v]) => v.total), color: SERIES_COULEURS[0] },
              { label: "Leads chauds", data: secteurs.map(([, v]) => v.chauds), color: SERIES_COULEURS[3] },
            ]}
          />
        </Section>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section emoji="💰" titre="CA par pack" accent="#B8336A" sous="Diagnostics vendus, montant réparti entre les packs retenus à la qualification">
          {lignesPacks.length === 0 ? (
            <div className="flex h-60 flex-col items-center justify-center gap-2 rounded-xl bg-[#FBE9F1] text-center text-sm text-[#4B5563]">
              <span className="text-3xl">🌱</span>
              Aucun diagnostic vendu avec un montant renseigné pour l&apos;instant.
            </div>
          ) : (
            <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[1fr_1.1fr]">
              <Camembert
                ariaLabel="Répartition du CA signé par pack"
                labels={lignesPacks.map((l) => l.label)}
                data={lignesPacks.map((l) => l.ca)}
                couleurs={lignesPacks.map((l) => COULEURS_PACKS[l.id] ?? "#9CA3AF")}
              />
              <table className="w-full text-sm">
                <tbody>
                  {lignesPacks.map((l) => (
                    <tr key={l.id} className="border-b border-[var(--border)] last:border-0">
                      <td className="py-1.5">
                        <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: COULEURS_PACKS[l.id] ?? "#9CA3AF" }} />
                        {l.label}
                      </td>
                      <td className="py-1.5 text-right tabular-nums">{l.ca.toLocaleString("fr-FR")}&nbsp;€</td>
                      <td className="w-12 py-1.5 text-right tabular-nums text-[#4B5563]">
                        {Math.round((l.ca / caTotalPacks) * 100)}&nbsp;%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section emoji="🚦" titre="Pipeline par statut" accent="#1A7A4A">
          <BarresGroupees
            horizontal
            hauteur={220}
            ariaLabel="Répartition des prospects par statut du pipeline"
            labels={statutLabels}
            series={[{ label: "Prospects", data: statutCounts, color: statutLabels.map((l) => COULEURS_COLONNES[l] ?? "#9CA3AF") }]}
          />
        </Section>
      </div>
    </div>
  );
}

// Avatars des commerciaux : couleurs de la palette des graphiques, texte blanc (contraste ≥ 5).
const AVATARS = ["#2E5FA6", "#7040B0", "#B8336A", "#1A7A4A", "#0F766E"];

const TONS = {
  bleu: { fond: "#E8EFF9", accent: "#2E5FA6", texte: "#1F4378" },
  violet: { fond: "#F1EAFA", accent: "#7040B0", texte: "#512B8A" },
  orange: { fond: "#FDEFE4", accent: "#E07B39", texte: "#9A4A14" },
  rose: { fond: "#FBE9F1", accent: "#B8336A", texte: "#8C2655" },
  vert: { fond: "#E6F4EC", accent: "#1A7A4A", texte: "#125535" },
} as const;

function Kpi({
  emoji,
  label,
  valeur,
  ton,
  note,
}: {
  emoji: string;
  label: string;
  valeur: string;
  ton: keyof typeof TONS;
  note?: string;
}) {
  const t = TONS[ton];
  const mis_en_avant = ton === "vert";
  return (
    <div
      className="rounded-2xl p-4 shadow-sm"
      style={
        mis_en_avant
          ? { background: "linear-gradient(135deg, #1A7A4A 0%, #0F766E 100%)", color: "#fff" }
          : { background: t.fond, borderTop: `4px solid ${t.accent}`, color: t.texte }
      }
    >
      <div className="flex items-center gap-2">
        <span className="text-xl" aria-hidden>
          {emoji}
        </span>
        <p className={`text-xs font-medium ${mis_en_avant ? "text-white/90" : "text-[#4B5563]"}`}>{label}</p>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{valeur}</p>
      {note ? <p className={`mt-1 text-xs ${mis_en_avant ? "text-white" : "text-[#4B5563]"}`}>⚠ {note}</p> : null}
    </div>
  );
}

function Section({
  emoji,
  titre,
  sous,
  accent,
  children,
}: {
  emoji: string;
  titre: string;
  sous?: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"
      style={{ borderTop: `4px solid ${accent}` }}
    >
      <h2 className="text-base font-semibold">
        <span aria-hidden className="mr-1.5">
          {emoji}
        </span>
        {titre}
      </h2>
      {sous ? <p className="mb-3 text-xs text-[#4B5563]">{sous}</p> : <div className="mb-3" />}
      {children}
    </section>
  );
}

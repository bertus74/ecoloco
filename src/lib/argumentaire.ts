import type { AideCee, Commerc, Pack } from "@/lib/types";
import { SECTEURS, factureEstimee, secteurDe, type SecteurId } from "@/lib/secteurs";

// Packs mis en avant par défaut (avant qualification), du plus au moins pertinent pour le secteur.
const PRIORITE_PACKS: Record<SecteurId, string[]> = {
  boulangerie: ["chaleur_productive", "economies_immediates"],
  restaurant: ["chaleur_productive", "maitrise_froid"],
  boucherie: ["maitrise_froid", "economies_immediates"],
  alimentaire: ["maitrise_froid", "economies_immediates"],
  pressing: ["eau_maitrisee", "economies_immediates"],
  coiffeur: ["eau_maitrisee", "economies_immediates"],
  boutique: ["economies_immediates", "pilotage_intelligent"],
  autre: ["economies_immediates", "pilotage_intelligent"],
};

export interface Argumentaire {
  secteur: SecteurId;
  factureAnnuelle: number;
  economiesAnnuelles: number;
  packs: Pack[];
  investissement: number;
  /** Primes CEE (subventions) mobilisables pour ces packs, plafonds cumulés. */
  primesCee: number;
  /** Autres aides et prêts mobilisables (Bpifrance, ADEME, aides régionales) — non déduits. */
  autresAides: AideCee[];
  resteACharge: number;
  roiMois: number | null;
  /** Les aides françaises (CEE, Bpifrance…) ne s'appliquent pas hors de France. */
  aidesApplicables: boolean;
}

const arrondiCentaine = (n: number) => Math.round(n / 100) * 100;

export function calculerArgumentaire(
  p: Pick<Commerc, "Cat_scraping" | "surface" | "ca_potentiel" | "Score_Energ" | "packs_pertinents" | "pays" | "departement">,
  packs: Pack[],
  aides: AideCee[],
): Argumentaire {
  const secteur = secteurDe(p.Cat_scraping);
  const factureAnnuelle = factureEstimee(p);
  // ca_potentiel = économies annuelles estimées (docs/ca-potentiel-formule.md) ; repli : 15 % → 35 % selon le score.
  const economiesAnnuelles =
    p.ca_potentiel ?? Math.round(factureAnnuelle * (0.15 + (0.2 * (p.Score_Energ ?? 50)) / 100));

  const choisis = p.packs_pertinents?.length
    ? packs.filter((k) => p.packs_pertinents.includes(k.id))
    : PRIORITE_PACKS[secteur].map((id) => packs.find((k) => k.id === id)).filter((k): k is Pack => !!k);

  const aidesApplicables = (p.pays ?? "France") === "France";
  const departement = (p.departement ?? "").padStart(2, "0");
  const idsAides = new Set(choisis.flatMap((k) => k.aides ?? []));
  const aidesEligibles = aidesApplicables
    ? aides.filter((a) => idsAides.has(a.id) && (!a.departements || a.departements.includes(departement)))
    : [];

  const investissement = choisis.reduce((s, k) => s + (k.prix ?? 0), 0);
  const primesCee = aidesEligibles.filter((a) => a.est_cee).reduce((s, a) => s + (a.montant_max ?? 0), 0);
  const resteACharge = Math.max(0, investissement - primesCee);

  return {
    secteur,
    factureAnnuelle,
    economiesAnnuelles,
    packs: choisis,
    investissement,
    primesCee,
    autresAides: aidesEligibles.filter((a) => !a.est_cee),
    resteACharge,
    roiMois: economiesAnnuelles > 0 && investissement > 0 ? Math.max(1, Math.ceil((investissement / economiesAnnuelles) * 12)) : null,
    aidesApplicables,
  };
}

const fr = (n: number) => n.toLocaleString("fr-FR");

/** Variables injectées dans les templates d'email (et transmises à l'IA). */
export function variablesEmail(a: Argumentaire): Record<string, string> {
  const financement =
    a.primesCee > 0 && a.resteACharge === 0
      ? `Investissement à partir de ${fr(a.investissement)} € HT, couvert jusqu'à ${fr(a.primesCee)} € par les primes CEE : 0 € d'avance de trésorerie.`
      : a.primesCee > 0
        ? `Investissement à partir de ${fr(a.investissement)} € HT, dont jusqu'à ${fr(a.primesCee)} € couverts par les primes CEE.`
        : `Investissement à partir de ${fr(a.investissement)} € HT${a.roiMois ? `, rentabilisé en ${a.roiMois} mois environ` : ""}.`;

  return {
    prenom: "",
    factureEstimee: fr(arrondiCentaine(a.factureAnnuelle)),
    economiesAnnuelles: fr(arrondiCentaine(a.economiesAnnuelles)),
    packsRecommandes: a.packs
      .map((k) => `${k.emoji} ${k.label}${k.gain ? ` : ${k.gain}` : ""}${k.duree_travaux_jours ? `, ${k.duree_travaux_jours} jours de travaux` : ""}`)
      .join("\n"),
    phraseFinancement: financement,
    pourcentagePrincipal: SECTEURS[a.secteur].principal ?? "",
  };
}

import type { Commerc } from "@/lib/types";
import { ratioConso } from "@/lib/ratios-ademe";

export type SecteurId =
  | "boulangerie"
  | "restaurant"
  | "boucherie"
  | "alimentaire"
  | "pressing"
  | "coiffeur"
  | "boutique"
  | "autre";

export const SECTEURS: Record<SecteurId, { label: string; principal: string | null; poste: string | null }> = {
  boulangerie: { label: "Boulangerie / Pâtisserie", principal: "55 %", poste: "le four" },
  restaurant: { label: "Restaurant / Bar", principal: "50 %", poste: "la cuisson et le froid" },
  boucherie: { label: "Boucherie / Poissonnerie", principal: "60 %", poste: "le froid (vitrines et chambres froides)" },
  alimentaire: { label: "Commerce alimentaire", principal: "45 %", poste: "le froid" },
  pressing: { label: "Pressing / Blanchisserie", principal: "70 %", poste: "les machines et l'eau chaude" },
  coiffeur: { label: "Salon de coiffure", principal: "60 %", poste: "l'eau chaude et l'éclairage" },
  boutique: { label: "Boutique", principal: "50 %", poste: "l'éclairage" },
  autre: { label: "Autre", principal: null, poste: null },
};

// Ordre important : le premier motif qui matche gagne (ex. "restaurant de fruits de mer" → restaurant).
const MOTIFS: [SecteurId, RegExp][] = [
  ["boulangerie", /boulang|p[âa]tiss|g[âa]teau|chocolat|confiser|dessert|bagel|bakery/],
  ["restaurant", /restaura|pizz|sandwich|cr[êe]pe|kebab|snack|brasserie|\bbar\b|bar-|caf[ée]|salon de th[ée]|sushi|h[ôo]tel|hostellerie/],
  ["boucherie", /boucher|charcut|poisson|fruits de mer|traiteur|fromage/],
  ["alimentaire", /march[ée]|[ée]picerie|bio|primeur|caviste|surgel|alimentation/],
  ["pressing", /pressing|laverie|blanchiss/],
  ["coiffeur", /coiff|barbier/],
  ["boutique", /boutique|magasin|pr[êe]t-[àa]-porter/],
];

export function secteurDe(categorie: string | null): SecteurId {
  const cat = (categorie ?? "").toLowerCase();
  return MOTIFS.find(([, re]) => re.test(cat))?.[0] ?? "autre";
}

// Même formule que ca_potentiel (docs/ca-potentiel-formule.md), sans le % d'économies :
// surface (80 m² si inconnue ou nulle) × ratio conso ADEME OPERAT (kWh/m²/an) × 0,19 €/kWh.
export function factureEstimee(p: Pick<Commerc, "Cat_scraping" | "surface">): number {
  return Math.round((p.surface || 80) * ratioConso(p.Cat_scraping).kwhM2 * 0.19);
}

export const euros = (n: number | null | undefined) =>
  n == null ? "—" : `${n.toLocaleString("fr-FR")} €`;

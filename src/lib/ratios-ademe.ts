/**
 * Consommation énergétique de référence (kWh d'énergie finale / m² / an) par activité :
 * médianes 2023 de la base OPERAT (décret tertiaire), ADEME — jeu de données
 * « Consommations unitaires des locaux tertiaires par activité et type d'énergie ».
 * Détail et limites : docs/ca-potentiel-formule.md.
 *
 * Le premier motif qui correspond à la catégorie Google Maps (en minuscules) l'emporte.
 * Même table, dans le même ordre, dans la fonction SQL `ratio_conso_ademe` et dans WF-05.
 */
export const RATIOS_ADEME: { activite: string; motif: string; kwhM2: number }[] = [
  { activite: "Boulangerie, pâtisserie", motif: "boulang|p[âa]tiss|g[âa]teau|dessert|bagel|bakery", kwhM2: 757 },
  { activite: "Chocolatier, confiseur", motif: "chocolat|confiser", kwhM2: 171 },
  { activite: "Restauration rapide", motif: "pizz|kebab|burger|snack|sandwich|tacos|emporter|restauration rapide", kwhM2: 693 },
  { activite: "Bar, café", motif: "(^|[^a-z])bar([^a-z]|$)|caf[ée]($|[^t])|microbrasserie", kwhM2: 137 },
  { activite: "Restaurant traditionnel", motif: "restaura|bistro|brasserie|cr[êe]pe|sushi|h[ôo]tel|hostellerie|salon de th[ée]|caf[ée]t[ée]ria", kwhM2: 314 },
  { activite: "Surgelés", motif: "surgel", kwhM2: 465 },
  { activite: "Boucherie, charcuterie, poissonnerie, traiteur", motif: "boucher|charcut|poisson|fruits de mer|traiteur|fromag", kwhM2: 278 },
  { activite: "Supermarché, supérette", motif: "supermarch|hypermarch|sup[ée]rette", kwhM2: 247 },
  { activite: "Primeur, marché", motif: "primeur|march[ée]", kwhM2: 274 },
  { activite: "Épicerie, caviste", motif: "[ée]picerie|caviste|bio|alimentation", kwhM2: 96 },
  { activite: "Pressing, laverie", motif: "pressing|laverie|blanchiss", kwhM2: 547 },
  { activite: "Coiffure, esthétique", motif: "coiff|barbier|esth[ée]ti", kwhM2: 208 },
  { activite: "Boutique", motif: "boutique|magasin|pr[êe]t-[àa]-porter|v[êe]tement", kwhM2: 125 },
];

/** Commerce de détail, valeur par défaut OPERAT. */
export const RATIO_DEFAUT = { activite: "Commerce de détail (défaut)", kwhM2: 137 };

const COMPILES = RATIOS_ADEME.map((r) => ({ ...r, re: new RegExp(r.motif) }));

export function ratioConso(categorie: string | null): { activite: string; kwhM2: number } {
  const cat = (categorie ?? "").toLowerCase();
  return COMPILES.find((r) => r.re.test(cat)) ?? RATIO_DEFAUT;
}

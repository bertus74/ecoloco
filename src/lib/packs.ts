import type { Commerc, NiveauScore, Pack } from "@/lib/types";
import { secteurDe } from "@/lib/secteurs";

/** Niveau affiché : celui de la qualification manuelle s'il existe, sinon celui de WF-05. */
export function niveauAffiche(p: Pick<Commerc, "Niveau" | "niveau_qualifie">): NiveauScore | null {
  return p.niveau_qualifie ?? p.Niveau;
}

/** Packs retenus à la qualification, sinon packs éligibles d'après le secteur. */
export function packsDuProspect(
  p: Pick<Commerc, "Cat_scraping" | "packs_pertinents">,
  packs: Pack[],
): { packs: Pack[]; qualifies: boolean } {
  if (p.packs_pertinents?.length) {
    return { packs: packs.filter((k) => p.packs_pertinents.includes(k.id)), qualifies: true };
  }
  const secteur = secteurDe(p.Cat_scraping);
  return { packs: packs.filter((k) => k.secteurs.includes(secteur)), qualifies: false };
}

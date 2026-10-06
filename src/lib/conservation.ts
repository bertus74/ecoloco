/**
 * Durée de conservation des fiches prospects (RGPD) : 3 ans après le dernier contact, ou après la création de la fiche
 * si le prospect n'a jamais été contacté (durée usuellement retenue pour la prospection commerciale).
 * Exceptions : les prospects en « Blacklist » (leur trace évite de les recontacter) et les clients (« Diagnostic vendu »,
 * soumis à la conservation des contrats).
 */
export const DUREE_CONSERVATION_ANS = 3;
export const STATUTS_CONSERVES = ["Blacklist", "Diagnostic vendu"];

/** Date limite (ISO) : une fiche sans activité depuis cette date est à purger. */
export function limiteConservation(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - DUREE_CONSERVATION_ANS);
  return d.toISOString();
}

/** Filtre PostgREST « sans activité depuis la limite » : dernier contact, sinon date de création. */
export function filtreInactifs(limite: string): string {
  return `derniere_interaction.lt.${limite},and(derniere_interaction.is.null,created_at.lt.${limite})`;
}

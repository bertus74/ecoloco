// Couleurs des graphiques. Fichier SANS "use client" : exportées depuis charts.tsx (composant client),
// ces constantes arriveraient vides dans les composants serveur et tous les graphiques seraient gris.

// Palette catégorielle en ordre fixe (validée CVD/contraste ; légende + tooltip toujours présents).
export const SERIES_COULEURS = ["#1A7A4A", "#2E5FA6", "#7040B0", "#E07B39"];

// Une couleur fixe par pack (suit l'entité, pas le rang) ; ordre de l'anneau validé CVD.
export const COULEURS_PACKS: Record<string, string> = {
  economies_immediates: "#1A7A4A",
  maitrise_froid: "#2E5FA6",
  chaleur_productive: "#E07B39",
  eau_maitrisee: "#7040B0",
  pilotage_intelligent: "#B8336A",
  sans_pack: "#9CA3AF",
};

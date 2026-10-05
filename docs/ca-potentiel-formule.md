# Formule de `ca_potentiel`

`ca_potentiel` (table `commerc`) estime les **économies annuelles du prospect**
sur sa facture énergétique après travaux. À ne pas confondre avec
`devis_potentiel`, qui représente le CA pipeline potentiel pour EcoLoco
(affiché sur `/cockpit` et `/prospects`).

C'est une **estimation indicative**, pas un calcul officiel de fiche CEE
(qui demanderait la zone climatique, le type d'opération exact et les
coefficients PNCEE — voir la limite ci-dessous).

## Formule

```
ca_potentiel = surface(m²) × ratio_conso(kWh/m²/an) × prix_énergie(€/kWh) × %_économies
```

Calculée au même endroit sur trois supports, avec **la même table de ratios dans le même ordre** :
- app : `src/lib/ratios-ademe.ts` (facture estimée affichée, argumentaire) ;
- base : fonctions SQL `ratio_conso_ademe(cat)` et `calculer_ca_potentiel(cat, surface, score)` (migration `ca_potentiel_ratios_ademe_operat`), utilisées par le trigger `auto_ca_potentiel` pour les prospects pas encore scorés (score 50 par défaut) ;
- n8n : **WF-04 — Scoring Automatique**, nœud « Assembler Score Final », qui écrase la valeur avec le score réel.

Toute modification d'un ratio doit être faite aux trois endroits.

## Paramètres et sources (juin 2026)

| Paramètre | Valeur | Source |
|---|---|---|
| Surface | `surface` en base (cadastre, via WF-03), sinon **80 m²** par défaut | Hypothèse arbitraire si surface inconnue |
| Ratio conso par activité | voir tableau ci-dessous | **ADEME, base OPERAT** (décret tertiaire), jeu de données « Consommations unitaires des locaux tertiaires par activité et type d'énergie », médiane du ratio brut kWh/m², année de consommation 2023 |
| Prix de l'énergie | **0,19 €/kWh** | TRV Bleu Pro 2026 : 0,1583 €/kWh HT (option Base). Marché PME basse tension : 0,18-0,25 €/kWh. [Opéra Énergie](https://opera-energie.com/prix-electricite-prix-du-kwh/), [Lab Énergies](https://www.lab-energies.fr/articles/prix-de-l-electricite) |
| % d'économies | **15% à 35%**, linéaire selon `Score_Energ` (0 → 15%, 100 → 35%) | Rénovation globale tertiaire : gain moyen 20%, jusqu'à 30-40% en rénovation complète. [Effy](https://www.effy.fr/travaux-energetique/quelles-economies-travaux-de-renovation-isolation-chauffage), [CMIM](https://www.cmim.fr/datanumia/) |

## Ratios par activité (ADEME OPERAT, médianes 2023)

Le premier motif qui correspond à la catégorie Google Maps l'emporte.

| Activité | kWh/m²/an | Sous-catégorie OPERAT | Nb de sites |
|---|---|---|---|
| Boulangerie, pâtisserie | 757 | Alimentaire - Boulangerie, Pâtisserie | 467 |
| Chocolatier, confiseur | 171 | Alimentaire - Chocolatier, Confiseur | 157 |
| Restauration rapide (pizza, kebab, à emporter…) | 693 | Restauration rapide commerciale continue | 1 174 |
| Bar, café | 137 | Bar et café (sans restauration) | 71 |
| Restaurant traditionnel, brasserie, hôtel | 314 | Restaurant traditionnel ou Brasserie | 666 |
| Surgelés | 465 | Alimentaire - Surgelés | 228 |
| Boucherie, charcuterie, poissonnerie, traiteur, fromagerie | 278 | Alimentaire - Boucherie, Charcuterie | 54 |
| Supermarché, supérette | 247 | GSA - Petit supermarché | 1 489 |
| Primeur, marché | 274 | Alimentaire - Primeur | 74 |
| Épicerie, caviste, bio | 96 | Alimentaire - Epicerie, Caviste | 200 |
| Pressing, laverie | 547 | Service Pressing | 73 |
| Coiffure, esthétique | 208 | Bien-être et soins de la personne | 1 272 |
| Boutique | 125 | Equipement de la personne | 4 487 |
| Autre (défaut) | 137 | Equipement de la personne et loisirs - Valeur par défaut | 4 716 |

**Limite** : OPERAT recense surtout des sites soumis au décret tertiaire (≥ 1 000 m²), souvent des enseignes. Les petits commerces peuvent s'écarter de ces médianes, mais la source est officielle et le classement entre activités est cohérent.

## Limite connue : le montant de la prime CEE n'est pas calculé

`ca_potentiel` représente les **économies du prospect**, pas le **montant
de la prime CEE** qu'il pourrait toucher. Le montant réel d'une prime CEE
dépend de :
- la fiche d'opération standardisée concernée (ex. BAT-TH-116 pour la
  régulation/GTB, BAT-EN-101 pour l'isolation)
- la zone climatique et un coefficient d'activité
- un **prix du kWh cumac qui flotte sur le marché EMMY** au jour le jour
  (non administré)

Voir [Opéra Énergie sur BAT-TH-116](https://opera-energie.com/bat-th-116/)
pour le détail du calcul officiel. Automatiser ce calcul demanderait une
vraie intégration au [calculateur ADEME](https://calculateur-cee.ademe.fr/)
ou au registre EMMY — non fait à ce stade. C'est pourquoi l'email de
prospection (`src/lib/email-ia.ts`) nomme le dispositif CEE sans jamais
chiffrer le montant de la prime.

## Historique

- **2026-10-05** — Ratios remplacés par les médianes ADEME OPERAT par activité (13 catégories au lieu de 3). Les 515 prospects scorés ont été recalculés (anciennes valeurs sauvegardées dans `_backup_ca_potentiel_20261005`). Le trigger `auto_ca_potentiel` utilise désormais la même formule. Économies moyennes : 2 800 € → 3 046 € ; fortes hausses pour la restauration rapide et les boulangeries, baisses pour les bars, épiceries et boutiques.

- **2026-06-30** — Première version sourcée (ratios ci-dessus). Remplace une
  formule provisoire non sourcée (750/500/250 kWh/m², 0,18 €/kWh, 15-30%),
  elle-même un remplacement de l'ancien `ca_potentiel` qui n'était calculé
  par aucun workflow : 515 lignes n'avaient que 12 valeurs distinctes
  (1575 € à 5348 €), des données de seed factices sans rapport avec le
  score énergie ou la surface réelle. Ces anciennes valeurs ont été
  préservées dans le nouveau champ `devis_potentiel` (CA pipeline EcoLoco).

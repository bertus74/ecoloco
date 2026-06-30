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

Calculée :
- côté base, pour les prospects existants (migration `refine_ca_potentiel_with_sourced_ratios`, Supabase)
- côté n8n, pour les nouveaux prospects (workflow **WF-04 — Scoring Automatique**, node "Assembler Score Final")

## Paramètres et sources (juin 2026)

| Paramètre | Valeur | Source |
|---|---|---|
| Surface | `surface` en base (cadastre, via WF-03), sinon **80 m²** par défaut | Hypothèse arbitraire si surface inconnue |
| Ratio conso — boulangerie/poissonnerie/charcuterie/traiteur | **600 kWh/m²/an** | Boulangerie artisanale moyenne : 99 196 kWh/an pour 165 m². [ENGIE Pro](https://pro.engie.fr/economies-d-energie/comment-faire-des-economies-d-energie/reduire-sa-consommation-par-equipements/les-essentiels-de-l-efficacite-energetique-en-boulangerie) (données ARENE-ADEME 2008 + actualisation ENGIE) |
| Ratio conso — restaurant | **400 kWh/m²/an** | Restaurant traditionnel avec cuisine gaz pro : médiane 407 kWh/m²/an. [DiagTertiaire](https://diag-tertiaire.fr/blog/diagnostic-energetique-restaurant/) |
| Ratio conso — commerce généraliste (par défaut) | **275 kWh/m²/an** | Commerce de détail : fourchette 250-300 kWh/m²/an. [Covalba](https://www.covalba.fr/en/blog/consommation-moyenne-kwh-tertiaire) |
| Prix de l'énergie | **0,19 €/kWh** | TRV Bleu Pro 2026 : 0,1583 €/kWh HT (option Base). Marché PME basse tension : 0,18-0,25 €/kWh. [Opéra Énergie](https://opera-energie.com/prix-electricite-prix-du-kwh/), [Lab Énergies](https://www.lab-energies.fr/articles/prix-de-l-electricite) |
| % d'économies | **15% à 35%**, linéaire selon `Score_Energ` (0 → 15%, 100 → 35%) | Rénovation globale tertiaire : gain moyen 20%, jusqu'à 30-40% en rénovation complète. [Effy](https://www.effy.fr/travaux-energetique/quelles-economies-travaux-de-renovation-isolation-chauffage), [CMIM](https://www.cmim.fr/datanumia/) |

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

- **2026-06-30** — Première version sourcée (ratios ci-dessus). Remplace une
  formule provisoire non sourcée (750/500/250 kWh/m², 0,18 €/kWh, 15-30%),
  elle-même un remplacement de l'ancien `ca_potentiel` qui n'était calculé
  par aucun workflow : 515 lignes n'avaient que 12 valeurs distinctes
  (1575 € à 5348 €), des données de seed factices sans rapport avec le
  score énergie ou la surface réelle. Ces anciennes valeurs ont été
  préservées dans le nouveau champ `devis_potentiel` (CA pipeline EcoLoco).

export type StatutProspect =
  | "À valider"
  | "Nouveau"
  | "Contacté"
  | "Intéressé"
  | "RDV planifié"
  | "Diagnostic vendu"
  | "Perdu"
  | "Blacklist";

export type NiveauScore = "Chaud" | "Tiede" | "Froid";

export interface Commerc {
  id: number;
  created_at: string;
  Nom: string | null;
  Adresse: string | null;
  CP: number | null;
  Ville: string | null;
  Nbre_Avis: number | null;
  Cat_scraping: string | null;
  Tel: string | null;
  URL: string | null;
  Score_Energ: number | null;
  Niveau: NiveauScore | null;
  surface: number | null;
  note_google: number | null;
  apify_place_id: string | null;
  statut_prospect: StatutProspect | null;
  commercial_id: number | null;
  derniere_interaction: string | null;
  note_interne: string | null;
  departement: string | null;
  surface_status: string | null;
  note_cadastre: string | null;
  email: string | null;
  email_status: string | null;
  pays: string | null;
  prochaine_relance_le: string | null;
  nb_reports_relance: number;
  rappel_18_mois_le: string | null;
  motif_refus: string | null;
  montant_devis: number | null;
  /** Économies annuelles estimées du prospect sur sa facture énergétique. */
  ca_potentiel: number | null;
  /** Valeur potentielle de la prestation pour EcoLoco (CA pipeline). */
  devis_potentiel: number | null;
  valide_le: string | null;
}

export interface Commercial {
  id: number;
  created_at: string;
  Nom: string | null;
  Prénom: string | null;
  email: string | null;
  telephone: string | null;
  zone_geo: string | null;
  actif: boolean | null;
  role: "commercial" | "dg";
  auth_user_id: string | null;
}

export type TypeInteraction = "Appel" | "Email" | "Visite" | "RDV" | "Note" | "Autre";

export interface Interaction {
  id: number;
  created_at: string;
  commerc_id: number;
  commercial_id: number | null;
  type_interaction: TypeInteraction;
  resultat: string | null;
  note: string | null;
  duree_minutes: number | null;
  date_interaction: string | null;
  airtable_id: string | null;
}

export interface Rdv {
  id: number;
  commerc_id: number;
  commercial_id: number;
  date_rdv: string;
  duree_minutes: number | null;
  lieu: string | null;
  note: string | null;
  statut: "Planifié" | "Confirmé" | "Annulé" | "Réalisé";
  google_event_id: string | null;
  created_at: string;
}

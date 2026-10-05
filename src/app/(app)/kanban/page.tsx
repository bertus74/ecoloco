import { createClient } from "@/lib/supabase/server";
import type { Commerc, Pack } from "@/lib/types";
import { niveauAffiche } from "@/lib/packs";
import { COLONNES_KANBAN } from "./colonnes";
import { KanbanBoard, type CarteKanban } from "./kanban-board";

// Au-delà, une colonne n'affiche que les mieux scorés (la colonne "Nouveau" compte des centaines de lignes).
const MAX_PAR_COLONNE = 50;

export default async function KanbanPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("commerc")
    .select("id, Nom, Ville, Score_Energ, Niveau, niveau_qualifie, statut_prospect, montant_devis, packs_pertinents, packs_vendus")
    .in("statut_prospect", COLONNES_KANBAN)
    .order("Score_Energ", { ascending: false, nullsFirst: false })
    .returns<Pick<Commerc, "id" | "Nom" | "Ville" | "Score_Energ" | "Niveau" | "niveau_qualifie" | "statut_prospect" | "montant_devis" | "packs_pertinents" | "packs_vendus">[]>();
  const { data: packs } = await supabase.from("packs").select("*").order("ordre").returns<Pack[]>();

  const tous = data ?? [];
  const totaux = Object.fromEntries(
    COLONNES_KANBAN.map((c) => [c, tous.filter((p) => p.statut_prospect === c).length]),
  );
  const cartes: CarteKanban[] = COLONNES_KANBAN.flatMap((c) =>
    tous.filter((p) => p.statut_prospect === c).slice(0, MAX_PAR_COLONNE),
  ).map((p) => ({
    id: p.id,
    nom: p.Nom ?? "Sans nom",
    ville: p.Ville,
    score: p.Score_Energ,
    niveau: niveauAffiche(p),
    statut: p.statut_prospect ?? "Nouveau",
    montant: p.montant_devis,
    packsInitiaux: p.packs_vendus?.length ? p.packs_vendus : (p.packs_pertinents ?? []),
  }));

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-medium">Pipeline commercial</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Glissez-déposez une carte pour changer le statut du prospect. Chaque colonne affiche au plus{" "}
          {MAX_PAR_COLONNE} prospects, les mieux scorés.
        </p>
      </div>
      <KanbanBoard cartesInitiales={cartes} totauxInitiaux={totaux} packs={packs ?? []} />
    </div>
  );
}

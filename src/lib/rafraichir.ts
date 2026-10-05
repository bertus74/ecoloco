import { revalidatePath } from "next/cache";

/**
 * Un prospect, un RDV ou une interaction a changé : kanban, pipeline, leads, Aujourd'hui,
 * cockpit et fiches relisent Supabase à la prochaine visite (vide aussi le cache client,
 * y compris pour le bouton Retour du navigateur).
 */
export function rafraichirVues() {
  revalidatePath("/", "layout");
}

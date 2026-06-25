"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function validerProspect(id: number) {
  const supabase = await createClient();
  await supabase
    .from("commerc")
    .update({ statut_prospect: "Nouveau" })
    .eq("id", id)
    .eq("statut_prospect", "À valider");
  revalidatePath("/pipeline");
}

export async function supprimerScrappe(id: number) {
  const supabase = await createClient();
  await supabase
    .from("commerc")
    .delete()
    .eq("id", id)
    .eq("statut_prospect", "À valider");
  revalidatePath("/pipeline");
}

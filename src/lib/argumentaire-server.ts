import type { createClient } from "@/lib/supabase/server";
import type { AideCee, Commerc, Pack } from "@/lib/types";
import { calculerArgumentaire } from "@/lib/argumentaire";

/** Charge packs et aides puis calcule l'argumentaire chiffré du prospect. */
export async function chargerArgumentaire(supabase: Awaited<ReturnType<typeof createClient>>, prospect: Commerc) {
  const [{ data: packs }, { data: aides }] = await Promise.all([
    supabase.from("packs").select("*").order("ordre").returns<Pack[]>(),
    supabase.from("aides_cee").select("*").returns<AideCee[]>(),
  ]);
  return calculerArgumentaire(prospect, packs ?? [], aides ?? []);
}

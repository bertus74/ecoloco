"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function changerMotDePasse(formData: FormData) {
  const motDePasse = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");

  if (motDePasse.length < 8) redirect("/nouveau-mot-de-passe?error=longueur");
  if (motDePasse !== confirmation) redirect("/nouveau-mot-de-passe?error=different");

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: motDePasse });
  if (error) redirect(`/nouveau-mot-de-passe?error=${encodeURIComponent(error.message)}`);

  redirect("/aujourdhui");
}

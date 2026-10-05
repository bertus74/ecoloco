"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function demanderReinitialisation(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) redirect("/mot-de-passe-oublie?error=email");

  const origine = (await headers()).get("origin") ?? "https://excel-sys.fr";
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origine}/auth/callback?next=/nouveau-mot-de-passe`,
  });
  if (error) console.error("Réinitialisation du mot de passe :", error.message);

  // Même message que l'email existe ou non : on ne révèle pas quels comptes existent.
  redirect("/mot-de-passe-oublie?envoye=1");
}

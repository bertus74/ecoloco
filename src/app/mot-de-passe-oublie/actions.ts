"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

export async function demanderReinitialisation(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) redirect("/mot-de-passe-oublie?error=email");

  const origine = (await headers()).get("origin") ?? "https://excel-sys.fr";

  // Flux « implicite » volontaire : le lien contient lui-même la session (fragment d'URL) et n'a pas besoin du
  // cookie PKCE du navigateur qui a fait la demande, donc il marche aussi ouvert depuis une application mail
  // ou un autre navigateur. La page /auth/lien lit ce fragment (voir login/lien-email.tsx).
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origine}/auth/lien` });
  if (error) console.error("Réinitialisation du mot de passe :", error.message);

  // Même message que l'email existe ou non : on ne révèle pas quels comptes existent.
  redirect("/mot-de-passe-oublie?envoye=1");
}

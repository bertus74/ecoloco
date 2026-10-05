import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Retour du lien envoyé par email (réinitialisation du mot de passe) : on échange le code contre une session.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/nouveau-mot-de-passe";
  // Uniquement des chemins internes, pour ne pas servir de redirection ouverte.
  const destination = next.startsWith("/") && !next.startsWith("//") ? next : "/nouveau-mot-de-passe";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${destination}`);
    console.error("Lien de connexion :", error.message);
  }

  const erreur = encodeURIComponent("Lien invalide ou expiré. Demandez un nouveau lien.");
  return NextResponse.redirect(`${origin}/login?error=${erreur}`);
}

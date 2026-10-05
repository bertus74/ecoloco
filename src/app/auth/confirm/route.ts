import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Lien d'email « token_hash » : vérifié côté serveur, sans dépendre d'un cookie posé dans le navigateur
// qui a demandé le lien (le lien marche même ouvert dans un autre navigateur ou une autre application).
// Modèle d'email Supabase : {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(`${origin}/nouveau-mot-de-passe`);
    console.error("Vérification du lien :", error.message);
  }

  const erreur = encodeURIComponent("Lien invalide ou expiré. Demandez un nouveau lien.");
  return NextResponse.redirect(`${origin}/login?error=${erreur}`);
}

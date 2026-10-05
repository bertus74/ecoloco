import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { pathname, searchParams } = request.nextUrl;

  // Si l'URL de retour n'est pas autorisée côté Supabase, le lien email renvoie sur la racine avec ?code=… :
  // on le fait passer par la route qui échange le code contre une session.
  if (searchParams.has("code") && pathname !== "/auth/callback") {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    if (!url.searchParams.has("next")) url.searchParams.set("next", "/nouveau-mot-de-passe");
    return NextResponse.redirect(url);
  }

  const { data: { user } } = await supabase.auth.getUser();

  // Pages accessibles sans être connecté ; les deux premières renvoient vers l'app si on l'est déjà.
  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/mot-de-passe-oublie");
  const isPublicRoute = isAuthRoute || pathname.startsWith("/auth/callback") || pathname.startsWith("/auth/confirm");

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/pipeline";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

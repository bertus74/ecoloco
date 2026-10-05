import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./sign-out-button";
import type { Commercial } from "@/lib/types";
import { LIMITE_LIGNES, SEUIL_ALERTE } from "@/lib/limite-lignes";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  let profile: Commercial | null = null;
  if (auth.user) {
    const { data } = await supabase
      .from("commerciaux")
      .select("*")
      .eq("auth_user_id", auth.user.id)
      .single();
    profile = data;
  }

  // Au-delà de LIMITE_LIGNES prospects visibles, les listes et totaux calculés côté appli sont tronqués sans erreur.
  const { count: nbProspectsVisibles } = auth.user
    ? await supabase.from("commerc").select("id", { count: "exact", head: true })
    : { count: 0 };
  const depasse = (nbProspectsVisibles ?? 0) > LIMITE_LIGNES;
  const approche = !depasse && (nbProspectsVisibles ?? 0) >= SEUIL_ALERTE;

  const isDg = profile?.role === "dg";
  const initials = profile
    ? `${(profile.Prénom ?? "")[0] ?? ""}${(profile.Nom ?? "")[0] ?? ""}`.toUpperCase()
    : "";

  const navItems = [
    { href: "/aujourdhui", label: "Aujourd'hui", icon: "☀️" },
    { href: "/leads", label: "Leads du jour", icon: "🔥" },
    { href: "/pipeline", label: "Pipeline", icon: "📋" },
    { href: "/kanban", label: "Kanban", icon: "🗂️" },
    { href: "/prospects", label: "Prospects", icon: "📇" },
    { href: "/scraping", label: "Scraping", icon: "🔍" },
    { href: "/calendrier", label: "Calendrier", icon: "📅" },
  ];
  if (isDg) {
    navItems.push({ href: "/cockpit", label: "Cockpit DG", icon: "📊" });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-6 py-3">
        <div className="flex items-center gap-8">
          <span className="text-base font-medium text-[var(--primary-dark)]">Eco-Locaux</span>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-1.5 text-sm text-[var(--foreground)] hover:bg-[var(--primary-light)]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {profile ? (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary-light)] text-xs font-medium text-[var(--primary-dark)]">
                {initials}
              </div>
              <span className="text-sm text-[var(--muted)]">
                {profile.Prénom} {profile.Nom}
              </span>
              <Link href="/nouveau-mot-de-passe" className="text-xs text-[var(--muted)] underline">
                Mot de passe
              </Link>
            </div>
          ) : null}
          <SignOutButton />
        </div>
      </header>
      {depasse || approche ? (
        <div
          role="alert"
          className={`px-6 py-2 text-sm ${depasse ? "bg-[var(--danger-light)] text-[var(--danger)]" : "bg-amber-50 text-amber-800"}`}
        >
          {depasse
            ? `Attention : ${nbProspectsVisibles} prospects en base, au-delà de la limite de ${LIMITE_LIGNES} lignes affichables. Certaines listes et certains chiffres (cockpit, prospects) sont incomplets.`
            : `La base approche de la limite de ${LIMITE_LIGNES} prospects (${nbProspectsVisibles}) : au-delà, les listes et les chiffres seront incomplets.`}
          {isDg ? " Purgez des prospects depuis le Cockpit DG (« Maintenance des données »)." : " Prévenez la direction."}
        </div>
      ) : null}
      <main className="flex-1 bg-[var(--background)] px-6 py-6">{children}</main>
    </div>
  );
}

import { LienEmail } from "@/app/login/lien-email";

// Page d'arrivée des liens email de réinitialisation : accessible connecté ou non
// (le composant lit le fragment d'URL, ouvre la session et envoie vers « Nouveau mot de passe »).
export default function LienPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      <LienEmail />
      <p className="text-sm text-[var(--muted)]">Vérification du lien…</p>
    </div>
  );
}

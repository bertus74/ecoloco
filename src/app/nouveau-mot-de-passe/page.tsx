import Link from "next/link";
import { changerMotDePasse } from "./actions";

const MESSAGES: Record<string, string> = {
  longueur: "Le mot de passe doit contenir au moins 8 caractères.",
  different: "Les deux mots de passe ne sont pas identiques.",
  "New password should be different from the old password.": "Le nouveau mot de passe doit être différent de l'ancien.",
};

export default async function NouveauMotDePassePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-medium text-[var(--foreground)]">Nouveau mot de passe</h1>
        <p className="mb-6 text-sm text-[var(--muted)]">Au moins 8 caractères.</p>

        {error ? (
          <div className="mb-4 rounded-md bg-[var(--danger-light)] px-3 py-2 text-sm text-[var(--danger)]">
            {MESSAGES[error] ?? error}
          </div>
        ) : null}

        <form action={changerMotDePasse} className="flex flex-col gap-4">
          <div>
            <label htmlFor="password" className="mb-1 block text-sm text-[var(--muted)]">
              Nouveau mot de passe
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
            />
          </div>
          <div>
            <label htmlFor="confirmation" className="mb-1 block text-sm text-[var(--muted)]">
              Confirmation
            </label>
            <input
              id="confirmation"
              name="confirmation"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
            />
          </div>
          <button
            type="submit"
            className="mt-2 rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--primary-dark)]"
          >
            Enregistrer
          </button>
        </form>

        <Link href="/aujourdhui" className="mt-4 block text-center text-sm text-[var(--muted)] underline">
          Annuler
        </Link>
      </div>
    </div>
  );
}

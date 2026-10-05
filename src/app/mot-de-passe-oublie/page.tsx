import Link from "next/link";
import { demanderReinitialisation } from "./actions";

export default async function MotDePasseOubliePage({
  searchParams,
}: {
  searchParams: Promise<{ envoye?: string; error?: string }>;
}) {
  const { envoye, error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-medium text-[var(--foreground)]">Mot de passe oublié</h1>
        <p className="mb-6 text-sm text-[var(--muted)]">
          Indiquez votre email : vous recevrez un lien pour choisir un nouveau mot de passe.
        </p>

        {envoye ? (
          <div className="mb-4 rounded-md bg-[var(--primary-light)] px-3 py-2 text-sm text-[var(--primary-dark)]">
            Si un compte existe pour cette adresse, un email vient d&apos;être envoyé. Pensez à vérifier les
            courriers indésirables.
          </div>
        ) : null}
        {error ? (
          <div className="mb-4 rounded-md bg-[var(--danger-light)] px-3 py-2 text-sm text-[var(--danger)]">
            Indiquez votre adresse email.
          </div>
        ) : null}

        <form action={demanderReinitialisation} className="flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm text-[var(--muted)]">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
            />
          </div>
          <button
            type="submit"
            className="mt-2 rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--primary-dark)]"
          >
            Envoyer le lien
          </button>
        </form>

        <Link href="/login" className="mt-4 block text-center text-sm text-[var(--muted)] underline">
          Retour à la connexion
        </Link>
      </div>
    </div>
  );
}

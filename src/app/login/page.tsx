import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-medium text-[var(--foreground)]">EcoLoco</h1>
        <p className="mb-6 text-sm text-[var(--muted)]">Connexion à votre espace</p>

        {error ? (
          <div className="mb-4 rounded-md bg-[var(--danger-light)] px-3 py-2 text-sm text-[var(--danger)]">
            {error === "Invalid login credentials"
              ? "Email ou mot de passe incorrect."
              : error}
          </div>
        ) : null}

        <form action={login} className="flex flex-col gap-4">
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
          <div>
            <label htmlFor="password" className="mb-1 block text-sm text-[var(--muted)]">
              Mot de passe
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
            />
          </div>
          <button
            type="submit"
            className="mt-2 rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--primary-dark)]"
          >
            Se connecter
          </button>
        </form>
      </div>
    </div>
  );
}

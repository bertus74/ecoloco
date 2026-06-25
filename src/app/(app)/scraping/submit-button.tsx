"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--primary-dark)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Demande en cours…" : "Lancer la recherche"}
    </button>
  );
}

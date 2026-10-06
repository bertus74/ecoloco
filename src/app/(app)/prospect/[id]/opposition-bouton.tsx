"use client";

import { useState, useTransition } from "react";

/** Bouton « Opposition (STOP) » : le prospect ne veut plus être contacté. Deux clics pour éviter une erreur. */
export function OppositionBouton({ onOpposition }: { onOpposition: () => Promise<void> }) {
  const [confirmer, setConfirmer] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, startTransition] = useTransition();

  const valider = () =>
    startTransition(async () => {
      try {
        await onOpposition();
      } catch {
        setErreur("Opposition non enregistrée.");
        setConfirmer(false);
      }
    });

  if (!confirmer) {
    return (
      <span className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setErreur(null);
            setConfirmer(true);
          }}
          className="rounded-md border border-[var(--danger)] px-2.5 py-1 text-sm text-[var(--danger)] hover:bg-[var(--danger-light)]"
        >
          Opposition (STOP)
        </button>
        {erreur ? <span className="text-xs text-[var(--danger)]">{erreur}</span> : null}
      </span>
    );
  }

  return (
    <span className="flex items-center gap-2 rounded-md bg-[var(--danger-light)] px-2.5 py-1 text-sm">
      <span className="text-[var(--danger)]">Ne plus jamais contacter ce prospect ?</span>
      <button
        type="button"
        disabled={enCours}
        onClick={valider}
        className="rounded-md bg-[var(--danger)] px-2.5 py-0.5 text-white disabled:opacity-50"
      >
        {enCours ? "Enregistrement…" : "Confirmer"}
      </button>
      <button type="button" disabled={enCours} onClick={() => setConfirmer(false)} className="underline">
        Annuler
      </button>
    </span>
  );
}

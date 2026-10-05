"use client";

import { useEffect, useState } from "react";

/**
 * Fenêtre « Diagnostic vendu » : demande le montant du contrat (€ HT).
 * À monter seulement quand elle doit être visible : son état part de `suggestion` à chaque ouverture.
 */
export function VenteDialog({
  nomProspect,
  suggestion,
  enCours = false,
  onConfirmer,
  onAnnuler,
}: {
  nomProspect: string;
  suggestion?: number | null;
  enCours?: boolean;
  /** `null` = vente enregistrée sans montant (à saisir plus tard). */
  onConfirmer: (montant: number | null) => void;
  onAnnuler: () => void;
}) {
  const [saisie, setSaisie] = useState(suggestion ? String(Math.round(suggestion)) : "");
  const montant = Number(saisie.replace(/\s/g, "").replace(",", "."));
  const valide = saisie.trim() !== "" && Number.isFinite(montant) && montant > 0 && montant <= 10_000_000;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onAnnuler();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onAnnuler]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onAnnuler} />
      <form
        role="dialog"
        aria-modal="true"
        aria-label="Diagnostic vendu"
        onSubmit={(e) => {
          e.preventDefault();
          if (valide) onConfirmer(montant);
        }}
        className="relative w-full max-w-sm rounded-lg bg-[var(--surface)] p-6 shadow-xl"
      >
        <h2 className="text-base font-medium">Diagnostic vendu</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">{nomProspect}</p>

        <label htmlFor="montant-vente" className="mb-1 mt-5 block text-xs font-medium text-[var(--muted)]">
          Montant du contrat (€ HT)
        </label>
        <input
          id="montant-vente"
          inputMode="decimal"
          autoFocus
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          placeholder="ex. 5 800"
          className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm tabular-nums outline-none focus:border-[var(--primary)]"
        />
        {suggestion ? (
          <p className="mt-1 text-xs text-[var(--muted)]">Pré-rempli avec l&apos;investissement estimé de l&apos;argumentaire.</p>
        ) : null}

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="submit"
            disabled={!valide || enCours}
            className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--primary-dark)] disabled:opacity-50"
          >
            {enCours ? "Enregistrement…" : "Enregistrer la vente"}
          </button>
          <button
            type="button"
            disabled={enCours}
            onClick={() => onConfirmer(null)}
            className="rounded-md border border-[var(--border)] px-4 py-2 text-sm hover:bg-[var(--background)] disabled:opacity-50"
          >
            Saisir le montant plus tard
          </button>
          <button type="button" onClick={onAnnuler} className="px-4 py-1.5 text-sm text-[var(--muted)] underline">
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}

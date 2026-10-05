"use client";

import { useState, useTransition } from "react";

/** Montant du contrat (€ HT) : affichage + saisie ou correction. */
export function MontantEditable({
  montant,
  onEnregistrer,
}: {
  montant: number | null;
  onEnregistrer: (montant: number | null) => Promise<void>;
}) {
  const [saisie, setSaisie] = useState(montant != null ? String(montant) : "");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, startTransition] = useTransition();

  const valeur = saisie.trim() === "" ? null : Number(saisie.replace(/\s/g, "").replace(",", "."));
  const valide = valeur === null || (Number.isFinite(valeur) && valeur > 0 && valeur <= 10_000_000);
  const change = valide && valeur !== montant;

  return (
    <form
      className="flex items-center justify-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!change) return;
        setErreur(null);
        startTransition(async () => {
          try {
            await onEnregistrer(valeur);
          } catch {
            setErreur("Non enregistré");
          }
        });
      }}
    >
      <input
        inputMode="decimal"
        value={saisie}
        onChange={(e) => setSaisie(e.target.value)}
        placeholder="—"
        aria-label="Montant du contrat en euros HT"
        className="w-28 rounded-md border border-[var(--border)] px-2 py-1 text-right text-sm tabular-nums outline-none focus:border-[var(--primary)]"
      />
      <span className="text-sm">€ HT</span>
      {change ? (
        <button
          type="submit"
          disabled={enCours}
          className="rounded-md bg-[var(--primary)] px-2 py-1 text-xs text-white disabled:opacity-50"
        >
          {enCours ? "…" : "Enregistrer"}
        </button>
      ) : null}
      {erreur ? <span className="text-xs text-[var(--danger)]">{erreur}</span> : null}
    </form>
  );
}

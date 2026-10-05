"use client";

import { useEffect, useState } from "react";
import type { Pack } from "@/lib/types";

/**
 * Fenêtre « Diagnostic vendu » : demande le montant du contrat (€ HT) et les packs vendus.
 * À monter seulement quand elle doit être visible : son état part de `suggestion` à chaque ouverture.
 */
export function VenteDialog({
  nomProspect,
  suggestion,
  packs = [],
  packsInitiaux = [],
  enCours = false,
  onConfirmer,
  onAnnuler,
}: {
  nomProspect: string;
  suggestion?: number | null;
  /** Catalogue des packs proposés (leur `prix` alimente le montant proposé) ; `packsInitiaux` = ids cochés au départ (packs retenus à la qualification). */
  packs?: Pack[];
  packsInitiaux?: string[];
  enCours?: boolean;
  /** `null` = vente enregistrée sans montant (à saisir plus tard). */
  onConfirmer: (montant: number | null, packsVendus: string[]) => void;
  onAnnuler: () => void;
}) {
  // Total catalogue des packs cochés ; à défaut de packs, la suggestion de l'argumentaire.
  const totalPacks = (ids: string[]) => packs.filter((k) => ids.includes(k.id)).reduce((s, k) => s + (k.prix ?? 0), 0);
  const proposition = (ids: string[]) => totalPacks(ids) || suggestion || 0;
  const [choisis, setChoisis] = useState<string[]>(packsInitiaux);
  const [saisie, setSaisie] = useState(proposition(packsInitiaux) ? String(Math.round(proposition(packsInitiaux))) : "");
  // Tant que le montant n'est pas modifié à la main, il suit les packs cochés.
  const [modifieAMain, setModifieAMain] = useState(false);
  const basculer = (id: string) => {
    const suite = choisis.includes(id) ? choisis.filter((x) => x !== id) : [...choisis, id];
    setChoisis(suite);
    if (!modifieAMain) setSaisie(proposition(suite) ? String(Math.round(proposition(suite))) : "");
  };
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
          if (valide) onConfirmer(montant, choisis);
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
          onChange={(e) => {
            setSaisie(e.target.value);
            setModifieAMain(true);
          }}
          placeholder="ex. 5 800"
          className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm tabular-nums outline-none focus:border-[var(--primary)]"
        />
        {!modifieAMain && proposition(choisis) ? (
          <p className="mt-1 text-xs text-[var(--muted)]">
            {totalPacks(choisis) ? "Total des packs cochés (prix catalogue) ; modifiable." : "Investissement estimé de l'argumentaire ; modifiable."}
          </p>
        ) : null}

        {packs.length > 0 ? (
          <fieldset className="mt-5">
            <legend className="mb-1 text-xs font-medium text-[var(--muted)]">Packs vendus</legend>
            <div className="flex flex-col gap-1">
              {packs.map((k) => (
                <label key={k.id} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" checked={choisis.includes(k.id)} onChange={() => basculer(k.id)} />
                  <span>
                    {k.emoji} {k.label}
                  </span>
                </label>
              ))}
            </div>
            {packsInitiaux.length > 0 ? (
              <p className="mt-1 text-xs text-[var(--muted)]">Pré-coché avec les packs retenus à la qualification.</p>
            ) : null}
          </fieldset>
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
            onClick={() => onConfirmer(null, choisis)}
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

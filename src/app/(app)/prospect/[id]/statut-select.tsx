"use client";

import { useState, useTransition } from "react";
import { VenteDialog } from "@/components/vente-dialog";
import type { Pack } from "@/lib/types";

/** Sélecteur de statut : le passage en « Diagnostic vendu » demande d'abord le montant du contrat. */
export function StatutSelect({
  defaultValue,
  options,
  nomProspect,
  suggestion,
  packs,
  packsInitiaux,
  onChangeStatut,
  onVente,
}: {
  defaultValue: string;
  options: string[];
  nomProspect: string;
  suggestion: number | null;
  packs: Pack[];
  packsInitiaux: string[];
  onChangeStatut: (statut: string) => Promise<void>;
  onVente: (montant: number | null, packsVendus: string[]) => Promise<void>;
}) {
  const [valeur, setValeur] = useState(defaultValue);
  const [dialogue, setDialogue] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, startTransition] = useTransition();

  const changer = (statut: string) => {
    setErreur(null);
    if (statut === "Diagnostic vendu") {
      setDialogue(true);
      return;
    }
    setValeur(statut);
    startTransition(async () => {
      try {
        await onChangeStatut(statut);
      } catch {
        setValeur(defaultValue);
        setErreur("Statut non modifié.");
      }
    });
  };

  return (
    <>
      <select
        value={valeur}
        onChange={(e) => changer(e.target.value)}
        className="rounded-md border border-[var(--border)] px-2 py-1 text-sm"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      {erreur ? <span className="text-xs text-[var(--danger)]">{erreur}</span> : null}
      {dialogue ? (
        <VenteDialog
          nomProspect={nomProspect}
          suggestion={suggestion}
          packs={packs}
          packsInitiaux={packsInitiaux}
          enCours={enCours}
          onAnnuler={() => setDialogue(false)}
          onConfirmer={(montant, packsVendus) =>
            startTransition(async () => {
              try {
                await onVente(montant, packsVendus);
                setValeur("Diagnostic vendu");
                setDialogue(false);
              } catch {
                setDialogue(false);
                setErreur("Vente non enregistrée.");
              }
            })
          }
        />
      ) : null}
    </>
  );
}

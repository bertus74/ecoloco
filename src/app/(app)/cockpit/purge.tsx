"use client";

import { useState, useTransition } from "react";
import { purgerProspects, type CiblePurge } from "./actions";

const CIBLES: { id: CiblePurge; titre: string; aide: string }[] = [
  { id: "perdus", titre: "Prospects perdus", aide: "Statut « Perdu »." },
  {
    id: "nouveaux_sans_contact",
    titre: "Nouveaux jamais contactés",
    aide: "Statut « Nouveau » sans aucune interaction. Ils peuvent être rescrapés plus tard.",
  },
];

/** Purge manuelle (DG) pour rester sous la limite de lignes affichables. */
export function Purge({ nombres, total }: { nombres: Record<CiblePurge, number>; total: number }) {
  const [aConfirmer, setAConfirmer] = useState<CiblePurge | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [enCours, startTransition] = useTransition();

  const lancer = (cible: CiblePurge) =>
    startTransition(async () => {
      try {
        const { supprimes } = await purgerProspects(cible);
        setMessage(`${supprimes} prospect${supprimes > 1 ? "s" : ""} supprimé${supprimes > 1 ? "s" : ""}.`);
      } catch (e) {
        setMessage(e instanceof Error ? `Échec : ${e.message}` : "Échec de la purge.");
      }
      setAConfirmer(null);
    });

  return (
    <section className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
      <h2 className="text-base font-medium">Maintenance des données</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        {total} prospects en base. L&apos;affichage est fiable jusqu&apos;à 1 000 lignes ; au-delà, purgez. La suppression est
        définitive et efface aussi les interactions et RDV liés. Les prospects en « Blacklist » ne sont jamais supprimés.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {CIBLES.map((c) => (
          <div key={c.id} className="rounded-md border border-[var(--border)] p-3">
            <p className="text-sm font-medium">
              {c.titre} <span className="tabular-nums text-[var(--muted)]">({nombres[c.id]})</span>
            </p>
            <p className="text-xs text-[var(--muted)]">{c.aide}</p>
            {aConfirmer === c.id ? (
              <div className="mt-2 flex items-center gap-2">
                <button
                  disabled={enCours}
                  onClick={() => lancer(c.id)}
                  className="rounded-md bg-[var(--danger)] px-3 py-1 text-xs text-white disabled:opacity-50"
                >
                  {enCours ? "Suppression…" : `Supprimer ${nombres[c.id]} définitivement`}
                </button>
                <button onClick={() => setAConfirmer(null)} className="text-xs underline">
                  Annuler
                </button>
              </div>
            ) : (
              <button
                disabled={nombres[c.id] === 0 || enCours}
                onClick={() => {
                  setMessage(null);
                  setAConfirmer(c.id);
                }}
                className="mt-2 rounded-md border border-[var(--border)] px-3 py-1 text-xs hover:bg-[var(--background)] disabled:opacity-40"
              >
                Purger…
              </button>
            )}
          </div>
        ))}
      </div>
      {message ? <p className="mt-3 text-sm">{message}</p> : null}
    </section>
  );
}

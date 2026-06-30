"use client";

import { useState, useTransition } from "react";
import type { Commerc } from "@/lib/types";
import {
  validerProspect,
  supprimerScrappe,
  validerSelection,
  supprimerSelection,
} from "./actions";

function scoreBadgeClass(niveau: string | null) {
  if (niveau === "Chaud") return "bg-[var(--danger-light)] text-[var(--danger)]";
  if (niveau === "Tiede") return "bg-[var(--primary-light)] text-[var(--primary-dark)]";
  return "bg-[var(--background)] text-[var(--muted)]";
}

const PAGE_SIZE = 20;

export function ValiderList({ items }: { items: Commerc[] }) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [isPending, startTransition] = useTransition();

  const page = items.slice(0, visible);
  const toutCoche = page.length > 0 && page.every((p) => selected.has(p.id));

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleTout() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (toutCoche) {
        page.forEach((p) => next.delete(p.id));
      } else {
        page.forEach((p) => next.add(p.id));
      }
      return next;
    });
  }

  function lancerValiderSelection() {
    const ids = [...selected];
    startTransition(async () => {
      await validerSelection(ids);
      setSelected(new Set());
    });
  }

  function lancerSupprimerSelection() {
    const ids = [...selected];
    startTransition(async () => {
      await supprimerSelection(ids);
      setSelected(new Set());
    });
  }

  return (
    <div className="mb-6 overflow-hidden rounded-lg border border-[var(--border)]">
      <div className="flex items-center justify-between gap-2 bg-[var(--warning-light)] px-4 py-2 text-xs text-[var(--warning)]">
        <span>
          {selected.size > 0
            ? `${selected.size} sélectionné${selected.size > 1 ? "s" : ""}`
            : `${items.length} en attente de validation`}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={selected.size === 0 || isPending}
            onClick={lancerValiderSelection}
            className="rounded-md bg-[var(--primary)] px-3 py-1 text-xs text-white disabled:opacity-40"
          >
            Valider la sélection
          </button>
          <button
            type="button"
            disabled={selected.size === 0 || isPending}
            onClick={lancerSupprimerSelection}
            className="rounded-md border border-[var(--border)] px-3 py-1 text-xs text-[var(--danger)] disabled:opacity-40"
          >
            Supprimer la sélection
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[2rem_1.6fr_0.8fr_1fr_1fr] gap-0 bg-[var(--warning-light)] px-4 py-2.5 text-xs text-[var(--warning)]">
        <input type="checkbox" checked={toutCoche} onChange={toggleTout} aria-label="Tout sélectionner" />
        <div>Scrappé (à valider)</div>
        <div>Score</div>
        <div>Avis</div>
        <div>Actions</div>
      </div>

      {page.map((p) => (
        <div
          key={p.id}
          className="grid grid-cols-[2rem_1.6fr_0.8fr_1fr_1fr] items-center gap-0 border-t border-[var(--border)] px-4 py-3"
        >
          <input
            type="checkbox"
            checked={selected.has(p.id)}
            onChange={() => toggle(p.id)}
            aria-label={`Sélectionner ${p.Nom ?? ""}`}
          />
          <div>
            <p className="text-sm font-medium">{p.Nom}</p>
            <p className="text-xs text-[var(--muted)]">
              {p.Ville}
              {p.pays ? `, ${p.pays}` : ""}
            </p>
          </div>
          <div>
            <span className={`rounded-md px-2 py-0.5 text-xs ${scoreBadgeClass(p.Niveau)}`}>
              {p.Score_Energ ?? "—"}
            </span>
          </div>
          <div className="text-sm">{p.Nbre_Avis ?? "—"}</div>
          <div className="flex gap-2">
            <form action={validerProspect.bind(null, p.id)}>
              <button type="submit" className="rounded-md bg-[var(--primary)] px-3 py-1 text-xs text-white">
                Valider
              </button>
            </form>
            <form action={supprimerScrappe.bind(null, p.id)}>
              <button
                type="submit"
                className="rounded-md border border-[var(--border)] px-3 py-1 text-xs text-[var(--danger)]"
              >
                Supprimer
              </button>
            </form>
          </div>
        </div>
      ))}

      {visible < items.length ? (
        <button
          type="button"
          onClick={() => setVisible((v) => v + PAGE_SIZE)}
          className="w-full border-t border-[var(--border)] px-4 py-3 text-center text-xs text-[var(--primary)] hover:bg-[var(--background)]"
        >
          Afficher {Math.min(PAGE_SIZE, items.length - visible)} de plus ({items.length - visible} restants)
        </button>
      ) : null}
    </div>
  );
}

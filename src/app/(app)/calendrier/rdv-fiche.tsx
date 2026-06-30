"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { Rdv } from "@/lib/types";
import { modifierRdv, supprimerRdv } from "./actions";

const STATUTS_RDV = ["Planifié", "Confirmé", "Annulé", "Réalisé"] as const;

interface ProspectInfo {
  id: number;
  Nom: string;
  Ville: string;
}

interface CommercialInfo {
  id: number;
  Nom: string | null;
  Prénom: string | null;
  email: string | null;
  telephone: string | null;
  zone_geo: string | null;
}

function ymdLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function hmLocal(d: Date) {
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${min}`;
}

export function RdvFiche({
  rdv,
  prospect,
  commercial,
  variant = "compact",
}: {
  rdv: Rdv;
  prospect: ProspectInfo | null;
  commercial: CommercialInfo | null;
  variant?: "compact" | "agenda";
}) {
  const [ouvert, setOuvert] = useState(false);
  const [isPending, startTransition] = useTransition();
  const date = new Date(rdv.date_rdv);

  const fermer = () => setOuvert(false);

  const onSubmit = (formData: FormData) => {
    startTransition(async () => {
      await modifierRdv(rdv.id, formData);
      fermer();
    });
  };

  const onSupprimer = () => {
    if (!confirm("Supprimer ce RDV ?")) return;
    startTransition(async () => {
      await supprimerRdv(rdv.id);
      fermer();
    });
  };

  return (
    <>
      {variant === "agenda" ? (
        <button
          type="button"
          onClick={() => setOuvert(true)}
          className="flex w-full items-center gap-4 border-t border-[var(--border)] px-4 py-3 text-left text-sm first:border-0 hover:bg-[var(--background)]"
        >
          <span className="w-28 text-[var(--muted)]">
            {date.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "2-digit" })}
          </span>
          <span className="w-14 font-medium">{hmLocal(date)}</span>
          <span className="flex-1">{prospect?.Nom ?? `#${rdv.commerc_id}`}</span>
          <span className="text-[var(--muted)]">{rdv.lieu ?? ""}</span>
          <span className="text-xs text-[var(--muted)]">{rdv.statut}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOuvert(true)}
          className="w-full rounded-md bg-[var(--primary-light)] px-2 py-1.5 text-left text-xs text-[var(--primary-dark)] hover:opacity-80"
        >
          <p className="font-medium">{hmLocal(date)}</p>
          <p>{prospect?.Nom ?? `#${rdv.commerc_id}`}</p>
        </button>
      )}

      {ouvert ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={fermer}
        >
          <div
            className="w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-base font-medium">{prospect?.Nom ?? `Prospect #${rdv.commerc_id}`}</h2>
                {prospect ? (
                  <Link href={`/prospect/${prospect.id}`} className="text-xs text-[var(--primary)]">
                    Voir la fiche prospect →
                  </Link>
                ) : null}
              </div>
              <button type="button" onClick={fermer} className="text-sm text-[var(--muted)]">
                ✕
              </button>
            </div>

            {commercial ? (
              <div className="mb-4 rounded-md bg-[var(--background)] p-3 text-sm">
                <p className="mb-1 text-xs text-[var(--muted)]">Commercial assigné</p>
                <p className="font-medium">{commercial.Prénom} {commercial.Nom}</p>
                {commercial.telephone ? <p className="text-xs text-[var(--muted)]">📞 {commercial.telephone}</p> : null}
                {commercial.email ? <p className="text-xs text-[var(--muted)]">✉️ {commercial.email}</p> : null}
                {commercial.zone_geo ? <p className="text-xs text-[var(--muted)]">📍 {commercial.zone_geo}</p> : null}
              </div>
            ) : null}

            <form action={onSubmit} className="flex flex-col gap-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-[var(--muted)]">Date</label>
                  <input
                    name="date"
                    type="date"
                    defaultValue={ymdLocal(date)}
                    required
                    className="w-full rounded-md border border-[var(--border)] px-2 py-1.5 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-[var(--muted)]">Heure</label>
                  <input
                    name="heure"
                    type="time"
                    defaultValue={hmLocal(date)}
                    className="w-full rounded-md border border-[var(--border)] px-2 py-1.5 text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-[var(--muted)]">Durée (min)</label>
                  <input
                    name="duree_minutes"
                    type="number"
                    defaultValue={rdv.duree_minutes ?? 60}
                    className="w-full rounded-md border border-[var(--border)] px-2 py-1.5 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-[var(--muted)]">Statut</label>
                  <select
                    name="statut"
                    defaultValue={rdv.statut}
                    className="w-full rounded-md border border-[var(--border)] px-2 py-1.5 text-sm"
                  >
                    {STATUTS_RDV.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-[var(--muted)]">Lieu</label>
                <input
                  name="lieu"
                  type="text"
                  defaultValue={rdv.lieu ?? ""}
                  className="w-full rounded-md border border-[var(--border)] px-2 py-1.5 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-[var(--muted)]">Note</label>
                <textarea
                  name="note"
                  defaultValue={rdv.note ?? ""}
                  rows={2}
                  className="w-full rounded-md border border-[var(--border)] px-2 py-1.5 text-sm"
                />
              </div>

              <div className="mt-1 flex items-center justify-between">
                <button
                  type="button"
                  onClick={onSupprimer}
                  disabled={isPending}
                  className="rounded-md border border-[var(--danger)] px-3 py-1.5 text-sm text-[var(--danger)] disabled:opacity-50"
                >
                  Supprimer
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={fermer}
                    className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-md bg-[var(--primary)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                  >
                    Enregistrer
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

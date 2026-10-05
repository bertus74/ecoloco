"use client";

import { useEffect, useState, useTransition } from "react";
import type { NiveauScore, Pack } from "@/lib/types";
import { qualifierProspect } from "./actions";

const NIVEAUX: { id: NiveauScore; label: string; actif: string }[] = [
  { id: "Froid", label: "Froid", actif: "border-slate-400 bg-slate-100 text-slate-700" },
  { id: "Tiede", label: "Tiède", actif: "border-[var(--warning)] bg-[var(--warning-light)] text-[var(--warning)]" },
  { id: "Chaud", label: "Chaud", actif: "border-[var(--danger)] bg-[var(--danger-light)] text-[var(--danger)]" },
];

const ETAPES = ["Appeler", "Relancer par email", "Planifier un RDV", "Envoyer un devis", "Aucune"];

export function QualificationModal({
  prospectId,
  packs,
  niveauInitial,
  packsInitiaux,
  dejaQualifie,
}: {
  prospectId: string;
  packs: Pack[];
  niveauInitial: NiveauScore | null;
  packsInitiaux: string[];
  dejaQualifie: boolean;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [niveau, setNiveau] = useState<NiveauScore>(niveauInitial ?? "Tiede");
  const [choisis, setChoisis] = useState<string[]>(packsInitiaux);
  const [note, setNote] = useState("");
  const [etape, setEtape] = useState(ETAPES[0]);
  const [date, setDate] = useState("");
  const [rgpd, setRgpd] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, startTransition] = useTransition();

  useEffect(() => {
    if (!ouvert) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOuvert(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ouvert]);

  const basculer = (id: string) =>
    setChoisis((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  const enregistrer = () =>
    startTransition(async () => {
      setErreur(null);
      try {
        await qualifierProspect(prospectId, {
          niveau,
          packs: choisis,
          note: note.trim(),
          prochaineEtape: etape === "Aucune" ? "" : etape,
          prochaineDate: etape === "Aucune" ? null : date || null,
          accordRgpd: rgpd,
        });
        setOuvert(false);
        setRgpd(false);
        setNote("");
      } catch (e) {
        setErreur(e instanceof Error ? e.message : "Enregistrement impossible");
      }
    });

  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="flex-1 rounded-md border border-[var(--primary)] bg-[var(--surface)] px-4 py-2 text-center text-sm font-medium text-[var(--primary)] hover:bg-[var(--primary-light)]"
      >
        {dejaQualifie ? "Requalifier" : "Qualifier"}
      </button>

      {ouvert ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOuvert(false)} />
          <div role="dialog" aria-modal="true" className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-[var(--surface)] p-6 shadow-xl">
            <h2 className="text-base font-medium">Qualifier le prospect</h2>

            <p className="mb-2 mt-5 text-xs font-medium text-[var(--muted)]">Niveau</p>
            <div className="grid grid-cols-3 gap-2">
              {NIVEAUX.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => setNiveau(n.id)}
                  className={`rounded-md border px-3 py-2 text-sm font-medium ${
                    niveau === n.id ? n.actif : "border-[var(--border)] text-[var(--muted)] hover:bg-[var(--background)]"
                  }`}
                >
                  {n.label}
                </button>
              ))}
            </div>

            <p className="mb-2 mt-5 text-xs font-medium text-[var(--muted)]">Packs pertinents</p>
            <div className="flex flex-col gap-1.5">
              {packs.map((p) => (
                <label key={p.id} className="flex cursor-pointer items-center gap-2.5 rounded-md border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--background)]">
                  <input type="checkbox" checked={choisis.includes(p.id)} onChange={() => basculer(p.id)} className="accent-[var(--primary)]" />
                  <span>{p.emoji}</span>
                  <span className="flex-1">{p.label}</span>
                </label>
              ))}
            </div>

            <p className="mb-2 mt-5 text-xs font-medium text-[var(--muted)]">Note</p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Contexte, besoins exprimés, objections…"
              className="w-full rounded-md border border-[var(--border)] px-2.5 py-1.5 text-sm outline-none focus:border-[var(--primary)]"
            />

            <p className="mb-2 mt-5 text-xs font-medium text-[var(--muted)]">Prochaine étape</p>
            <div className="flex gap-2">
              <select
                value={etape}
                onChange={(e) => setEtape(e.target.value)}
                className="flex-1 rounded-md border border-[var(--border)] px-2.5 py-1.5 text-sm"
              >
                {ETAPES.map((e) => (
                  <option key={e}>{e}</option>
                ))}
              </select>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={etape === "Aucune"}
                className="rounded-md border border-[var(--border)] px-2.5 py-1.5 text-sm disabled:opacity-50"
              />
            </div>

            <label className="mt-5 flex cursor-pointer items-start gap-2.5 rounded-md bg-[var(--background)] px-3 py-2.5 text-sm">
              <input type="checkbox" checked={rgpd} onChange={(e) => setRgpd(e.target.checked)} className="mt-0.5 accent-[var(--primary)]" />
              <span>
                Le prospect a donné son accord pour que ses données soient conservées et utilisées par Eco-Locaux
                (RGPD). <span className="text-[var(--danger)]">Obligatoire</span>
              </span>
            </label>

            {erreur ? <p className="mt-3 text-sm text-[var(--danger)]">{erreur}</p> : null}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOuvert(false)}
                className="rounded-md border border-[var(--border)] px-4 py-2 text-sm hover:bg-[var(--background)]"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={enregistrer}
                disabled={!rgpd || enCours}
                className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--primary-dark)] disabled:opacity-50"
              >
                {enCours ? "Enregistrement…" : "Enregistrer la qualification"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

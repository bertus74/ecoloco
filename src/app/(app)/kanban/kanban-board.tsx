"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { NiveauBadge } from "@/components/niveau-badge";
import { VenteDialog } from "@/components/vente-dialog";
import type { NiveauScore } from "@/lib/types";
import { deplacerProspect } from "./actions";
import { COLONNES_KANBAN, COULEURS_COLONNES } from "./colonnes";

export interface CarteKanban {
  id: number;
  nom: string;
  ville: string | null;
  score: number | null;
  niveau: NiveauScore | null;
  statut: string;
  montant: number | null;
}

export function KanbanBoard({
  cartesInitiales,
  totauxInitiaux,
}: {
  cartesInitiales: CarteKanban[];
  totauxInitiaux: Record<string, number>;
}) {
  const [cartes, setCartes] = useState(cartesInitiales);
  const [totaux, setTotaux] = useState(totauxInitiaux);
  const [dragId, setDragId] = useState<number | null>(null);
  const [survol, setSurvol] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [vente, setVente] = useState<CarteKanban | null>(null);
  const [, startTransition] = useTransition();

  // `montant` : undefined = pas encore demandé (on ouvre la fenêtre « Diagnostic vendu »), null = à saisir plus tard.
  const deposer = (statut: string, id: number, montant?: number | null) => {
    const carte = cartes.find((c) => c.id === id);
    if (!carte || carte.statut === statut) return;
    if (statut === "Diagnostic vendu" && montant === undefined) {
      setVente(carte);
      return;
    }
    const ancien = carte.statut;
    const ancienMontant = carte.montant;
    const appliquer = (de: string, vers: string, nouveauMontant: number | null) => {
      setCartes((cs) => cs.map((c) => (c.id === id ? { ...c, statut: vers, montant: nouveauMontant } : c)));
      setTotaux((t) => ({ ...t, [de]: t[de] - 1, [vers]: t[vers] + 1 }));
    };

    appliquer(ancien, statut, montant ?? ancienMontant); // mise à jour optimiste
    setErreur(null);
    startTransition(async () => {
      try {
        await deplacerProspect(id, statut, montant);
      } catch {
        appliquer(statut, ancien, ancienMontant);
        setErreur(`Impossible de déplacer « ${carte.nom} » — statut inchangé.`);
      }
    });
  };

  const totalSigne = cartes
    .filter((c) => c.statut === "Diagnostic vendu")
    .reduce((s, c) => s + (c.montant ?? 0), 0);

  return (
    <>
      {vente ? (
        <VenteDialog
          nomProspect={vente.nom}
          onAnnuler={() => setVente(null)}
          onConfirmer={(montant) => {
            deposer("Diagnostic vendu", vente.id, montant);
            setVente(null);
          }}
        />
      ) : null}
      {erreur ? (
        <p className="mb-3 rounded-md bg-[var(--danger-light)] px-3 py-2 text-sm text-[var(--danger)]">{erreur}</p>
      ) : null}
      {/* Hauteur bornée à la fenêtre : la barre de défilement horizontale reste visible en bas de l'écran,
          chaque colonne défile verticalement. */}
      <div className="kanban-scroll flex h-[calc(100vh-200px)] min-h-80 gap-3 overflow-x-auto pb-3">
        {COLONNES_KANBAN.map((col) => {
          const items = cartes.filter((c) => c.statut === col).sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
          const masques = totaux[col] - items.length;
          return (
            <section
              key={col}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (survol !== col) setSurvol(col);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setSurvol(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                const id = Number(e.dataTransfer.getData("text/plain") || dragId);
                if (id) deposer(col, id);
                setDragId(null);
                setSurvol(null);
              }}
              className={`flex max-h-full w-64 shrink-0 flex-col rounded-lg border transition-colors ${
                survol === col ? "border-[var(--primary)] bg-[var(--primary-light)]" : "border-transparent bg-[#eef0f3]"
              }`}
            >
              <div className="flex items-center gap-2 px-3 pb-2 pt-3">
                <span className="h-2 w-2 rounded-full" style={{ background: COULEURS_COLONNES[col] }} />
                <h2 className="text-sm font-medium">{col}</h2>
                <span className="rounded-full bg-[var(--surface)] px-1.5 text-xs tabular-nums text-[var(--muted)]">
                  {totaux[col]}
                </span>
                {col === "Diagnostic vendu" && totalSigne > 0 ? (
                  <span className="ml-auto text-xs font-medium tabular-nums text-[var(--primary-dark)]">
                    {totalSigne.toLocaleString("fr-FR")}&nbsp;€
                  </span>
                ) : null}
              </div>

              <div className="kanban-scroll flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
                {items.map((c) => (
                  <article
                    key={c.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", String(c.id));
                      e.dataTransfer.effectAllowed = "move";
                      setDragId(c.id);
                    }}
                    onDragEnd={() => {
                      setDragId(null);
                      setSurvol(null);
                    }}
                    className={`cursor-grab rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm active:cursor-grabbing ${
                      dragId === c.id ? "opacity-40" : ""
                    }`}
                  >
                    <Link href={`/prospect/${c.id}`} className="block text-sm font-medium leading-snug hover:underline" draggable={false}>
                      {c.nom}
                    </Link>
                    <p className="text-xs text-[var(--muted)]">{c.ville}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <NiveauBadge niveau={c.niveau} />
                      <span className="text-xs font-medium tabular-nums">{c.score ?? "—"}</span>
                    </div>
                    {c.statut === "Diagnostic vendu" ? (
                      <p className="mt-2 border-t border-[var(--border)] pt-2 text-xs">
                        <span className="text-[var(--muted)]">Contrat </span>
                        <span className="font-medium tabular-nums">
                          {c.montant != null ? `${c.montant.toLocaleString("fr-FR")}\u00a0€` : "montant à saisir"}
                        </span>
                      </p>
                    ) : null}
                  </article>
                ))}
                {items.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-[var(--border)] py-6 text-xs text-[var(--muted)]">
                    Déposer ici
                  </div>
                ) : null}
                {masques > 0 ? (
                  <p className="px-1 pt-1 text-center text-xs text-[var(--muted)]">+ {masques} autres</p>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { lancerProspection, type EtatLancement } from "./actions";

const PAYS_OPTIONS = [
  "France", "Allemagne", "Autriche", "Belgique", "Chypre", "Espagne", "Estonie",
  "Finlande", "Grèce", "Irlande", "Italie", "Lettonie", "Lituanie", "Luxembourg",
  "Malte", "Pays-Bas", "Portugal", "Slovaquie", "Slovénie",
];

const TYPES_COMMERCE = ["Boulangerie", "Charcuterie", "Traiteur", "Restaurant", "Pizzeria", "Poissonnerie", "Autre"];

type StatutSuivi = "encours" | "termine" | "erreur";

export function ScrapingForm() {
  const router = useRouter();
  const [etat, formAction, pending] = useActionState<EtatLancement, FormData>(lancerProspection, {});
  const [suivi, setSuivi] = useState<{ statut: StatutSuivi; nbLeads: number | null } | null>(null);
  const demandeSuivieRef = useRef<number | null>(null);

  useEffect(() => {
    if (!etat.demandeId || demandeSuivieRef.current === etat.demandeId) return;
    demandeSuivieRef.current = etat.demandeId;
    setSuivi({ statut: "encours", nbLeads: null });

    const supabase = createClient();
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("demandes_scraping")
        .select("statut, nb_leads_trouves")
        .eq("id", etat.demandeId!)
        .single();

      if (!data) return;
      if (data.statut === "Termine") {
        setSuivi({ statut: "termine", nbLeads: data.nb_leads_trouves ?? 0 });
        clearInterval(interval);
        router.refresh();
      } else if (data.statut === "Erreur") {
        setSuivi({ statut: "erreur", nbLeads: null });
        clearInterval(interval);
        router.refresh();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [etat.demandeId, router]);

  useEffect(() => {
    if (suivi?.statut !== "termine") return;
    const timeout = setTimeout(() => setSuivi(null), 3000);
    return () => clearTimeout(timeout);
  }, [suivi]);

  const popupOuverte = pending || suivi !== null || !!etat.erreur;

  return (
    <>
      <form action={formAction} className="mb-10 flex max-w-md flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm text-[var(--muted)]">Pays</label>
          <select
            name="pays"
            defaultValue="France"
            className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
          >
            {PAYS_OPTIONS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm text-[var(--muted)]">Code postal</label>
          <input
            name="code_postal"
            type="text"
            required
            placeholder="ex: 9000"
            className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-[var(--muted)]">Type de commerce</label>
          <select
            name="type_commerce"
            className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
          >
            {TYPES_COMMERCE.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm text-[var(--muted)]">Rayon de recherche (km)</label>
          <input
            name="rayon_km"
            type="range"
            min={1}
            max={20}
            defaultValue={2}
            className="w-full"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--primary-dark)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Demande en cours…" : "Lancer la recherche"}
        </button>

        {etat.erreur ? (
          <p className="text-sm text-[var(--danger)]">{etat.erreur}</p>
        ) : null}
      </form>

      {popupOuverte ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-lg bg-[var(--surface)] p-6 shadow-xl">
            {etat.erreur || suivi?.statut === "erreur" ? (
              <>
                <h2 className="mb-2 text-base font-medium text-[var(--danger)]">Erreur</h2>
                <p className="mb-4 text-sm text-[var(--muted)]">
                  {etat.erreur ?? "La recherche a échoué côté Apify. Réessayez ou contactez le support."}
                </p>
                <button
                  type="button"
                  onClick={() => setSuivi(null)}
                  className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm"
                >
                  Fermer
                </button>
              </>
            ) : suivi?.statut === "termine" ? (
              <>
                <h2 className="mb-2 text-base font-medium text-[var(--success)]">Recherche terminée</h2>
                <p className="text-sm text-[var(--muted)]">
                  {suivi.nbLeads ?? 0} prospect{(suivi.nbLeads ?? 0) === 1 ? "" : "s"} trouvé{(suivi.nbLeads ?? 0) === 1 ? "" : "s"}.
                </p>
              </>
            ) : (
              <>
                <h2 className="mb-3 text-base font-medium">Recherche en cours…</h2>
                <p className="mb-4 text-sm text-[var(--muted)]">
                  Apify explore Google Maps pour ce secteur. Cela peut prendre une à deux minutes.
                </p>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--background)]">
                  <div className="h-full w-1/3 animate-[avancer_1.4s_ease-in-out_infinite] rounded-full bg-[var(--primary)]" />
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        @keyframes avancer {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
          100% { transform: translateX(250%); }
        }
      `}</style>
    </>
  );
}

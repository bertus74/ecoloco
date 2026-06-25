import { createClient } from "@/lib/supabase/server";
import { ScrapingForm } from "./scraping-form";

function statutBadgeClass(statut: string) {
  if (statut === "Termine") return "bg-[var(--success-light)] text-[var(--success)]";
  if (statut === "Erreur") return "bg-[var(--danger-light)] text-[var(--danger)]";
  if (statut === "En cours") return "bg-[var(--primary-light)] text-[var(--primary-dark)]";
  return "bg-[var(--background)] text-[var(--muted)]";
}

export default async function ScrapingPage() {
  const supabase = await createClient();
  const { data: recherches } = await supabase
    .from("demandes_scraping")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div>
      <h1 className="mb-1 text-xl font-medium">Lancer une prospection</h1>
      <p className="mb-6 text-sm text-[var(--muted)]">
        Recherche un nouveau lot de prospects via Google Maps.
      </p>

      <ScrapingForm />

      <div className="border-t border-[var(--border)] pt-5">
        <h2 className="mb-3 text-base font-medium">Dernières recherches</h2>
        <div className="flex flex-col gap-2">
          {(recherches ?? []).length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Aucune recherche pour le moment.</p>
          ) : (
            recherches!.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 rounded-md bg-[var(--background)] px-4 py-2.5 text-sm"
              >
                <span className={`rounded-md px-2 py-0.5 text-xs ${statutBadgeClass(r.statut)}`}>
                  {r.statut}
                </span>
                <span className="flex-1">
                  {r.type_commerce} · {r.code_postal} ({r.pays})
                </span>
                <span className="text-[var(--muted)]">
                  {r.statut === "Termine" ? `${r.nb_leads_trouves} résultats` : ""}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

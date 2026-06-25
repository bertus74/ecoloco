import { createClient } from "@/lib/supabase/server";
import { lancerProspection } from "./actions";
import { SubmitButton } from "./submit-button";

const PAYS_OPTIONS = [
  "France", "Allemagne", "Autriche", "Belgique", "Chypre", "Espagne", "Estonie",
  "Finlande", "Grèce", "Irlande", "Italie", "Lettonie", "Lituanie", "Luxembourg",
  "Malte", "Pays-Bas", "Portugal", "Slovaquie", "Slovénie",
];

const TYPES_COMMERCE = ["Boulangerie", "Charcuterie", "Traiteur", "Restaurant", "Pizzeria", "Poissonnerie", "Autre"];

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

      <form action={lancerProspection} className="mb-10 flex max-w-md flex-col gap-4">
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

        <SubmitButton />
      </form>

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

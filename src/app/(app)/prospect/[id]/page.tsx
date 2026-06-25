import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Commerc, Interaction } from "@/lib/types";
import {
  addInteraction,
  changerCommercial,
  changerStatut,
  reporterRelance,
  updateContact,
} from "./actions";
import { InlineSelect } from "./inline-select";

const STATUTS = [
  "Nouveau", "Contacté", "Intéressé", "RDV planifié", "Diagnostic vendu", "Perdu", "Blacklist",
];

interface ScoreDetail {
  type?: number;
  note?: number;
  surface?: number;
  avis?: number;
  categorie?: string;
}

function joursSans(date: string | null) {
  if (!date) return null;
  return Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
}

export default async function ProspectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: prospect } = await supabase
    .from("commerc")
    .select("*")
    .eq("id", id)
    .single<Commerc>();

  if (!prospect) notFound();

  const { data: scoringLog } = await supabase
    .from("scoring_log")
    .select("*")
    .eq("commerc_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: interactions } = await supabase
    .from("interactions")
    .select("*")
    .eq("commerc_id", id)
    .order("created_at", { ascending: false })
    .returns<Interaction[]>();

  const { data: auth } = await supabase.auth.getUser();
  let isDg = false;
  if (auth.user) {
    const { data: profile } = await supabase
      .from("commerciaux")
      .select("role")
      .eq("auth_user_id", auth.user.id)
      .single();
    isDg = profile?.role === "dg";
  }

  const { data: commerciaux } = isDg
    ? await supabase.from("commerciaux").select("id, Nom, Prénom").eq("role", "commercial")
    : { data: null };

  const detail = (scoringLog?.detail ?? {}) as ScoreDetail;
  const jours = joursSans(prospect.derniere_interaction);
  const mapsQuery = encodeURIComponent(
    `${prospect.Adresse ?? ""} ${prospect.Ville ?? ""} ${prospect.pays ?? ""}`,
  );

  const updateContactBound = updateContact.bind(null, id);
  const addInteractionBound = addInteraction.bind(null, id);
  const reporterRelanceBound = reporterRelance.bind(null, id, prospect.nb_reports_relance);
  const changerStatutBound = changerStatut.bind(null, id);
  const changerCommercialBound = changerCommercial.bind(null, id);

  return (
    <div className="max-w-3xl">
      <Link href="/pipeline" className="mb-4 inline-block text-sm text-[var(--muted)]">
        ← Retour au pipeline
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-medium">{prospect.Nom}</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {prospect.Adresse}, {prospect.Ville}{prospect.pays ? `, ${prospect.pays}` : ""}
          </p>
        </div>
        <span className="rounded-md bg-[var(--danger-light)] px-3 py-1 text-sm font-medium text-[var(--danger)]">
          Score {prospect.Score_Energ ?? "—"} · {prospect.Niveau ?? "—"}
        </span>
      </div>

      {jours !== null && jours >= 10 ? (
        <div className="mb-5 flex items-center gap-3 rounded-md bg-[var(--warning-light)] px-4 py-2.5">
          <span className="text-sm text-[var(--warning)]">
            Sans contact depuis {jours} jours
          </span>
          <form action={reporterRelanceBound} className="ml-auto">
            <button
              type="submit"
              disabled={prospect.nb_reports_relance >= 3}
              className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs disabled:opacity-50"
            >
              Reporter 10j ({prospect.nb_reports_relance}/3)
            </button>
          </form>
        </div>
      ) : null}

      <div className="mb-5 grid grid-cols-[1.3fr_1fr] gap-4">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="mb-3 text-base font-medium">Argumentaire commercial</h2>
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td className="py-1.5 text-[var(--muted)]">CA potentiel</td>
                <td className="py-1.5 text-right font-medium">
                  {prospect.ca_potentiel != null ? `${prospect.ca_potentiel.toLocaleString("fr-FR")} €` : "—"}
                </td>
              </tr>
              <tr>
                <td className="py-1.5 text-[var(--muted)]">Montant devis</td>
                <td className="py-1.5 text-right font-medium">
                  {prospect.montant_devis != null ? `${prospect.montant_devis.toLocaleString("fr-FR")} €` : "—"}
                </td>
              </tr>
              <tr>
                <td className="py-1.5 text-[var(--muted)]">Surface</td>
                <td className="py-1.5 text-right font-medium">
                  {prospect.surface != null ? `${prospect.surface} m²` : "Inconnue"}
                </td>
              </tr>
              <tr>
                <td className="py-1.5 text-[var(--muted)]">Note Google</td>
                <td className="py-1.5 text-right font-medium">
                  {prospect.note_google ?? "—"} ({prospect.Nbre_Avis ?? 0} avis)
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="mb-3 text-base font-medium">Détail du score</h2>
          {scoringLog ? (
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between"><span className="text-[var(--muted)]">Type commerce</span><span>{detail.type ?? "—"}/40</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted)]">Note Google</span><span>{detail.note ?? "—"}/20</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted)]">Surface</span><span>{detail.surface ?? "—"}/25</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted)]">Avis</span><span>{detail.avis ?? "—"}/15</span></div>
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)]">Pas encore scoré.</p>
          )}
        </div>
      </div>

      <div className="mb-5 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-medium">Coordonnées</h2>
          <form action={updateContactBound} className="flex items-center gap-2 text-sm">
            <input
              name="tel"
              defaultValue={prospect.Tel ?? ""}
              placeholder="Téléphone"
              className="w-32 rounded-md border border-[var(--border)] px-2 py-1 text-sm"
            />
            <input
              name="email"
              defaultValue={prospect.email ?? ""}
              placeholder="Email"
              className="w-44 rounded-md border border-[var(--border)] px-2 py-1 text-sm"
            />
            <input
              name="url"
              defaultValue={prospect.URL ?? ""}
              placeholder="Site web"
              className="w-44 rounded-md border border-[var(--border)] px-2 py-1 text-sm"
            />
            <button
              type="submit"
              className="rounded-md bg-[var(--primary)] px-3 py-1 text-white"
            >
              Enregistrer
            </button>
          </form>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-[var(--muted)]">Statut :</span>
            <InlineSelect
              defaultValue={prospect.statut_prospect ?? "Nouveau"}
              options={STATUTS.map((s) => ({ value: s, label: s }))}
              onChangeValue={changerStatutBound}
            />
          </div>
          {isDg && commerciaux ? (
            <div className="flex items-center gap-2">
              <span className="text-[var(--muted)]">Commercial :</span>
              <InlineSelect
                defaultValue={String(prospect.commercial_id ?? "")}
                options={commerciaux.map((c) => ({
                  value: String(c.id),
                  label: `${c.Prénom} ${c.Nom}`,
                }))}
                onChangeValue={changerCommercialBound}
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className="mb-5 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-medium">Localisation</h2>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-[var(--primary)]"
          >
            Ouvrir dans Google Maps →
          </a>
        </div>
        <div className="flex h-32 items-center justify-center rounded-md bg-[var(--background)] text-sm text-[var(--muted)]">
          Carte non disponible (clé API Maps à configurer)
        </div>
      </div>

      <div className="mb-5 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="mb-3 text-base font-medium">Historique des démarches</h2>

        <form action={addInteractionBound} className="mb-4 flex items-center gap-2">
          <select
            name="type_interaction"
            className="rounded-md border border-[var(--border)] px-2 py-1.5 text-sm"
          >
            <option value="Appel">Appel</option>
            <option value="Email">Email</option>
            <option value="Visite">Visite</option>
            <option value="RDV">RDV</option>
            <option value="Note">Note</option>
            <option value="Autre">Autre</option>
          </select>
          <input
            name="note"
            placeholder="Note (optionnel)"
            className="flex-1 rounded-md border border-[var(--border)] px-2 py-1.5 text-sm"
          />
          <button
            type="submit"
            className="rounded-md bg-[var(--primary)] px-3 py-1.5 text-sm text-white"
          >
            Ajouter
          </button>
        </form>

        <div className="flex flex-col gap-2 text-sm">
          {(interactions ?? []).length === 0 ? (
            <p className="text-[var(--muted)]">Aucune démarche enregistrée.</p>
          ) : (
            interactions!.map((it) => (
              <div key={it.id} className="flex gap-3 border-t border-[var(--border)] pt-2 first:border-0 first:pt-0">
                <span className="min-w-20 text-[var(--muted)]">
                  {new Date(it.created_at).toLocaleDateString("fr-FR")}
                </span>
                <span className="min-w-16 font-medium">{it.type_interaction}</span>
                <span className="text-[var(--muted)]">{it.note}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <Link
          href={`/calendrier?prospect=${id}`}
          className="flex-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-center text-sm hover:bg-[var(--background)]"
        >
          Planifier un RDV
        </Link>
        <Link
          href={`/prospect/${id}/email`}
          className="flex-1 rounded-md bg-[var(--primary)] px-4 py-2 text-center text-sm font-medium text-white hover:bg-[var(--primary-dark)]"
        >
          Générer l&apos;email
        </Link>
      </div>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AideCee, CasClient, Commerc, Commercial, Interaction, Pack } from "@/lib/types";
import { niveauAffiche, packsDuProspect } from "@/lib/packs";
import { QualificationModal } from "./qualification-modal";
import { calculerArgumentaire } from "@/lib/argumentaire";
import { NiveauBadge } from "@/components/niveau-badge";
import { SECTEURS, euros, factureEstimee, secteurDe } from "@/lib/secteurs";
import {
  addInteraction,
  changerCommercial,
  changerStatut,
  reporterRelance,
  updateContact,
} from "./actions";
import { InlineSelect } from "./inline-select";

const STATUTS = [
  "À valider", "Nouveau", "Contacté", "Intéressé", "RDV planifié", "Diagnostic vendu", "Perdu", "Blacklist",
];

interface ScoreDetail {
  type?: number;
  note?: number;
  surface?: number;
  avis?: number;
  /** Bonus de l'étiquette DPE (algo v2) : G +10 … A −5. */
  dpe?: number;
  etiquette_dpe?: string | null;
  categorie?: string;
}

// Couleurs officielles de l'échelle DPE.
const COULEURS_DPE: Record<string, string> = {
  A: "#009C6D", B: "#52B153", C: "#A5CC74", D: "#F4E70F", E: "#F0B40F", F: "#EB8235", G: "#D7221F",
};

const LIBELLES_STATUT_DPE: Record<string, string> = {
  vierge: "DPE sans étiquette",
  aucun: "Aucun DPE tertiaire à cette adresse",
  "adresse imprécise": "Adresse trop imprécise pour chercher",
};

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

  const secteur = secteurDe(prospect.Cat_scraping);

  const { data: aidesToutes } = await supabase.from("aides_cee").select("*").returns<AideCee[]>();
  const { data: aides } = await supabase
    .from("aides_cee")
    .select("*")
    .contains("secteurs", [secteur])
    .order("montant_max", { ascending: false })
    .returns<AideCee[]>();

  const { data: casSimilaires } = await supabase
    .from("cas_clients")
    .select("*")
    .eq("secteur", secteur)
    .order("economies_annuelles", { ascending: false })
    .limit(1)
    .returns<CasClient[]>();
  const cas = casSimilaires?.[0] ?? null;

  const { data: tousPacks } = await supabase.from("packs").select("*").order("ordre").returns<Pack[]>();
  const { packs: packsAffiches, qualifies: packsQualifies } = packsDuProspect(prospect, tousPacks ?? []);

  const argu = calculerArgumentaire(prospect, tousPacks ?? [], aidesToutes ?? []);
  const departement = (prospect.departement ?? "").padStart(2, "0");
  const aidesLocales = (aides ?? []).filter(
    (a) => argu.aidesApplicables && (!a.departements || a.departements.includes(departement)),
  );

  const totalCee = aidesLocales.filter((a) => a.est_cee).reduce((s, a) => s + (a.montant_max ?? 0), 0);

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
    ? await supabase
        .from("commerciaux")
        .select("*")
        .eq("role", "commercial")
        .returns<Commercial[]>()
    : { data: null };

  const rawDetail = scoringLog?.detail;
  const detail = (
    typeof rawDetail === "string" ? JSON.parse(rawDetail) : rawDetail ?? {}
  ) as ScoreDetail;
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
    <div className="max-w-4xl">
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
        <div className="flex flex-col items-end gap-1.5">
          <span className="text-2xl font-medium tabular-nums">
            {prospect.Score_Energ ?? "—"}
            <span className="text-sm text-[var(--muted)]">/100</span>
          </span>
          <NiveauBadge niveau={niveauAffiche(prospect)} />
          {prospect.qualifie_le ? (
            <span className="text-xs text-[var(--muted)]">
              Qualifié le {new Date(prospect.qualifie_le).toLocaleDateString("fr-FR")}
            </span>
          ) : null}
        </div>
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
                <td className="py-1.5 text-[var(--muted)]">Secteur</td>
                <td className="py-1.5 text-right font-medium">{SECTEURS[secteur].label}</td>
              </tr>
              <tr>
                <td className="py-1.5 text-[var(--muted)]">Facture énergie estimée</td>
                <td className="py-1.5 text-right font-medium">{euros(factureEstimee(prospect))}/an</td>
              </tr>
              <tr>
                <td className="py-1.5 text-[var(--muted)]">CA potentiel (Eco-Locaux)</td>
                <td className="py-1.5 text-right font-medium">
                  {prospect.devis_potentiel != null ? `${prospect.devis_potentiel.toLocaleString("fr-FR")} €` : "—"}
                </td>
              </tr>
              <tr>
                <td className="py-1.5 text-[var(--muted)]">Économies estimées (prospect)</td>
                <td className="py-1.5 text-right font-medium">
                  {prospect.ca_potentiel != null ? `${prospect.ca_potentiel.toLocaleString("fr-FR")} €/an` : "—"}
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
                <td className="py-1.5 align-top text-[var(--muted)]">DPE tertiaire (ADEME)</td>
                <td className="py-1.5 text-right font-medium">
                  <DpeResume prospect={prospect} />
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
            <div className="flex flex-col gap-3 text-sm">
              <ScoreBarre label="Type de commerce" valeur={detail.type} max={40} />
              <ScoreBarre label="Note Google" valeur={detail.note} max={20} />
              <ScoreBarre label="Surface" valeur={detail.surface} max={25} />
              <ScoreBarre label="Nombre d'avis" valeur={detail.avis} max={15} />
              {detail.dpe ? (
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Bonus DPE (étiquette {detail.etiquette_dpe})</span>
                  <span className={`font-medium tabular-nums ${detail.dpe > 0 ? "text-[var(--danger)]" : "text-[var(--primary)]"}`}>
                    {detail.dpe > 0 ? `+${detail.dpe}` : detail.dpe}
                  </span>
                </div>
              ) : null}
              <p className="border-t border-[var(--border)] pt-2 text-xs text-[var(--muted)]">
                Calcul WF-04 — type 40 + note 20 + surface 25 + avis 15, bonus DPE de −5 (A) à +10 (G)
              </p>
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)]">Pas encore scoré.</p>
          )}
        </div>
      </div>

      <div className="mb-5 rounded-lg border border-[var(--primary)] bg-[var(--primary-light)] p-5">
        <h2 className="mb-3 text-base font-medium text-[var(--primary-dark)]">Argumentaire chiffré</h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-4">
          <Chiffre label="Économies estimées" valeur={`${euros(argu.economiesAnnuelles)}/an`} fort />
          <Chiffre label="Facture actuelle estimée" valeur={`${euros(argu.factureAnnuelle)}/an`} />
          <Chiffre label="Investissement (à partir de)" valeur={`${euros(argu.investissement)} HT`} />
          <Chiffre
            label={argu.aidesApplicables ? "Primes CEE mobilisables" : "Primes CEE"}
            valeur={argu.aidesApplicables ? `jusqu'à ${euros(argu.primesCee)}` : "non applicable"}
          />
          <Chiffre label="Reste à charge estimé" valeur={euros(argu.resteACharge)} fort={argu.resteACharge === 0} />
          <Chiffre label="Retour sur investissement" valeur={argu.roiMois ? `~${argu.roiMois} mois` : "—"} />
          <div className="col-span-2">
            <p className="text-xs text-[var(--primary-dark)]/70">Packs {packsQualifies ? "retenus" : "recommandés"}</p>
            <p className="font-medium text-[var(--primary-dark)]">{argu.packs.map((k) => `${k.emoji} ${k.label}`).join(" + ") || "—"}</p>
          </div>
        </div>
        {argu.autresAides.length > 0 ? (
          <p className="mt-3 text-xs text-[var(--primary-dark)]">
            Également mobilisables : {argu.autresAides.map((a) => `${a.label} (jusqu'à ${euros(a.montant_max)})`).join(", ")}.
          </p>
        ) : null}
      </div>

      <div className="mb-5 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-base font-medium">{packsQualifies ? "Packs retenus" : "Packs éligibles"}</h2>
          <span className="text-xs text-[var(--muted)]">
            {packsQualifies ? "Choisis à la qualification" : `D'après le secteur ${SECTEURS[secteur].label.toLowerCase()}`}
          </span>
        </div>
        {packsAffiches.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Aucun pack.</p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
            {packsAffiches.map((k) => (
              <div key={k.id} className="rounded-md border border-[var(--border)] p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">
                    {k.emoji} {k.label}
                  </p>
                  {k.badge ? (
                    <span className="shrink-0 rounded-full bg-[var(--background)] px-2 py-0.5 text-[10px] text-[var(--muted)]">{k.badge}</span>
                  ) : null}
                </div>
                {k.description ? <p className="mt-1 text-xs text-[var(--muted)]">{k.description}</p> : null}
                <p className="mt-2 text-sm">
                  <span className="text-xs text-[var(--muted)]">à partir de </span>
                  <span className="font-medium tabular-nums">{euros(k.prix)} HT</span>
                </p>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  {[k.roi_mois ? `ROI ${k.roi_mois} mois` : null, k.gain, k.duree_travaux_jours ? `${k.duree_travaux_jours} j de travaux` : null]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            ))}
          </div>
        )}
        {packsAffiches.some((k) => k.exemple) ? (
          <p className="mt-3 text-xs text-[var(--warning)]">Prix et ROI provisoires — à valider par la direction.</p>
        ) : null}
        {prospect.prochaine_etape ? (
          <p className="mt-3 border-t border-[var(--border)] pt-3 text-sm">
            <span className="text-[var(--muted)]">Prochaine étape : </span>
            {prospect.prochaine_etape}
            {prospect.prochaine_relance_le
              ? ` — ${new Date(prospect.prochaine_relance_le).toLocaleDateString("fr-FR")}`
              : ""}
          </p>
        ) : null}
      </div>

      <div className="mb-5 grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-base font-medium">Aides éligibles</h2>
          <p className="mb-3 text-xs text-[var(--muted)]">
            Primes CEE cumulables jusqu&apos;à {euros(totalCee)} — montants plafonds indicatifs
          </p>
          {aidesLocales.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              {argu.aidesApplicables ? "Aucune aide référencée pour ce secteur." : "Aides françaises non applicables hors de France."}
            </p>
          ) : (
            <ul className="flex flex-col text-sm">
              {aidesLocales.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 border-t border-[var(--border)] py-2 first:border-0">
                  <span className="flex items-center gap-2">
                    {a.label}
                    {a.est_cee ? (
                      <span className="rounded bg-[var(--primary-light)] px-1.5 text-[10px] font-medium text-[var(--primary-dark)]">CEE</span>
                    ) : null}
                  </span>
                  <span className="tabular-nums text-[var(--muted)]">≤ {euros(a.montant_max)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="mb-3 text-base font-medium">Cas client similaire</h2>
          {cas ? (
            <div className="flex flex-col gap-2 text-sm">
              <p className="font-medium">
                {cas.nom}
                <span className="font-normal text-[var(--muted)]"> · {cas.ville}</span>
              </p>
              <p>
                <span className="font-medium tabular-nums">{euros(cas.economies_annuelles)}</span>/an économisés
                {cas.roi_mois ? ` · ROI ${cas.roi_mois} mois` : ""}
              </p>
              {cas.actions.length > 0 ? (
                <p className="text-xs text-[var(--muted)]">{cas.actions.join(" · ")}</p>
              ) : null}
              {cas.temoignage ? <p className="text-xs italic text-[var(--muted)]">« {cas.temoignage} »</p> : null}
              {cas.exemple ? (
                <p className="mt-1 rounded-md bg-[var(--warning-light)] px-2 py-1 text-xs text-[var(--warning)]">
                  Cas d&apos;exemple issu de la maquette — à remplacer par un vrai client.
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)]">Aucun cas client pour ce secteur.</p>
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
        {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? (
          <iframe
            className="h-56 w-full rounded-md border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${mapsQuery}`}
          />
        ) : (
          <div className="flex h-32 items-center justify-center rounded-md bg-[var(--background)] text-sm text-[var(--muted)]">
            Carte non disponible (clé API Maps à configurer)
          </div>
        )}
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
        <QualificationModal
          prospectId={id}
          packs={tousPacks ?? []}
          niveauInitial={niveauAffiche(prospect)}
          packsInitiaux={packsAffiches.map((k) => k.id)}
          dejaQualifie={!!prospect.qualifie_le}
        />
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

function DpeResume({
  prospect,
}: {
  prospect: Pick<Commerc, "dpe_statut" | "dpe_etiquette" | "dpe_conso_ep_m2" | "dpe_periode_construction" | "dpe_date">;
}) {
  if (!prospect.dpe_statut) return <span className="text-[var(--muted)]">Pas encore vérifié</span>;
  const details = [
    prospect.dpe_conso_ep_m2 != null ? `${Math.round(prospect.dpe_conso_ep_m2)} kWhep/m²/an` : null,
    prospect.dpe_periode_construction ? `construit ${prospect.dpe_periode_construction}` : null,
    prospect.dpe_date ? `DPE du ${new Date(prospect.dpe_date).toLocaleDateString("fr-FR")}` : null,
  ].filter(Boolean);
  return (
    <div className="flex flex-col items-end gap-0.5">
      {prospect.dpe_etiquette ? (
        <span
          className="rounded px-2 py-0.5 text-xs font-semibold"
          style={{
            background: COULEURS_DPE[prospect.dpe_etiquette],
            color: ["C", "D"].includes(prospect.dpe_etiquette) ? "#1f2937" : "#fff",
          }}
        >
          Étiquette {prospect.dpe_etiquette}
        </span>
      ) : (
        <span className="text-[var(--muted)]">{LIBELLES_STATUT_DPE[prospect.dpe_statut] ?? prospect.dpe_statut}</span>
      )}
      {details.length ? <span className="text-xs font-normal text-[var(--muted)]">{details.join(" · ")}</span> : null}
    </div>
  );
}

function ScoreBarre({ label, valeur, max }: { label: string; valeur?: number; max: number }) {
  const v = valeur ?? 0;
  return (
    <div>
      <div className="mb-1 flex justify-between">
        <span className="text-[var(--muted)]">{label}</span>
        <span className="tabular-nums">
          {valeur ?? "—"}/{max}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--background)]">
        <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${Math.min(100, (v / max) * 100)}%` }} />
      </div>
    </div>
  );
}

function Chiffre({ label, valeur, fort = false }: { label: string; valeur: string; fort?: boolean }) {
  return (
    <div>
      <p className="text-xs text-[var(--primary-dark)]/70">{label}</p>
      <p className={`tabular-nums text-[var(--primary-dark)] ${fort ? "text-lg font-semibold" : "font-medium"}`}>{valeur}</p>
    </div>
  );
}

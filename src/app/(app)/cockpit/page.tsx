import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Commerc, Commercial, Interaction, Pack, Rdv } from "@/lib/types";
import { SECTEURS, secteurDe } from "@/lib/secteurs";
import { BarresGroupees, Camembert, COULEURS_PACKS, Courbes, SERIES_COULEURS } from "./charts";

const NB_SEMAINES = 8;

// Lundi (heure locale) de la semaine contenant `d`, au format AAAA-MM-JJ.
function lundiDe(d: Date) {
  const l = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  l.setDate(l.getDate() - ((l.getDay() + 6) % 7));
  return `${l.getFullYear()}-${String(l.getMonth() + 1).padStart(2, "0")}-${String(l.getDate()).padStart(2, "0")}`;
}

const STATUTS_ORDRE = [
  "Nouveau", "Contacté", "Intéressé", "RDV planifié", "Diagnostic vendu", "Perdu", "Blacklist",
];

export default async function CockpitPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: profile } = await supabase
    .from("commerciaux")
    .select("*")
    .eq("auth_user_id", auth.user.id)
    .single<Commercial>();

  if (profile?.role !== "dg") redirect("/pipeline");

  const { data: prospects } = await supabase
    .from("commerc")
    .select("*")
    .not("statut_prospect", "in", '("Perdu","Blacklist","À valider")')
    .returns<Commerc[]>();

  const { data: commerciaux } = await supabase
    .from("commerciaux")
    .select("*")
    .eq("role", "commercial")
    .returns<Commercial[]>();

  const { data: tousProspects } = await supabase
    .from("commerc")
    .select("Cat_scraping, Niveau, statut_prospect")
    .neq("statut_prospect", "À valider")
    .returns<Pick<Commerc, "Cat_scraping" | "Niveau" | "statut_prospect">[]>();

  const { data: interactions } = await supabase
    .from("interactions")
    .select("commercial_id, date_interaction, created_at")
    .returns<Pick<Interaction, "commercial_id" | "date_interaction" | "created_at">[]>();

  const { data: rdvs } = await supabase
    .from("rdv")
    .select("commercial_id, statut, created_at")
    .returns<Pick<Rdv, "commercial_id" | "statut" | "created_at">[]>();

  const list = prospects ?? [];
  const enCours = list.filter((p) => p.statut_prospect !== "Diagnostic vendu");
  const ventes = list.filter((p) => p.statut_prospect === "Diagnostic vendu");
  const caSigneTotal = ventes.reduce((sum, p) => sum + (p.montant_devis ?? 0), 0);
  const ventesSansMontant = ventes.filter((p) => p.montant_devis == null).length;
  const caPotentielTotal = list.reduce((sum, p) => sum + (p.devis_potentiel ?? 0), 0);

  const parCommercial = (commerciaux ?? []).map((c) => {
    const leads = list.filter((p) => p.commercial_id === c.id);
    return {
      commercial: c,
      leadsActifs: leads.filter((p) => p.statut_prospect !== "Diagnostic vendu").length,
      caPotentiel: leads.reduce((sum, p) => sum + (p.devis_potentiel ?? 0), 0),
      devisVendus: leads.filter((p) => p.statut_prospect === "Diagnostic vendu").length,
      caSigne: leads
        .filter((p) => p.statut_prospect === "Diagnostic vendu")
        .reduce((sum, p) => sum + (p.montant_devis ?? 0), 0),
    };
  });

  // KPIs par commercial
  const kpiCommerciaux = (commerciaux ?? []).map((c) => {
    const leads = list.filter((p) => p.commercial_id === c.id);
    return {
      nom: `${c.Prénom ?? ""} ${c.Nom ?? ""}`.trim(),
      contactes: leads.filter((p) => p.statut_prospect !== "Nouveau").length,
      interactions: (interactions ?? []).filter((i) => i.commercial_id === c.id).length,
      rdv: (rdvs ?? []).filter((r) => r.commercial_id === c.id && r.statut !== "Annulé").length,
      vendus: leads.filter((p) => p.statut_prospect === "Diagnostic vendu").length,
    };
  });

  // Pipeline par semaine (8 dernières semaines)
  const semaines: string[] = [];
  for (let i = NB_SEMAINES - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    semaines.push(lundiDe(d));
  }
  const parSemaine = (dates: (string | null)[]) =>
    semaines.map((s) => dates.filter((d) => d && lundiDe(new Date(d)) === s).length);
  const { data: valides } = await supabase
    .from("commerc")
    .select("valide_le")
    .gte("valide_le", semaines[0])
    .returns<Pick<Commerc, "valide_le">[]>();
  const libellesSemaines = semaines.map((s) =>
    new Date(`${s}T00:00:00`).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
  );

  // Répartition par secteur
  const parSecteur = new Map<string, { total: number; chauds: number }>();
  for (const p of tousProspects ?? []) {
    const label = SECTEURS[secteurDe(p.Cat_scraping)].label;
    const e = parSecteur.get(label) ?? { total: 0, chauds: 0 };
    e.total += 1;
    if (p.Niveau === "Chaud") e.chauds += 1;
    parSecteur.set(label, e);
  }
  const secteursTries = [...parSecteur.entries()].sort((a, b) => b[1].total - a[1].total);

  // CA par pack : montant des diagnostics vendus, réparti à parts égales entre les packs retenus.
  const { data: packs } = await supabase.from("packs").select("*").order("ordre").returns<Pack[]>();
  const caParPack = new Map<string, number>();
  for (const p of list.filter((x) => x.statut_prospect === "Diagnostic vendu" && x.montant_devis)) {
    const ids = p.packs_pertinents?.length ? p.packs_pertinents : ["sans_pack"];
    for (const id of ids) caParPack.set(id, (caParPack.get(id) ?? 0) + p.montant_devis! / ids.length);
  }
  const lignesPacks = [
    ...(packs ?? []).map((k) => ({ id: k.id, label: `${k.emoji} ${k.label}` })),
    { id: "sans_pack", label: "Sans pack renseigné" },
  ]
    .map((l) => ({ ...l, ca: Math.round(caParPack.get(l.id) ?? 0) }))
    .filter((l) => l.ca > 0);
  const caTotalPacks = lignesPacks.reduce((s, l) => s + l.ca, 0);

  const statutCounts = STATUTS_ORDRE.map(
    (s) => list.filter((p) => p.statut_prospect === s).length,
  );
  const statutLabelsAvecDonnees = STATUTS_ORDRE.filter((_, i) => statutCounts[i] > 0);
  const statutCountsAvecDonnees = statutCounts.filter((c) => c > 0);

  return (
    <div>
      <h1 className="mb-5 text-xl font-medium">Cockpit direction</h1>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <div className="rounded-md bg-[var(--surface)] border border-[var(--border)] p-4">
          <p className="mb-1 text-xs text-[var(--muted)]">Leads en cours</p>
          <p className="text-2xl font-medium">{enCours.length}</p>
        </div>
        <div className="rounded-md bg-[var(--surface)] border border-[var(--border)] p-4">
          <p className="mb-1 text-xs text-[var(--muted)]">CA potentiel</p>
          <p className="text-2xl font-medium">
            {caPotentielTotal.toLocaleString("fr-FR")}&nbsp;€
          </p>
        </div>
        <div className="rounded-md bg-[var(--surface)] border border-[var(--border)] p-4">
          <p className="mb-1 text-xs text-[var(--muted)]">Devis vendus</p>
          <p className="text-2xl font-medium">{ventes.length}</p>
        </div>
        <div className="rounded-md bg-[var(--surface)] border border-[var(--border)] p-4">
          <p className="mb-1 text-xs text-[var(--muted)]">CA signé</p>
          <p className="text-2xl font-medium text-[var(--primary-dark)]">
            {caSigneTotal.toLocaleString("fr-FR")}&nbsp;€
          </p>
          {ventesSansMontant > 0 ? (
            <p className="mt-1 text-xs text-[var(--warning)]">
              {ventesSansMontant} vente{ventesSansMontant > 1 ? "s" : ""} sans montant
            </p>
          ) : null}
        </div>
        <div className="rounded-md bg-[var(--surface)] border border-[var(--border)] p-4">
          <p className="mb-1 text-xs text-[var(--muted)]">Total prospects</p>
          <p className="text-2xl font-medium">{list.length}</p>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="mb-3 text-base font-medium">Performance par commercial</h2>
        <div className="grid grid-cols-5 gap-0 border-b border-[var(--border)] pb-2 text-xs text-[var(--muted)]">
          <div>Commercial</div>
          <div>Leads actifs</div>
          <div>CA potentiel</div>
          <div>Devis vendus</div>
          <div>CA signé</div>
        </div>
        {parCommercial.map(({ commercial, leadsActifs, caPotentiel, devisVendus, caSigne }) => (
          <div
            key={commercial.id}
            className="grid grid-cols-5 gap-0 border-b border-[var(--border)] py-3 text-sm last:border-0"
          >
            <div>{commercial.Prénom} {commercial.Nom}</div>
            <div>{leadsActifs}</div>
            <div className="font-medium">{caPotentiel.toLocaleString("fr-FR")} €</div>
            <div>{devisVendus}</div>
            <div className="font-medium">{caSigne.toLocaleString("fr-FR")} €</div>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-base font-medium">KPIs par commercial</h2>
        <p className="mb-3 text-xs text-[var(--muted)]">Prospects contactés, démarches, RDV et diagnostics vendus</p>
        <BarresGroupees
          ariaLabel="KPIs par commercial : contactés, démarches, RDV, vendus"
          labels={kpiCommerciaux.map((k) => k.nom)}
          series={[
            { label: "Contactés", data: kpiCommerciaux.map((k) => k.contactes), color: SERIES_COULEURS[0] },
            { label: "Démarches", data: kpiCommerciaux.map((k) => k.interactions), color: SERIES_COULEURS[1] },
            { label: "RDV", data: kpiCommerciaux.map((k) => k.rdv), color: SERIES_COULEURS[2] },
            { label: "Vendus", data: kpiCommerciaux.map((k) => k.vendus), color: SERIES_COULEURS[3] },
          ]}
        />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-base font-medium">Pipeline par semaine</h2>
          <p className="mb-3 text-xs text-[var(--muted)]">{NB_SEMAINES} dernières semaines, semaine du lundi</p>
          <Courbes
            ariaLabel="Évolution hebdomadaire des prospects validés, démarches et RDV"
            labels={libellesSemaines}
            series={[
              { label: "Prospects validés", data: parSemaine((valides ?? []).map((v) => v.valide_le)), color: SERIES_COULEURS[0] },
              { label: "Démarches", data: parSemaine((interactions ?? []).map((i) => i.date_interaction ?? i.created_at)), color: SERIES_COULEURS[1] },
              { label: "RDV pris", data: parSemaine((rdvs ?? []).map((r) => r.created_at)), color: SERIES_COULEURS[2] },
            ]}
          />
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-base font-medium">Répartition par secteur</h2>
          <p className="mb-3 text-xs text-[var(--muted)]">Tous prospects validés, dont leads chauds</p>
          <BarresGroupees
            horizontal
            ariaLabel="Nombre de prospects et de leads chauds par secteur"
            labels={secteursTries.map(([label]) => label)}
            series={[
              { label: "Prospects", data: secteursTries.map(([, v]) => v.total), color: SERIES_COULEURS[0] },
              { label: "Leads chauds", data: secteursTries.map(([, v]) => v.chauds), color: SERIES_COULEURS[3] },
            ]}
          />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-base font-medium">CA par pack</h2>
          <p className="mb-3 text-xs text-[var(--muted)]">
            Diagnostics vendus, montant réparti entre les packs retenus à la qualification
          </p>
          {lignesPacks.length === 0 ? (
            <div className="flex h-60 items-center justify-center rounded-md bg-[var(--background)] text-sm text-[var(--muted)]">
              Aucun diagnostic vendu avec un montant renseigné pour l&apos;instant.
            </div>
          ) : (
            <div className="grid grid-cols-[1fr_1.1fr] items-center gap-4">
              <Camembert
                ariaLabel="Répartition du CA signé par pack"
                labels={lignesPacks.map((l) => l.label)}
                data={lignesPacks.map((l) => l.ca)}
                couleurs={lignesPacks.map((l) => COULEURS_PACKS[l.id] ?? "#9CA3AF")}
              />
              <table className="w-full text-sm">
                <tbody>
                  {lignesPacks.map((l) => (
                    <tr key={l.id} className="border-b border-[var(--border)] last:border-0">
                      <td className="py-1.5">
                        <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: COULEURS_PACKS[l.id] ?? "#9CA3AF" }} />
                        {l.label}
                      </td>
                      <td className="py-1.5 text-right tabular-nums">{l.ca.toLocaleString("fr-FR")}&nbsp;€</td>
                      <td className="w-12 py-1.5 text-right tabular-nums text-[var(--muted)]">
                        {Math.round((l.ca / caTotalPacks) * 100)}&nbsp;%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="mb-3 text-base font-medium">Pipeline par statut</h2>
        <BarresGroupees
          horizontal
          hauteur={220}
          ariaLabel="Répartition des prospects par statut du pipeline"
          labels={statutLabelsAvecDonnees}
          series={[{ label: "Prospects", data: statutCountsAvecDonnees, color: SERIES_COULEURS[0] }]}
        />
      </div>
      </div>
    </div>
  );
}

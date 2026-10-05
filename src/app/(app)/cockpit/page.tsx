import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Commerc, Commercial, Interaction, Pack, Rdv } from "@/lib/types";
import { SECTEURS, secteurDe } from "@/lib/secteurs";
import { CockpitVue } from "./vue";

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

  const dateLongue = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Paris",
  });

  return (
    <CockpitVue
      dateLongue={dateLongue}
      nbEnCours={enCours.length}
      nbProspects={list.length}
      nbVentes={ventes.length}
      caPotentielTotal={caPotentielTotal}
      caSigneTotal={caSigneTotal}
      ventesSansMontant={ventesSansMontant}
      parCommercial={parCommercial.map((c) => ({
        id: c.commercial.id,
        nom: `${c.commercial.Prénom ?? ""} ${c.commercial.Nom ?? ""}`.trim(),
        initiales: `${(c.commercial.Prénom ?? "")[0] ?? ""}${(c.commercial.Nom ?? "")[0] ?? ""}`.toUpperCase(),
        leadsActifs: c.leadsActifs,
        caPotentiel: c.caPotentiel,
        devisVendus: c.devisVendus,
        caSigne: c.caSigne,
      }))}
      kpiCommerciaux={kpiCommerciaux}
      libellesSemaines={libellesSemaines}
      semaines={{
        valides: parSemaine((valides ?? []).map((v) => v.valide_le)),
        demarches: parSemaine((interactions ?? []).map((i) => i.date_interaction ?? i.created_at)),
        rdv: parSemaine((rdvs ?? []).map((r) => r.created_at)),
      }}
      secteurs={secteursTries}
      lignesPacks={lignesPacks}
      caTotalPacks={caTotalPacks}
      statutLabels={statutLabelsAvecDonnees}
      statutCounts={statutCountsAvecDonnees}
    />
  );
}

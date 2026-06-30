import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Commerc, Commercial } from "@/lib/types";
import { ParCommercialBarChart, StatutBarChart } from "./charts";

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

  const list = prospects ?? [];
  const enCours = list.filter((p) => p.statut_prospect !== "Diagnostic vendu");
  const caPotentielTotal = list.reduce((sum, p) => sum + (p.devis_potentiel ?? 0), 0);

  const parCommercial = (commerciaux ?? []).map((c) => {
    const leads = list.filter((p) => p.commercial_id === c.id);
    return {
      commercial: c,
      leadsActifs: leads.filter((p) => p.statut_prospect !== "Diagnostic vendu").length,
      caPotentiel: leads.reduce((sum, p) => sum + (p.devis_potentiel ?? 0), 0),
      devisVendus: leads.filter((p) => p.statut_prospect === "Diagnostic vendu").length,
    };
  });

  const statutCounts = STATUTS_ORDRE.map(
    (s) => list.filter((p) => p.statut_prospect === s).length,
  );
  const statutLabelsAvecDonnees = STATUTS_ORDRE.filter((_, i) => statutCounts[i] > 0);
  const statutCountsAvecDonnees = statutCounts.filter((c) => c > 0);

  return (
    <div>
      <h1 className="mb-5 text-xl font-medium">Cockpit direction</h1>

      <div className="mb-6 grid grid-cols-4 gap-3">
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
          <p className="text-2xl font-medium">
            {list.filter((p) => p.statut_prospect === "Diagnostic vendu").length}
          </p>
        </div>
        <div className="rounded-md bg-[var(--surface)] border border-[var(--border)] p-4">
          <p className="mb-1 text-xs text-[var(--muted)]">Total prospects</p>
          <p className="text-2xl font-medium">{list.length}</p>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="mb-3 text-base font-medium">Performance par commercial</h2>
        <div className="grid grid-cols-4 gap-0 border-b border-[var(--border)] pb-2 text-xs text-[var(--muted)]">
          <div>Commercial</div>
          <div>Leads actifs</div>
          <div>CA potentiel</div>
          <div>Devis vendus</div>
        </div>
        {parCommercial.map(({ commercial, leadsActifs, caPotentiel, devisVendus }) => (
          <div
            key={commercial.id}
            className="grid grid-cols-4 gap-0 border-b border-[var(--border)] py-3 text-sm last:border-0"
          >
            <div>{commercial.Prénom} {commercial.Nom}</div>
            <div>{leadsActifs}</div>
            <div className="font-medium">{caPotentiel.toLocaleString("fr-FR")} €</div>
            <div>{devisVendus}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="mb-3 text-base font-medium">Pipeline par statut</h2>
          <StatutBarChart labels={statutLabelsAvecDonnees} data={statutCountsAvecDonnees} />
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="mb-3 text-base font-medium">Prospects par commercial</h2>
          <ParCommercialBarChart
            labels={parCommercial.map(({ commercial }) => `${commercial.Prénom} ${commercial.Nom}`)}
            data={parCommercial.map((p) => p.leadsActifs)}
          />
        </div>
      </div>
    </div>
  );
}

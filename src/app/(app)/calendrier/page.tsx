import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Commerc, Commercial, Rdv } from "@/lib/types";
import { creerRdv } from "./actions";

const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function startOfWeek(offset: number) {
  const now = new Date();
  const day = now.getDay() === 0 ? 7 : now.getDay();
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - day + 1 + offset * 7);
  return monday;
}

function ymdLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtDate(d: Date) {
  return ymdLocal(d);
}

export default async function CalendrierPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; prospect?: string; vue?: string; commercial?: string }>;
}) {
  const { week, prospect, vue, commercial } = await searchParams;
  const offset = Number(week ?? 0);
  const vueActive = vue === "2semaines" || vue === "agenda" ? vue : "semaine";
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  let isDg = false;
  let monCommercialId: number | null = null;
  if (auth.user) {
    const { data: profile } = await supabase
      .from("commerciaux")
      .select("id, role")
      .eq("auth_user_id", auth.user.id)
      .single();
    isDg = profile?.role === "dg";
    monCommercialId = profile?.id ?? null;
  }

  const { data: commerciaux } = isDg
    ? await supabase.from("commerciaux").select("*").returns<Commercial[]>()
    : { data: null };

  const monday = startOfWeek(offset);
  const nbJours = vueActive === "2semaines" ? 14 : vueActive === "agenda" ? 14 : 7;
  const finPeriode = new Date(monday);
  finPeriode.setDate(monday.getDate() + nbJours - 1);
  finPeriode.setHours(23, 59, 59, 999);

  let rdvQuery = supabase
    .from("rdv")
    .select("*")
    .gte("date_rdv", monday.toISOString())
    .lte("date_rdv", finPeriode.toISOString())
    .order("date_rdv");

  if (isDg && commercial) {
    rdvQuery = rdvQuery.eq("commercial_id", Number(commercial));
  }

  const { data: rdvs } = await rdvQuery.returns<Rdv[]>();

  const commercIds = [...new Set((rdvs ?? []).map((r) => r.commerc_id))];
  const { data: prospectsForRdv } = commercIds.length
    ? await supabase.from("commerc").select("id, Nom, Ville").in("id", commercIds)
    : { data: [] as { id: number; Nom: string; Ville: string }[] };
  const nomParId = new Map((prospectsForRdv ?? []).map((p) => [p.id, p]));

  const { data: mesProspects } = await supabase
    .from("commerc")
    .select("*")
    .not("statut_prospect", "in", '("Perdu","Blacklist","Diagnostic vendu","À valider")')
    .order("Nom")
    .limit(200)
    .returns<Commerc[]>();

  const prospectPreselectionne = prospect
    ? (mesProspects ?? []).find((p) => String(p.id) === prospect) ?? null
    : null;

  const { data: prochain } = await supabase
    .from("rdv")
    .select("*")
    .gte("date_rdv", new Date().toISOString())
    .order("date_rdv")
    .limit(1)
    .maybeSingle<Rdv>();

  let prochainNom = "";
  if (prochain) {
    const { data: p } = await supabase
      .from("commerc")
      .select("Nom, Ville")
      .eq("id", prochain.commerc_id)
      .single();
    prochainNom = p ? `${p.Nom} — ${p.Ville}` : "";
  }

  const jours = Array.from({ length: nbJours }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  const lienVue = (v: string) =>
    `/calendrier?week=${offset}&vue=${v}${commercial ? `&commercial=${commercial}` : ""}`;
  const lienSemaine = (o: number) =>
    `/calendrier?week=${o}&vue=${vueActive}${commercial ? `&commercial=${commercial}` : ""}`;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-medium">Calendrier</h1>
        <div className="flex items-center gap-2">
          <Link
            href={lienSemaine(offset - 1)}
            className="rounded-md border border-[var(--border)] px-2 py-1 text-sm"
          >
            ←
          </Link>
          <span className="text-sm text-[var(--muted)]">
            {fmtDate(monday)} – {fmtDate(jours[jours.length - 1])}
          </span>
          <Link
            href={lienSemaine(offset + 1)}
            className="rounded-md border border-[var(--border)] px-2 py-1 text-sm"
          >
            →
          </Link>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-2 text-sm">
          {[
            { v: "semaine", label: "1 semaine" },
            { v: "2semaines", label: "2 semaines" },
            { v: "agenda", label: "Agenda" },
          ].map(({ v, label }) => (
            <Link
              key={v}
              href={lienVue(v)}
              className={`rounded-md border border-[var(--border)] px-3 py-1.5 ${
                vueActive === v
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--surface)] text-[var(--muted)]"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {isDg && commerciaux ? (
          <form className="flex items-center gap-2 text-sm">
            <input type="hidden" name="week" value={offset} />
            <input type="hidden" name="vue" value={vueActive} />
            <label className="text-[var(--muted)]">Calendrier de :</label>
            <select
              name="commercial"
              defaultValue={commercial ?? ""}
              className="rounded-md border border-[var(--border)] px-2 py-1.5"
            >
              <option value="">Tous les commerciaux</option>
              {commerciaux.map((c) => (
                <option key={c.id} value={c.id}>{c.Prénom} {c.Nom}</option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-md border border-[var(--border)] px-3 py-1.5"
            >
              Filtrer
            </button>
          </form>
        ) : null}
      </div>

      {vueActive === "agenda" ? (
        <div className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          {(rdvs ?? []).length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-[var(--muted)]">
              Aucun RDV sur cette période.
            </p>
          ) : (
            (rdvs ?? []).map((r) => {
              const p = nomParId.get(r.commerc_id);
              return (
                <Link
                  key={r.id}
                  href={`/prospect/${r.commerc_id}`}
                  className="flex items-center gap-4 border-t border-[var(--border)] px-4 py-3 text-sm first:border-0 hover:bg-[var(--background)]"
                >
                  <span className="w-28 text-[var(--muted)]">
                    {new Date(r.date_rdv).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "2-digit" })}
                  </span>
                  <span className="w-14 font-medium">
                    {new Date(r.date_rdv).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="flex-1">{p?.Nom ?? `#${r.commerc_id}`}</span>
                  <span className="text-[var(--muted)]">{r.lieu ?? ""}</span>
                  <span className="text-xs text-[var(--muted)]">{r.statut}</span>
                </Link>
              );
            })
          )}
        </div>
      ) : (
        <div className={`mb-6 grid gap-2 ${vueActive === "2semaines" ? "grid-cols-7" : "grid-cols-7"}`}>
          {jours.map((d, i) => {
            const dayRdvs = (rdvs ?? []).filter(
              (r) => ymdLocal(new Date(r.date_rdv)) === fmtDate(d),
            );
            return (
              <div key={i} className={vueActive === "2semaines" && i === 7 ? "col-start-1" : undefined}>
                <p className="mb-2 text-center text-xs text-[var(--muted)]">
                  {JOURS[i % 7]} {d.getDate()}
                </p>
                <div className="flex min-h-24 flex-col gap-1.5 rounded-md bg-[var(--background)] p-1.5">
                  {dayRdvs.map((r) => {
                    const p = nomParId.get(r.commerc_id);
                    return (
                      <Link
                        key={r.id}
                        href={`/prospect/${r.commerc_id}`}
                        className="rounded-md bg-[var(--primary-light)] px-2 py-1.5 text-xs text-[var(--primary-dark)]"
                      >
                        <p className="font-medium">
                          {new Date(r.date_rdv).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                        <p>{p?.Nom ?? `#${r.commerc_id}`}</p>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {prochain ? (
        <div className="mb-6 border-t border-[var(--border)] pt-4">
          <h2 className="mb-2 text-base font-medium">Prochain RDV</h2>
          <Link
            href={`/prospect/${prochain.commerc_id}`}
            className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm hover:bg-[var(--background)]"
          >
            <span className="font-medium">{prochainNom}</span>
            <span className="text-[var(--muted)]">
              {new Date(prochain.date_rdv).toLocaleString("fr-FR")}
            </span>
          </Link>
        </div>
      ) : null}

      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="mb-3 text-base font-medium">Nouveau RDV</h2>
        <form action={creerRdv} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-[var(--muted)]">Prospect</label>
            {prospectPreselectionne ? (
              <div className="flex h-[34px] w-56 items-center rounded-md border border-[var(--border)] bg-[var(--background)] px-2 text-sm">
                <input type="hidden" name="commerc_id" value={prospectPreselectionne.id} />
                <span className="truncate">
                  {prospectPreselectionne.Nom} — {prospectPreselectionne.Ville}
                </span>
              </div>
            ) : (
              <select
                name="commerc_id"
                defaultValue=""
                required
                className="w-56 rounded-md border border-[var(--border)] px-2 py-1.5 text-sm"
              >
                <option value="" disabled>Choisir…</option>
                {(mesProspects ?? []).map((p) => (
                  <option key={p.id} value={p.id}>{p.Nom} — {p.Ville}</option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--muted)]">Date</label>
            <input name="date" type="date" required className="rounded-md border border-[var(--border)] px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--muted)]">Heure</label>
            <input name="heure" type="time" defaultValue="09:00" className="rounded-md border border-[var(--border)] px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--muted)]">Durée (min)</label>
            <input name="duree_minutes" type="number" defaultValue={60} className="w-20 rounded-md border border-[var(--border)] px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--muted)]">Lieu</label>
            <input name="lieu" type="text" className="w-40 rounded-md border border-[var(--border)] px-2 py-1.5 text-sm" />
          </div>
          <button
            type="submit"
            className="rounded-md bg-[var(--primary)] px-4 py-1.5 text-sm font-medium text-white hover:bg-[var(--primary-dark)]"
          >
            Planifier
          </button>
        </form>
      </div>
    </div>
  );
}

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Commerc, Rdv } from "@/lib/types";
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
  searchParams: Promise<{ week?: string; prospect?: string }>;
}) {
  const { week, prospect } = await searchParams;
  const offset = Number(week ?? 0);
  const supabase = await createClient();

  const monday = startOfWeek(offset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const { data: rdvs } = await supabase
    .from("rdv")
    .select("*")
    .gte("date_rdv", monday.toISOString())
    .lte("date_rdv", sunday.toISOString())
    .order("date_rdv")
    .returns<Rdv[]>();

  const commercIds = [...new Set((rdvs ?? []).map((r) => r.commerc_id))];
  const { data: prospectsForRdv } = commercIds.length
    ? await supabase.from("commerc").select("id, Nom, Ville").in("id", commercIds)
    : { data: [] as { id: number; Nom: string; Ville: string }[] };
  const nomParId = new Map((prospectsForRdv ?? []).map((p) => [p.id, p]));

  const { data: mesProspects } = await supabase
    .from("commerc")
    .select("*")
    .not("statut_prospect", "in", '("Perdu","Blacklist","Diagnostic vendu")')
    .order("Nom")
    .limit(200)
    .returns<Commerc[]>();

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

  const jours = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-medium">Calendrier</h1>
        <div className="flex items-center gap-2">
          <Link
            href={`/calendrier?week=${offset - 1}`}
            className="rounded-md border border-[var(--border)] px-2 py-1 text-sm"
          >
            ←
          </Link>
          <span className="text-sm text-[var(--muted)]">
            {fmtDate(monday)} – {fmtDate(sunday)}
          </span>
          <Link
            href={`/calendrier?week=${offset + 1}`}
            className="rounded-md border border-[var(--border)] px-2 py-1 text-sm"
          >
            →
          </Link>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-7 gap-2">
        {jours.map((d, i) => {
          const dayRdvs = (rdvs ?? []).filter(
            (r) => ymdLocal(new Date(r.date_rdv)) === fmtDate(d),
          );
          return (
            <div key={i}>
              <p className="mb-2 text-center text-xs text-[var(--muted)]">
                {JOURS[i]} {d.getDate()}
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
            <select
              name="commerc_id"
              defaultValue={prospect ?? ""}
              required
              className="w-56 rounded-md border border-[var(--border)] px-2 py-1.5 text-sm"
            >
              <option value="" disabled>Choisir…</option>
              {(mesProspects ?? []).map((p) => (
                <option key={p.id} value={p.id}>{p.Nom} — {p.Ville}</option>
              ))}
            </select>
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

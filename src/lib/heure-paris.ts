// Les RDV sont saisis et affichés en heure de Paris, quel que soit le fuseau du serveur
// (Vercel tourne en UTC) ou du navigateur. En base, `date_rdv` reste un timestamptz (UTC).

export const FUSEAU = "Europe/Paris";

const partsFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSEAU,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function partsParis(d: Date) {
  const p = Object.fromEntries(partsFmt.formatToParts(d).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, mi: +p.minute, s: +p.second };
}

/** Décalage de Paris par rapport à UTC à l'instant `d`, en millisecondes (+1 h ou +2 h). */
function decalageParis(d: Date) {
  const p = partsParis(d);
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - Math.floor(d.getTime() / 1000) * 1000;
}

/** "2026-10-05" + "09:00" (heure de Paris) → ISO UTC à stocker. */
export function parisVersIso(date: string, heure = "00:00"): string {
  const [y, m, d] = date.split("-").map(Number);
  const [h, mi] = heure.split(":").map(Number);
  const murale = Date.UTC(y, m - 1, d, h, mi);
  // Deux passes pour tomber juste autour des changements d'heure.
  let t = murale - decalageParis(new Date(murale));
  t = murale - decalageParis(new Date(t));
  return new Date(t).toISOString();
}

/** Jour (AAAA-MM-JJ) à Paris pour un instant donné. */
export function ymdParis(d: Date): string {
  const p = partsParis(d);
  return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

/** Heure (HH:MM) à Paris pour un instant donné. */
export function hmParis(d: Date): string {
  const p = partsParis(d);
  return `${String(p.h).padStart(2, "0")}:${String(p.mi).padStart(2, "0")}`;
}

/** Ajoute `n` jours à une date AAAA-MM-JJ (calcul calendaire, sans fuseau). */
export function ajouterJours(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Jour de la semaine d'une date AAAA-MM-JJ : 1 = lundi … 7 = dimanche. */
export function jourSemaine(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() || 7;
}

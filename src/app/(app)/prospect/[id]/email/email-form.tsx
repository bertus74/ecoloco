"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { enregistrerEmailValide, redigerAvecIA } from "./actions";

const LABELS: Record<string, string> = {
  prenom: "Prénom du gérant",
  economiesAnnuelles: "Économies estimées (€/an)",
  factureEstimee: "Facture estimée (€/an)",
  packsRecommandes: "Packs recommandés",
  phraseFinancement: "Financement",
  pourcentagePrincipal: "Part du poste principal",
};

// Variables mises en avant en tête du panneau.
const VARIABLES_CLES = ["prenom", "economiesAnnuelles", "factureEstimee", "packsRecommandes", "phraseFinancement"];
// Variables longues : saisies dans une zone de texte.
const MULTILIGNES = new Set(["packsRecommandes", "phraseFinancement"]);
// Variables qui peuvent rester vides : on retire alors le placeholder proprement ("Bonjour {prenom}," → "Bonjour,").
const OPTIONNELLES = new Set(["prenom"]);

const placeholders = (texte: string) => [...new Set([...texte.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))];

function retirerOptionnellesVides(texte: string, vars: Record<string, string>) {
  let out = texte;
  for (const k of OPTIONNELLES) {
    if (!vars[k]?.trim()) out = out.replace(new RegExp(`[ ,]*\\{${k}\\}`, "g"), "");
  }
  return out;
}

function remplir(texte: string, vars: Record<string, string>) {
  return retirerOptionnellesVides(texte, vars).replace(/\{(\w+)\}/g, (m, k: string) => vars[k]?.trim() || m);
}

function Apercu({ texte, vars }: { texte: string; vars: Record<string, string> }) {
  const rempli = retirerOptionnellesVides(texte, vars);

  return rempli.split(/(\{\w+\})/g).map((part, i) => {
    const k = part.match(/^\{(\w+)\}$/)?.[1];
    if (!k) return <span key={i}>{part}</span>;
    return vars[k]?.trim() ? (
      <mark key={i} className="rounded bg-[var(--primary-light)] px-0.5 text-[var(--primary-dark)]">
        {vars[k]}
      </mark>
    ) : (
      <mark key={i} className="rounded bg-[var(--danger-light)] px-0.5 text-[var(--danger)]">
        {part}
      </mark>
    );
  });
}

export function EmailEditor({
  prospectId,
  destinataire,
  objetInitial,
  corpsInitial,
  variablesInitiales,
}: {
  prospectId: string;
  destinataire: string;
  objetInitial: string;
  corpsInitial: string;
  variablesInitiales: Record<string, string>;
}) {
  const [to, setTo] = useState(destinataire);
  const [objet, setObjet] = useState(objetInitial);
  const [corps, setCorps] = useState(corpsInitial);
  const [vars, setVars] = useState(variablesInitiales);
  const [confirmation, setConfirmation] = useState(false);
  const [valide, setValide] = useState(false);
  const [noteIA, setNoteIA] = useState<string | null>(null);
  const [objetsIA, setObjetsIA] = useState<string[]>([]);
  const [enCours, startTransition] = useTransition();

  const utilisees = useMemo(() => placeholders(objet + corps), [objet, corps]);
  const manquantes = utilisees.filter((k) => !OPTIONNELLES.has(k) && !vars[k]?.trim());
  const autres = utilisees.filter((k) => !VARIABLES_CLES.includes(k));
  const emailOk = /^\S+@\S+\.\S+$/.test(to);

  useEffect(() => {
    if (!confirmation) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setConfirmation(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmation]);

  const objetFinal = remplir(objet, vars);
  const corpsFinal = remplir(corps, vars);

  const redigerIA = () =>
    startTransition(async () => {
      const brouillon = await redigerAvecIA(prospectId, vars);
      if (!brouillon) {
        setNoteIA("IA indisponible — le template est conservé.");
        return;
      }
      setCorps(brouillon.corps);
      if (brouillon.objets[0]) setObjet(brouillon.objets[0]);
      setObjetsIA(brouillon.objets);
      setNoteIA("Email rédigé par l'IA à partir des chiffres du prospect — relisez-le.");
    });

  const valider = () =>
    startTransition(async () => {
      await enregistrerEmailValide(prospectId, objetFinal);
      setConfirmation(false);
      setValide(true);
      window.location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(objetFinal)}&body=${encodeURIComponent(corpsFinal)}`;
    });

  const champ = "w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-sm outline-none focus:border-[var(--primary)]";

  return (
    <div className="grid grid-cols-[300px_1fr] gap-5">
      {/* Variables */}
      <div className="h-fit rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="mb-1 text-base font-medium">Variables</h2>
        <p className="mb-4 text-xs text-[var(--muted)]">Pré-remplies depuis la fiche — modifiables.</p>
        <div className="flex flex-col gap-3">
          {[...VARIABLES_CLES, ...autres].map((k, i) => (
            <label key={k} className={i === VARIABLES_CLES.length ? "border-t border-[var(--border)] pt-3" : ""}>
              <span className="mb-1 flex justify-between text-xs text-[var(--muted)]">
                {LABELS[k] ?? k}
                <code className="text-[10px]">{`{${k}}`}</code>
              </span>
              {MULTILIGNES.has(k) ? (
                <textarea
                  value={vars[k] ?? ""}
                  onChange={(e) => setVars((v) => ({ ...v, [k]: e.target.value }))}
                  rows={k === "packsRecommandes" ? 3 : 4}
                  className={`${champ} resize-y text-xs leading-relaxed ${!vars[k]?.trim() ? "border-[var(--danger)]" : ""}`}
                />
              ) : (
                <input
                  value={vars[k] ?? ""}
                  onChange={(e) => setVars((v) => ({ ...v, [k]: e.target.value }))}
                  placeholder={OPTIONNELLES.has(k) ? "Optionnel" : ""}
                  className={`${champ} ${!OPTIONNELLES.has(k) && !vars[k]?.trim() ? "border-[var(--danger)]" : ""}`}
                />
              )}
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-5">
        {/* Template */}
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-medium">Template</h2>
            <button
              type="button"
              onClick={redigerIA}
              disabled={enCours}
              className="rounded-md border border-[var(--border)] px-3 py-1 text-xs hover:bg-[var(--background)] disabled:opacity-50"
            >
              {enCours ? "Rédaction…" : "Rédiger avec l'IA"}
            </button>
          </div>
          {noteIA ? <p className="mb-2 text-xs text-[var(--muted)]">{noteIA}</p> : null}
          {objetsIA.length > 1 ? (
            <div className="mb-2 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[var(--muted)]">Objets proposés :</span>
              {objetsIA.map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setObjet(o)}
                  className={`rounded-full border px-2 py-0.5 ${objet === o ? "border-[var(--primary)] bg-[var(--primary-light)]" : "border-[var(--border)] hover:bg-[var(--background)]"}`}
                >
                  {o}
                </button>
              ))}
            </div>
          ) : null}
          <input value={objet} onChange={(e) => setObjet(e.target.value)} className={`${champ} mb-2 font-medium`} aria-label="Objet" />
          <textarea
            value={corps}
            onChange={(e) => setCorps(e.target.value)}
            rows={11}
            className={`${champ} resize-y font-mono text-[13px] leading-relaxed`}
            aria-label="Corps"
          />
        </div>

        {/* Aperçu */}
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="mb-3 text-base font-medium">Aperçu</h2>
          <div className="mb-3 flex items-center gap-2 text-sm">
            <span className="text-[var(--muted)]">À</span>
            <input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="Email manquant — renseignez-le ici"
              className={`${champ} ${emailOk ? "" : "border-[var(--danger)]"}`}
            />
          </div>
          <div className="rounded-md bg-[var(--background)] p-4">
            <p className="mb-3 text-sm font-medium">
              <Apercu texte={objet} vars={vars} />
            </p>
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              <Apercu texte={corps} vars={vars} />
            </div>
          </div>



          <div className="mt-4 flex items-center justify-between gap-3">
            <p className={`text-sm ${valide ? "text-[var(--primary)]" : manquantes.length || !emailOk ? "text-[var(--danger)]" : "text-[var(--muted)]"}`}>
              {valide
                ? "Email validé — tracé dans l'historique du prospect."
                : !emailOk
                  ? "Adresse du destinataire manquante ou invalide."
                  : manquantes.length
                    ? `Variable(s) vide(s) : ${manquantes.join(", ")}`
                    : "Rien ne part automatiquement : la validation ouvre votre client mail."}
            </p>
            <button
              type="button"
              onClick={() => setConfirmation(true)}
              disabled={manquantes.length > 0 || !emailOk || enCours}
              className="shrink-0 rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--primary-dark)] disabled:opacity-50"
            >
              Valider avant envoi
            </button>
          </div>
        </div>
      </div>

      {confirmation ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmation(false)} />
          <div role="dialog" aria-modal="true" className="relative w-full max-w-lg rounded-lg bg-[var(--surface)] p-6 shadow-xl">
            <h2 className="text-base font-medium">Confirmer l&apos;envoi</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">À {to}</p>
            <div className="mt-4 max-h-72 overflow-y-auto rounded-md bg-[var(--background)] p-4">
              <p className="mb-3 text-sm font-medium">{objetFinal}</p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{corpsFinal}</p>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmation(false)}
                className="rounded-md border border-[var(--border)] px-4 py-2 text-sm hover:bg-[var(--background)]"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={valider}
                disabled={enCours}
                className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--primary-dark)] disabled:opacity-50"
              >
                Confirmer et ouvrir mon client mail
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

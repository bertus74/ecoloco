"use client";

import { useEffect, useId, useRef, useState } from "react";
import { chercherProspects } from "./actions";

type Resultat = { id: number; Nom: string | null; Ville: string | null };

export function ProspectSearch() {
  const [terme, setTerme] = useState("");
  const [resultats, setResultats] = useState<Resultat[]>([]);
  const [choisi, setChoisi] = useState<Resultat | null>(null);
  const [ouvert, setOuvert] = useState(false);
  const [actif, setActif] = useState(0);
  const requete = useRef(0);
  const listeId = useId();
  const rechercheActive = !choisi && terme.trim().length >= 2;

  useEffect(() => {
    if (!rechercheActive) return;
    const id = ++requete.current;
    const t = setTimeout(async () => {
      const r = await chercherProspects(terme);
      if (id === requete.current) {
        setResultats(r);
        setActif(0);
        setOuvert(true);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [terme, rechercheActive]);

  const choisir = (r: Resultat) => {
    setChoisi(r);
    setTerme(`${r.Nom ?? ""}${r.Ville ? ` — ${r.Ville}` : ""}`);
    setOuvert(false);
  };

  return (
    <div className="relative w-64">
      <input type="hidden" name="commerc_id" value={choisi?.id ?? ""} />
      <input
        value={terme}
        onChange={(e) => {
          setTerme(e.target.value);
          setChoisi(null);
        }}
        onFocus={() => rechercheActive && setOuvert(true)}
        onBlur={() => setTimeout(() => setOuvert(false), 150)}
        onKeyDown={(e) => {
          if (!ouvert || !rechercheActive || resultats.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActif((a) => Math.min(a + 1, resultats.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActif((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            choisir(resultats[actif]);
          } else if (e.key === "Escape") {
            setOuvert(false);
          }
        }}
        placeholder="Tapez un nom ou une ville…"
        required={!choisi}
        // Empêche l'envoi tant qu'aucun prospect n'est choisi dans la liste.
        pattern={choisi ? undefined : "^$"}
        title="Choisissez un prospect dans la liste"
        role="combobox"
        aria-expanded={ouvert && rechercheActive}
        aria-controls={listeId}
        aria-autocomplete="list"
        className={`w-full rounded-md border px-2 py-1.5 text-sm ${choisi ? "border-[var(--primary)]" : "border-[var(--border)]"}`}
      />
      {ouvert && rechercheActive ? (
        <ul id={listeId} role="listbox" className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg">
          {resultats.length === 0 ? (
            <li className="px-3 py-2 text-sm text-[var(--muted)]">Aucun prospect trouvé</li>
          ) : (
            resultats.map((r, i) => (
              <li
                key={r.id}
                role="option"
                aria-selected={i === actif}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choisir(r);
                }}
                onMouseEnter={() => setActif(i)}
                className={`cursor-pointer px-3 py-1.5 text-sm ${i === actif ? "bg-[var(--primary-light)]" : ""}`}
              >
                {r.Nom}
                <span className="text-[var(--muted)]">{r.Ville ? ` — ${r.Ville}` : ""}</span>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}

"use client";

import { useState } from "react";

export function EmailForm({
  destinataire,
  objet,
  corps,
  hasEmail,
}: {
  destinataire: string;
  objet: string;
  corps: string;
  hasEmail: boolean;
}) {
  const [to, setTo] = useState(destinataire);
  const [subject, setSubject] = useState(objet);
  const [body, setBody] = useState(corps);

  const mailtoHref = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <div>
      <div className="mb-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="mb-2.5 flex items-center gap-2 text-sm">
          <span className="w-12 text-[var(--muted)]">À</span>
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder={hasEmail ? "" : "Email manquant — renseignez-le ici"}
            className="flex-1 rounded-md border border-[var(--border)] px-2 py-1 text-sm"
          />
        </div>
        <div className="mb-3 flex items-center gap-2 border-b border-[var(--border)] pb-3 text-sm">
          <span className="w-12 text-[var(--muted)]">Objet</span>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="flex-1 rounded-md border border-[var(--border)] px-2 py-1 text-sm font-medium"
          />
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={14}
          className="w-full resize-y rounded-md border-none p-0 text-sm leading-relaxed outline-none"
        />
      </div>

      <div className="mb-5 flex items-center gap-2 rounded-md bg-[var(--primary-light)] px-3 py-2.5 text-sm text-[var(--primary-dark)]">
        L&apos;envoi reste manuel — ce bouton ouvre votre client mail, rien ne part automatiquement.
      </div>

      <div className="flex gap-3">
        <a
          href={mailtoHref}
          className="flex-[2] rounded-md bg-[var(--primary)] px-4 py-2 text-center text-sm font-medium text-white hover:bg-[var(--primary-dark)]"
        >
          Ouvrir dans mon client mail
        </a>
      </div>
    </div>
  );
}

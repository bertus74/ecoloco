"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface ItemMenu {
  href: string;
  label: string;
  /** Autres chemins rattachés à cette entrée (ex. la fiche d'un prospect appartient à « Prospects »). */
  aussi?: string[];
}

/** Menu principal : la page où se trouve l'utilisateur est soulignée. */
export function NavLinks({ items }: { items: ItemMenu[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {items.map((item) => {
        const chemins = [item.href, ...(item.aussi ?? [])];
        const actif = chemins.some((c) => pathname === c || pathname.startsWith(`${c}/`));
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={actif ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 text-sm text-[var(--foreground)] hover:bg-[var(--primary-light)] ${
              actif ? "font-medium text-[var(--primary-dark)] underline decoration-2 underline-offset-8" : ""
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

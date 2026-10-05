"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Retour d'un lien Supabase « implicite » (par exemple « Send password recovery » depuis le tableau de bord) :
 * la session arrive dans le fragment de l'URL (#access_token=…), que le serveur ne voit jamais.
 * On l'enregistre côté navigateur, puis on ouvre la page « Nouveau mot de passe ».
 */
export function LienEmail() {
  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;
    const params = new URLSearchParams(hash);

    if (params.get("error")) {
      window.location.replace(`/login?error=${encodeURIComponent("Lien invalide ou expiré. Demandez un nouveau lien.")}`);
      return;
    }

    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (!accessToken || !refreshToken) return;

    createClient()
      .auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) {
          window.location.replace(`/login?error=${encodeURIComponent("Lien invalide ou expiré. Demandez un nouveau lien.")}`);
        } else {
          window.location.replace("/nouveau-mot-de-passe");
        }
      });
  }, []);

  return null;
}

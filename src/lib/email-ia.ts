import Anthropic from "@anthropic-ai/sdk";
import type { Commerc } from "@/lib/types";
import type { Argumentaire } from "@/lib/argumentaire";
import { SECTEURS } from "@/lib/secteurs";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODELE = "claude-sonnet-5-5";

export const PHRASE_RDV =
  "Je vous propose un diagnostic gratuit de 30 minutes sur place, au jour et à l'heure qui vous conviennent le mieux.";

// Information RGPD (origine des données + droit d'opposition), ajoutée par le code et non par l'IA.
export const MENTION_RGPD =
  "—\nVos coordonnées professionnelles proviennent de sources publiques (Google Maps). Vous pouvez vous opposer à tout moment à nos messages en répondant « STOP » à cet email.";

const SYSTEME = `Tu rédiges des emails de prospection B2B pour Eco-Locaux, qui réduit la facture énergétique des commerces de proximité (boulangeries, restaurants, boucheries…) avec des packs de travaux financés par les primes CEE.

Objectif : un email court et percutant, qui donne envie de prendre rendez-vous grâce à des chiffres concrets.

Règles impératives :
- N'écris jamais le nom du commerce, ni dans l'objet ni dans le corps : dis « votre boulangerie », « votre restaurant », « votre commerce »…
- N'utilise que les chiffres fournis, arrondis tels quels ; n'invente aucun montant, pourcentage, délai ni témoignage client.
- Les montants d'aides sont des plafonds : écris « jusqu'à … € de primes CEE », jamais un montant garanti.
- Corps de 130 mots maximum, phrases courtes, ton sobre et professionnel, sans superlatifs ni points d'exclamation.
- Structure : salutation (« Bonjour {prénom}, » si un prénom est fourni, sinon « Bonjour, ») ; une phrase sur la facture estimée ; les économies annuelles ; les packs recommandés en liste, un par ligne, précédés de leur emoji ; la phrase de financement ; puis exactement la phrase d'invitation fournie ; enfin « Cordialement, » puis « Eco-Locaux » sur la ligne suivante, sans nom de personne. N'ajoute rien après la signature : la mention RGPD est ajoutée automatiquement.
- Objets : moins de 70 caractères, avec le montant des économies annuelles, sans nom de commerce.
- Orthographe et accords irréprochables.`;

const SCHEMA = {
  type: "object",
  properties: {
    objets: {
      type: "array",
      items: { type: "string" },
      description: "Deux propositions d'objet différentes.",
    },
    corps: { type: "string", description: "Corps de l'email, prêt à relire." },
  },
  required: ["objets", "corps"],
  additionalProperties: false,
} as const;

export interface BrouillonIA {
  objets: string[];
  corps: string;
}

/** Rédige objet + corps à partir de l'argumentaire chiffré. Renvoie null si l'IA est indisponible. */
export async function genererBrouillon(
  prospect: Pick<Commerc, "Cat_scraping" | "Ville" | "surface">,
  argumentaire: Argumentaire,
  variables: Record<string, string>,
): Promise<BrouillonIA | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const faits = {
    type_de_commerce: prospect.Cat_scraping,
    secteur: SECTEURS[argumentaire.secteur].label,
    ville: prospect.Ville,
    surface_m2: prospect.surface,
    prenom_du_gerant: variables.prenom || null,
    facture_energie_estimee_euros_par_an: variables.factureEstimee,
    poste_le_plus_consommateur: SECTEURS[argumentaire.secteur].poste,
    part_de_ce_poste_dans_la_facture: variables.pourcentagePrincipal || null,
    economies_estimees_euros_par_an: variables.economiesAnnuelles,
    packs_recommandes: variables.packsRecommandes.split("\n"),
    phrase_de_financement: variables.phraseFinancement,
    phrase_invitation: PHRASE_RDV,
    signature: "Eco-Locaux",
  };

  try {
    const message = await anthropic.beta.messages.create({
      model: MODELE,
      max_tokens: 16000,
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: SCHEMA },
      },
      // En cas de refus pour raison de politique, l'API rejoue la requête sur un modèle de repli.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEME,
      messages: [
        {
          role: "user",
          content: `Rédige l'email de prospection à partir de ces faits (JSON) :\n${JSON.stringify(faits, null, 2)}`,
        },
      ],
    });

    if (message.stop_reason === "refusal" || message.stop_reason === "max_tokens") {
      console.error("Génération email IA interrompue :", message.stop_reason, message.stop_details);
      return null;
    }

    const texte = message.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");
    const brouillon = JSON.parse(texte) as BrouillonIA;
    if (!brouillon.corps?.trim()) return null;
    return {
      objets: (brouillon.objets ?? []).filter(Boolean).slice(0, 2),
      corps: `${brouillon.corps.trim()}\n\n${MENTION_RGPD}`,
    };
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      console.error("Génération email IA : limite de débit atteinte");
    } else if (err instanceof Anthropic.APIError) {
      console.error(`Génération email IA : erreur API ${err.status}`, err.message);
    } else {
      console.error("Génération email IA échouée :", err);
    }
    return null;
  }
}

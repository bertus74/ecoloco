import Anthropic from "@anthropic-ai/sdk";
import type { Commerc, Commercial } from "@/lib/types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function genererBrouillonTemplate(prospect: Commerc, commercial: Commercial | null) {
  const nom = prospect.Nom ?? "votre établissement";
  const ville = prospect.Ville ?? "";
  const avis = prospect.Nbre_Avis ?? 0;
  const note = prospect.note_google ?? null;
  const ca = prospect.ca_potentiel;
  const surface = prospect.surface;

  const lignes: string[] = [];
  lignes.push("Bonjour,");
  lignes.push("");

  let intro = `En tant que ${prospect.Cat_scraping?.toLowerCase() || "commerce"} reconnu${ville ? ` à ${ville}` : ""}`;
  if (note != null && avis > 0) intro += ` (${avis} avis, ${note}/5)`;
  intro += ", votre facture énergétique pourrait être optimisée significativement.";
  lignes.push(intro);
  lignes.push("");

  if (ca != null) {
    lignes.push(
      `Nous estimons un potentiel d'économie d'environ ${ca.toLocaleString("fr-FR")} € par an pour ${nom}, en mobilisant notamment les aides CEE disponibles.`,
    );
  } else if (surface != null) {
    lignes.push(
      `Avec une surface de ${surface} m², ${nom} entre typiquement dans les profils où nos diagnostics révèlent un fort potentiel d'économie, aides CEE à la clé.`,
    );
  } else {
    lignes.push(
      `Les commerces de ce secteur ont souvent un potentiel d'économie énergétique important, avec des aides CEE pouvant couvrir une partie des travaux.`,
    );
  }
  lignes.push("");
  lignes.push("Seriez-vous disponible pour un diagnostic gratuit cette semaine ?");
  lignes.push("");
  lignes.push("Cordialement,");
  lignes.push(`${commercial ? `${commercial.Prénom} ${commercial.Nom}` : ""}`);
  lignes.push("EcoLoco");

  return lignes.join("\n");
}

export async function genererBrouillon(
  prospect: Commerc,
  commercial: Commercial | null,
): Promise<{ corps: string; viaIA: boolean }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { corps: genererBrouillonTemplate(prospect, commercial), viaIA: false };
  }

  const faits = {
    nom_etablissement: prospect.Nom,
    ville: prospect.Ville,
    pays: prospect.pays,
    categorie: prospect.Cat_scraping,
    note_google: prospect.note_google,
    nombre_avis: prospect.Nbre_Avis,
    surface_m2: prospect.surface,
    ca_potentiel_estime_euros: prospect.ca_potentiel,
    commercial_prenom: commercial?.Prénom,
    commercial_nom: commercial?.Nom,
  };

  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 500,
      system:
        "Tu rédiges des emails de prospection B2B courts et professionnels pour EcoLoco, une société de conseil en efficacité énergétique qui démarche des commerces (boulangeries, restaurants, etc.) en France et en Belgique. Le ton est sobre, factuel, jamais survendeur. N'invente aucune donnée chiffrée qui ne figure pas dans les faits fournis. Réponds uniquement avec le corps de l'email en français, sans objet, sans balises, prêt à être envoyé après relecture par le commercial.",
      messages: [
        {
          role: "user",
          content: `Rédige un email de prospection à partir de ces données prospect (JSON) :\n${JSON.stringify(faits, null, 2)}\n\nL'email doit : saluer, mentionner brièvement pourquoi ce commerce est pertinent (catégorie, ville, avis si disponibles), évoquer le potentiel d'économie ou de CA estimé s'il est fourni, proposer un diagnostic gratuit, se terminer par une signature avec le prénom/nom du commercial et "EcoLoco". Ne mentionne aucune donnée absente des faits fournis.`,
        },
      ],
    });

    const corps = message.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    if (!corps) throw new Error("Réponse IA vide");

    return { corps, viaIA: true };
  } catch (err) {
    console.error("Génération email IA échouée, repli sur le template :", err);
    return { corps: genererBrouillonTemplate(prospect, commercial), viaIA: false };
  }
}

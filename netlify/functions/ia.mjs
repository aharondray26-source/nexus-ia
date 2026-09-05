// ============================================================================
//  LE MODÈLE EN LIGNE, HÉBERGÉ AVEC LE SITE.
//
//  Aharon, plusieurs fois : « je veux que les utilisateurs n'aient simplement
//  RIEN à faire et que le site soit lui-même intelligent. Dès que le site
//  visuel est en ligne, le modèle intelligent doit être en ligne aussi. »
//
//  Il avait raison et je n'avais pas compris. Le site AVAIT déjà un serveur
//  intelligent (`server.ts`), mais en glissant le dossier « dist » sur
//  Netlify on ne publie que les fichiers visuels : ce serveur ne tournait
//  jamais. Le site en ligne réclamait donc une clé à chaque visiteur.
//
//  Ce fichier est ce serveur, sous la forme que Netlify sait faire tourner.
//  Il part AVEC le site, à la même seconde. La clé vit dans les réglages de
//  Netlify — côté serveur, jamais dans le navigateur de personne, et jamais
//  dans le code publié sur GitHub.
//
//  Un visiteur ne configure rien, n'installe rien, ne télécharge rien.
// ============================================================================

import { trierLaDemande, quiDemande, demanderAuModele, reponse, enTetes,
         FENETRE_MIN } from "../lib/modele.mjs";

const CONSIGNE_PAR_DEFAUT =
  "Tu es Nexus, l'assistant d'Aharon, lycéen français. Réponds en français, "
  + "avec justesse, en Markdown, sans bavardage. Si c'est un exercice, montre "
  + "les étapes. Si tu n'es pas sûr, dis-le plutôt que d'inventer.";

export default async (requete) => {
  if (requete.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: enTetes() });
  }
  if (requete.method !== "POST") {
    return reponse({ error: "méthode non permise" }, 405);
  }

  let corps;
  try { corps = await requete.json(); }
  catch { return reponse({ error: "corps illisible" }, 400); }

  const message = String(corps.message || "").slice(0, 12000);
  if (!message.trim()) return reponse({ error: "message vide" }, 400);

  const consigne = (corps.context && corps.context.systemCtx)
    ? CONSIGNE_PAR_DEFAUT + "\n\n" + String(corps.context.systemCtx).slice(0, 2000)
    : CONSIGNE_PAR_DEFAUT;

  // L'historique arrive du site sous plusieurs formes selon les pages.
  const historique = (Array.isArray(corps.history) ? corps.history : [])
    .slice(-12)
    .map((m) => ({
      role: (m.role === "assistant" || m.role === "model") ? "assistant" : "user",
      content: String(m.content ?? m.text ?? (m.parts || []).map((p) => p.text || "").join("")).slice(0, 4000),
    }))
    .filter((m) => m.content.trim());

  const messages = [...historique, { role: "user", content: message }];

  // Le tri AVANT d'appeler quoi que ce soit : un refus ne doit rien coûter.
  const refus = trierLaDemande(quiDemande(requete));
  if (refus) {
    // On ne dit pas « non ». On dit « pas par ici » — et le site prend l'autre
    // chemin tout seul, sans que le visiteur ait quoi que ce soit à faire.
    return reponse({
      error: refus === "budget-jour"
        ? "le modèle en ligne a atteint sa réserve du jour"
        : "trop de questions d'affilée depuis cette connexion",
      code: "sans-modele",
      reprise: refus === "budget-jour" ? "demain" : `dans moins de ${FENETRE_MIN} minutes`,
    }, 429);
  }

  try {
    const r = await demanderAuModele(consigne, messages);
    return reponse({ reply: r.texte, modelUsed: r.modele, via: "serveur" });
  } catch (e) {
    // On le dit HONNÊTEMENT et de façon reconnaissable : le site bascule alors
    // sur le modèle du navigateur au lieu d'afficher « il faut une clé ».
    return reponse({
      error: e.message, code: "sans-modele", detail: e.detail,
      aide: "Ajoute GEMINI_API_KEY (ou GROQ_API_KEY) dans Netlify → "
          + "Site configuration → Environment variables, puis redéploie.",
    }, e.detail ? 502 : 503);
  }
};


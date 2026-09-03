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

// Les fournisseurs qu'on sait faire parler, dans l'ordre où on les essaie.
// Il suffit qu'UNE seule de ces variables existe dans Netlify pour que le
// site soit intelligent pour tout le monde.
const FOURNISSEURS = [
  {
    nom: "google",
    cle: () => process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
    modeles: ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-flash-latest"],
    async appeler(cle, modele, consigne, messages) {
      const r = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/"
        + encodeURIComponent(modele) + ":generateContent?key=" + encodeURIComponent(cle),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: consigne }] },
            contents: messages.map((m) => ({
              role: m.role === "assistant" ? "model" : "user",
              parts: [{ text: m.content }],
            })),
            // Les modèles récents réfléchissent AVANT d'écrire, et cette
            // réflexion se paie sur le même budget : trop serrer coupe la
            // phrase en deux.
            generationConfig: { temperature: 0.6, maxOutputTokens: 2600 },
          }),
        });
      const d = await r.json();
      if (d.error) throw new Error(d.error.message || "refus");
      const c = (d.candidates || [])[0] || {};
      // Une phrase coupée est pire que pas de réponse : on essaie le suivant.
      if (c.finishReason === "MAX_TOKENS") throw new Error("réponse coupée");
      return ((c.content || {}).parts || []).map((p) => p.text || "").join("").trim();
    },
  },
  {
    // Groq, Mistral, OpenAI, OpenRouter… : tous parlent le même langage.
    nom: "openai",
    cle: () => process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY
             || process.env.MISTRAL_API_KEY || process.env.OPENROUTER_API_KEY,
    base: () => process.env.GROQ_API_KEY ? "https://api.groq.com/openai/v1"
              : process.env.OPENAI_API_KEY ? "https://api.openai.com/v1"
              : process.env.MISTRAL_API_KEY ? "https://api.mistral.ai/v1"
              : "https://openrouter.ai/api/v1",
    modeles: () => {
      if (process.env.IA_MODELE) return [process.env.IA_MODELE];
      if (process.env.GROQ_API_KEY) return ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];
      if (process.env.OPENAI_API_KEY) return ["gpt-4o-mini"];
      if (process.env.MISTRAL_API_KEY) return ["mistral-small-latest"];
      return ["meta-llama/llama-3.3-70b-instruct:free"];
    },
    async appeler(cle, modele, consigne, messages) {
      const r = await fetch(this.base() + "/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + cle },
        body: JSON.stringify({
          model: modele, temperature: 0.6, max_tokens: 2000,
          messages: [{ role: "system", content: consigne }, ...messages],
        }),
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error.message || "refus");
      return ((d.choices || [])[0]?.message?.content || "").trim();
    },
  },
];

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

  const dispo = FOURNISSEURS.filter((f) => f.cle());
  if (!dispo.length) {
    // On le dit HONNÊTEMENT et de façon reconnaissable : le site bascule alors
    // sur le modèle du navigateur au lieu d'afficher « il faut une clé ».
    return reponse({
      error: "aucun modèle en ligne configuré",
      code: "sans-modele",
      aide: "Ajoute GEMINI_API_KEY (ou GROQ_API_KEY) dans Netlify → "
          + "Site configuration → Environment variables, puis redéploie.",
    }, 503);
  }

  const soucis = [];
  for (const f of dispo) {
    const cle = f.cle();
    const modeles = typeof f.modeles === "function" ? f.modeles() : f.modeles;
    for (const m of modeles) {
      try {
        const texte = await f.appeler(cle, m, consigne, messages);
        if (texte) return reponse({ reply: texte, modelUsed: m, via: "serveur" });
        soucis.push(m + " : réponse vide");
      } catch (e) {
        soucis.push(m + " : " + (e && e.message ? e.message : e));
      }
    }
  }
  // Tous les modèles ont refusé (quota, panne). Le site basculera tout seul.
  return reponse({ error: "aucun modèle n'a répondu", code: "sans-modele",
                   detail: soucis.slice(0, 4) }, 502);
};

function enTetes() {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    // Le site s'appelle lui-même : même origine. On n'ouvre rien à personne.
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
function reponse(objet, statut = 200) {
  return new Response(JSON.stringify(objet), { status: statut, headers: enTetes() });
}

// ============================================================================
//  LE MOTEUR, PARTAGÉ PAR TOUTES LES FONCTIONS.
//
//  Il était écrit dans « ia.mjs ». Mais le site appelle aussi
//  « /api/gemini/deals », « /recipes », « /document » — des adresses qui
//  N'EXISTAIENT PAS en ligne : elles retombaient sur la page d'accueil, le
//  site lisait du HTML au lieu d'une réponse, et concluait qu'il fallait une
//  clé. C'est le « la recherche des bons plans ne marche pas » d'Aharon.
//
//  Recopier le moteur dans chaque fonction, ce serait la même faute qu'ailleurs :
//  une correction faite d'un côté qui manque de l'autre. Il vit ici, une fois.
// ============================================================================

// Les fournisseurs qu'on sait faire parler, dans l'ordre où on les essaie.
// Il suffit qu'UNE seule de ces variables existe dans Netlify pour que le
// site soit intelligent pour tout le monde.
export const FOURNISSEURS = [
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

// ============================================================================
//  PROTÉGER LA CLÉ D'AHARON.
//
//  Lui : « j'ai pas envie que ma clé API soit open source, ou que tout le monde
//  l'utilise, parce que si plus tard beaucoup de gens l'utilisent elle va être
//  épuisée très rapidement. »
//
//  Deux choses différentes, et les deux comptent :
//
//  1. LA CLÉ N'EST JAMAIS PUBLIÉE. Elle vit dans les réglages de Netlify, elle
//     est lue ICI, sur le serveur, et elle ne descend JAMAIS dans le
//     navigateur de personne. Rien de ce fichier n'arrive chez le visiteur :
//     il n'envoie qu'une question et reçoit qu'une réponse.
//     `outils/telechargements.cjs` le VÉRIFIE avant chaque publication.
//
//  2. PERSONNE NE PEUT LA VIDER. Un plafond par visiteur, et un plafond par
//     jour pour tout le site. Au-delà, on ne coupe pas Nexus : on répond
//     « pas de modèle en ligne », et le site bascule tout seul sur le modèle
//     du navigateur. Aharon : « enlever les choses, c'est diminuer la valeur
//     de mon site » — donc on ne retire rien, on change de chemin.
//
//  Les compteurs vivent dans la mémoire de l'instance. Ce n'est pas un coffre-
//  fort : une instance neuve repart à zéro. Mais c'est ce qui arrête ce qui
//  arrive VRAIMENT — une boucle qui s'emballe, un onglet laissé ouvert, une
//  classe entière qui essaie en même temps. Les réglages ci-dessous se
//  changent dans Netlify, sans toucher au code.
// ============================================================================
export const BUDGET_JOUR = Number(process.env.IA_BUDGET_JOUR || 400);
export const PAR_VISITEUR = Number(process.env.IA_PAR_VISITEUR || 15);
export const FENETRE_MIN = Number(process.env.IA_FENETRE_MINUTES || 30);

let jour = "";
let comptéAujourdhui = 0;
const parVisiteur = new Map();   // clé → [instants]

/// Rend `null` si la demande passe, ou la raison du refus.
export function trierLaDemande(cle) {
  const maintenant = Date.now();
  const aujourdhui = new Date().toISOString().slice(0, 10);
  if (aujourdhui !== jour) { jour = aujourdhui; comptéAujourdhui = 0; parVisiteur.clear(); }

  if (comptéAujourdhui >= BUDGET_JOUR) return "budget-jour";

  const vus = (parVisiteur.get(cle) || [])
    .filter((t) => maintenant - t < FENETRE_MIN * 60_000);
  if (vus.length >= PAR_VISITEUR) return "trop-vite";

  vus.push(maintenant);
  parVisiteur.set(cle, vus);
  comptéAujourdhui++;

  // La carte ne doit pas gonfler indéfiniment sur une instance qui vit
  // longtemps : on jette les visiteurs qu'on n'a plus vus.
  if (parVisiteur.size > 2000) {
    for (const [k, v] of parVisiteur) {
      if (!v.length || maintenant - v[v.length - 1] > FENETRE_MIN * 60_000) parVisiteur.delete(k);
    }
  }
  return null;
}

/// De qui vient la demande. On ne garde RIEN : l'adresse ne sert qu'à compter,
/// en mémoire, et disparaît avec l'instance.
export function quiDemande(requete) {
  const h = requete.headers;
  return (h.get("x-nf-client-connection-ip")
       || h.get("x-forwarded-for")?.split(",")[0]?.trim()
       || "inconnu");
}


/// Demander à un modèle, en essayant les fournisseurs puis leurs modèles.
/// Rend `{ texte, modele }` ou lève avec la liste des refus.
export async function demanderAuModele(consigne, messages) {
  const dispo = FOURNISSEURS.filter((f) => f.cle());
  if (!dispo.length) {
    const e = new Error("aucun modèle en ligne configuré");
    e.code = "sans-modele";
    throw e;
  }
  const soucis = [];
  for (const f of dispo) {
    const cle = f.cle();
    const modeles = typeof f.modeles === "function" ? f.modeles() : f.modeles;
    for (const m of modeles) {
      try {
        const texte = await f.appeler(cle, m, consigne, messages);
        if (texte) return { texte, modele: m };
        soucis.push(m + " : réponse vide");
      } catch (err) {
        soucis.push(m + " : " + (err && err.message ? err.message : err));
      }
    }
  }
  const e = new Error("aucun modèle n'a répondu");
  e.code = "sans-modele";
  e.detail = soucis.slice(0, 4);
  throw e;
}

export function enTetes() {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
export function reponse(objet, statut = 200) {
  return new Response(JSON.stringify(objet), { status: statut, headers: enTetes() });
}

/* ==========================================================================
   QUI A LE DROIT D'APPELER LE MODÈLE
   ==========================================================================

   IL MANQUAIT « Access-Control-Allow-Origin ». Sans cet en-tête, un navigateur
   REFUSE la réponse à tout ce qui n'est pas le site lui-même. Conséquence :
   l'application Windows et l'application macOS — qui affichent le site depuis
   leur propre adresse — n'avaient AUCUNE intelligence. Pas un message
   d'erreur : le navigateur bloque en silence, et Nexus concluait simplement
   « il n'y a pas de serveur ».

   MAIS PAS « * » NON PLUS. Aharon : « j'ai pas envie que tout le monde
   l'utilise, elle va être épuisée. » Autoriser n'importe quel site, ce serait
   offrir sa clé à qui veut la prendre. On liste donc précisément qui a le
   droit, et l'on renvoie l'origine demandée — c'est la façon correcte de
   faire, et elle ne coûte rien.                                            */

const ORIGINES = new Set([
  "https://nexus-espace.netlify.app",
  // Les applications de bureau. Tauri sert le site depuis ces adresses-là :
  // « tauri://localhost » sur macOS, « http://tauri.localhost » sur Windows.
  "tauri://localhost",
  "http://tauri.localhost",
  "https://tauri.localhost",
]);

export function origineAcceptee(origine) {
  if (!origine) return null;                       // pas un appel de navigateur
  if (ORIGINES.has(origine)) return origine;
  // Le développement, et l'application macOS qui sert le site sur un petit
  // serveur local.
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d{2,5})?$/.test(origine)) return origine;
  // Les aperçus de Netlify : « https://<quelque-chose>--nexus-espace.netlify.app ».
  if (/^https:\/\/[a-z0-9-]+--nexus-espace\.netlify\.app$/.test(origine)) return origine;
  return null;
}

/// Rajoute l'autorisation à une réponse déjà faite.
export function avecOrigine(rep, requete) {
  const o = origineAcceptee(requete.headers.get("origin"));
  if (!o) return rep;
  const h = new Headers(rep.headers);
  h.set("Access-Control-Allow-Origin", o);
  // « Vary » dit aux caches que la réponse dépend de qui demande. Sans lui,
  // le cache servirait l'autorisation d'un autre, et l'appel serait refusé.
  h.set("Vary", "Origin");
  return new Response(rep.body, { status: rep.status, headers: h });
}

/// La porte d'entrée d'une fonction : elle traite, puis elle autorise.
/// On l'écrit une fois ici plutôt que dans chacune des quinze réponses —
/// sinon il en manquera une, et ce sera celle qui compte.
export function porte(traiter) {
  return async (requete) => avecOrigine(await traiter(requete), requete);
}

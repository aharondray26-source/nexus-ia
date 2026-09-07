// ============================================================================
//  LES FONCTIONS QUI RENDENT DU JSON.
//
//  Le site appelle « /api/gemini/deals », « /recipes », « /document ». Ces
//  adresses n'existaient PAS en ligne : elles retombaient sur la page
//  d'accueil, le site lisait du HTML là où il attendait une réponse, en
//  concluait qu'il fallait une clé — et Aharon voyait « la recherche des bons
//  plans ne marche pas ».
//
//  Un modèle à qui l'on demande du JSON en rend rarement PROPREMENT : il
//  l'entoure de « voici les offres », ou de barrières de code. On extrait donc
//  l'objet, au lieu d'espérer.
// ============================================================================
import { trierLaDemande, quiDemande, demanderAuModele, reponse,
         FENETRE_MIN, porte } from "../lib/modele.mjs";

/// Ce qu'on demande, selon l'adresse appelée.
const TACHES = {
  deals: {
    consigne: "Tu compares des offres pour un lycéen français. Tu réponds "
      + "UNIQUEMENT par un objet JSON valide, sans un mot autour, sans barrière "
      + "de code. N'invente pas de prix précis que tu ne connais pas : reste "
      + "plausible et dis-le dans la description si tu n'es pas sûr.",
    question: (c) => `Donne 4 offres pour « ${c.productQuery || c.query || ""} » en France.\n`
      + `Forme exacte : {"deals":[{"title":"","store":"","price":"","oldPrice":"",`
      + `"discount":"","url":"","description":""}]}`,
    vide: { deals: [] },
  },
  recipes: {
    consigne: "Tu proposes des recettes simples. Tu réponds UNIQUEMENT par un "
      + "objet JSON valide, sans un mot autour.",
    question: (c) => `Donne 3 recettes avec : ${c.ingredients || c.query || ""}.\n`
      + `Forme exacte : {"recipes":[{"title":"","time":"","difficulty":"",`
      + `"ingredients":[""],"steps":[""]}]}`,
    vide: { recipes: [] },
  },
  document: {
    consigne: "Tu rédiges en français, clairement. Tu réponds UNIQUEMENT par un "
      + "objet JSON valide, sans un mot autour.",
    question: (c) => `${c.prompt || c.query || ""}\n`
      + `Forme exacte : {"content":""}`,
    vide: { content: "" },
  },
};

/// Extraire l'objet JSON d'une réponse, même mal emballée.
function extraire(texte) {
  const t = String(texte || "").trim()
    .replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try { return JSON.parse(t); } catch { /* on cherche plus finement */ }
  // Le premier objet complet : on compte les accolades, parce qu'une simple
  // recherche du dernier « } » attrape n'importe quoi.
  const d = t.indexOf("{");
  if (d < 0) return null;
  let n = 0;
  for (let i = d; i < t.length; i++) {
    if (t[i] === "{") n++;
    else if (t[i] === "}") { n--; if (n === 0) {
      try { return JSON.parse(t.slice(d, i + 1)); } catch { return null; }
    } }
  }
  return null;
}

export default porte(async (requete) => {
  if (requete.method === "OPTIONS") return reponse({}, 204);
  if (requete.method !== "POST") return reponse({ error: "méthode non permise" }, 405);

  const quoi = new URL(requete.url).pathname.split("/").pop();
  const tache = TACHES[quoi];
  if (!tache) return reponse({ error: "tâche inconnue : " + quoi }, 404);

  let corps;
  try { corps = await requete.json(); }
  catch { return reponse({ error: "corps illisible" }, 400); }

  const refus = trierLaDemande(quiDemande(requete));
  if (refus) {
    return reponse({
      error: refus === "budget-jour"
        ? "le modèle en ligne a atteint sa réserve du jour"
        : "trop de demandes d'affilée depuis cette connexion",
      code: "sans-modele",
      reprise: refus === "budget-jour" ? "demain" : `dans moins de ${FENETRE_MIN} minutes`,
    }, 429);
  }

  try {
    const r = await demanderAuModele(tache.consigne,
      [{ role: "user", content: tache.question(corps) }]);
    const objet = extraire(r.texte);
    if (!objet) {
      // On ne renvoie pas du texte là où le site attend un objet : il
      // afficherait « undefined » partout.
      return reponse({ error: "le modèle n'a pas rendu de JSON lisible",
                       code: "sans-modele" }, 502);
    }
    return reponse({ ...tache.vide, ...objet, modelUsed: r.modele });
  } catch (e) {
    return reponse({ error: e.message, code: "sans-modele", detail: e.detail },
                   e.detail ? 502 : 503);
  }
});

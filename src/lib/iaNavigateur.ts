// ============================================================================
//  UN MODÈLE QUI TOURNE DANS LE NAVIGATEUR
//
//  J'avais dit à Aharon que c'était impossible. J'avais tort, et il avait
//  raison : son copain l'a fait. On ne met pas le modèle DANS le site — un
//  site pèse dix mégaoctets, un modèle en pèse mille. Mais on peut le faire
//  télécharger UNE FOIS par le navigateur, qui le garde ensuite pour toujours,
//  et le faire tourner sur la carte graphique de la machine.
//
//  C'est ce que fait WebLLM. Les modèles vivent chez Hugging Face — « l'autre
//  hébergeur » dont parlait son copain. Rien à installer, aucun compte, aucune
//  clé : on ouvre le site, et ça répond.
//
//  Trois conditions honnêtes :
//  · il faut WebGPU (Chrome, Edge, ou Safari 18+) ;
//  · le premier téléchargement pèse de 380 Mo à 1,1 Go selon le modèle choisi ;
//  · ensuite, plus rien ne sort de la machine — jamais.
// ============================================================================

const CDN = "https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.84/+esm";

/// Les deux modèles proposés. On ne noie pas Aharon sous un catalogue : un
/// rapide, un meilleur, et c'est tout.
export const MODELES = [
  {
    id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
    nom: "Recommandé",
    poids: "environ 1,1 Go",
    detail: "Le bon choix. Répond correctement en français, y compris sur les cours.",
    fiable: true,
  },
  {
    id: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
    nom: "Léger",
    poids: "environ 380 Mo",
    detail: "Trois fois plus léger, mais il se trompe. Essayé le 2 septembre 2026 : "
      + "il a inversé numérateur et dénominateur en expliquant les fractions. "
      + "À ne prendre que si la connexion ne suit vraiment pas.",
    fiable: false,
  },
] as const;

export type IdModele = (typeof MODELES)[number]["id"];

export const CLE_CHOIX = "nexus.ia.navigateur.modele";
export const CLE_DEJA = "nexus.ia.navigateur.installe";

/// Le navigateur sait-il faire tourner un modèle ? Sans WebGPU, non — et il
/// vaut mieux le dire tout de suite que de lancer un téléchargement d'un
/// gigaoctet pour échouer à la fin.
export function possible(): boolean {
  return typeof navigator !== "undefined" && "gpu" in navigator;
}

/// Le modèle a-t-il déjà été téléchargé sur cette machine ? On retient notre
/// propre réponse : interroger le cache du navigateur coûte plus cher que de
/// s'en souvenir.
export function dejaInstalle(): IdModele | null {
  try {
    const v = localStorage.getItem(CLE_DEJA);
    return v && MODELES.some((m) => m.id === v) ? (v as IdModele) : null;
  } catch {
    return null;
  }
}

type Avancement = { etape: string; part: number };

/// WebLLM annonce son avancement en anglais, avec du jargon. On dit la même
/// chose en français, et on dit ce qui se passe VRAIMENT : ce n'est pas
/// « fetching param cache », c'est un téléchargement, et il est long.
// La part d'avancement ne vient PAS du champ `progress` de la bibliotheque :
// pendant tout le telechargement il reste a zero, et la jauge restait donc
// collee a 2 % pendant plusieurs minutes — exactement l'impression de panne
// qu'on voulait eviter. Je l'ai vu en la regardant tourner. Le vrai avancement
// est ecrit dans la phrase anglaise (« 94% completed ») : c'est celui-la qu'on
// lit, et on le repartit pour que la fin ne fasse pas un bond.
function enFrancais(t: string, part: number): { etape: string; part: number } {
  const m = t.match(/\[(\d+)\/(\d+)\]/);
  const pc = t.match(/(\d+(?:\.\d+)?)%\s*complet/i);
  const mo = t.match(/([\d.]+)\s*MB\s*(?:fetched|loaded)/i);
  const p = pc ? Math.min(1, parseFloat(pc[1]) / 100)
               : (m ? Number(m[1]) / Number(m[2]) : part);

  if (/fetch|download/i.test(t)) {
    return { etape: mo ? `Téléchargement du modèle · ${Math.round(parseFloat(mo[1]))} Mo reçus`
                       : "Téléchargement du modèle…", part: p * 0.8 };
  }
  if (/cache/i.test(t)) {
    return { etape: mo ? `Chargement du modèle · ${Math.round(parseFloat(mo[1]))} Mo`
                       : "Chargement du modèle…", part: 0.8 + p * 0.15 };
  }
  if (/shader|gpu/i.test(t)) {
    return { etape: "Mise en route sur la carte graphique…", part: 0.95 + p * 0.05 };
  }
  if (/finish|complete|ready/i.test(t)) return { etape: "Prêt.", part: 1 };
  if (/loading|init|compil/i.test(t)) {
    return { etape: "Mise en route du modèle…", part: Math.max(p, 0.8) };
  }
  return { etape: t.trim() || "Préparation…", part };
}

let moteur: any = null;
let moteurPour: string | null = null;
let chargement: Promise<any> | null = null;

/// Prépare le modèle. Rend la main quand il est prêt à répondre.
export async function preparer(
  id: IdModele,
  avance?: (a: Avancement) => void,
): Promise<any> {
  if (moteur && moteurPour === id) return moteur;
  if (chargement) return chargement;

  chargement = (async () => {
    if (!possible()) {
      throw new Error(
        "Ce navigateur ne sait pas faire tourner un modèle : il lui manque WebGPU. "
          + "Chrome, Edge et Safari 18 le savent.",
      );
    }
    // On charge la bibliothèque depuis le CDN, pas depuis le paquet du site :
    // elle pèse six mégaoctets, et personne n'a à la télécharger tant qu'il ne
    // s'en sert pas.
    const webllm: any = await import(/* @vite-ignore */ CDN);
    const m = await webllm.CreateMLCEngine(id, {
      initProgressCallback: (r: any) => {
        avance?.({
          // WebLLM parle anglais. Aharon non — et « Fetching param cache[6/8] »
          // ne veut rien dire pour personne.
          ...enFrancais(String(r?.text ?? ""),
                        typeof r?.progress === "number" ? r.progress : 0),
        });
      },
    });
    moteur = m;
    moteurPour = id;
    try { localStorage.setItem(CLE_DEJA, id); } catch { /* stockage refusé */ }
    return m;
  })().finally(() => { chargement = null; });

  return chargement;
}

/// Poser une question au modèle du navigateur.
export async function demanderAuNavigateur(
  question: string,
  historique: { role: "user" | "assistant"; text: string }[] = [],
  consigne?: string,
  avance?: (a: Avancement) => void,
): Promise<{ reponse: string; modele: string } | null> {
  const id = (localStorage.getItem(CLE_CHOIX) as IdModele | null)
    ?? dejaInstalle()
    ?? MODELES[0].id;
  const m = await preparer(id, avance);
  const messages = [
    ...(consigne ? [{ role: "system", content: consigne }] : []),
    ...historique.map((h) => ({
      role: h.role === "user" ? "user" : "assistant",
      content: h.text,
    })),
    { role: "user", content: question },
  ];
  // Température basse : on ne veut pas d'invention. Un modèle de cette taille
  // qui « brode » raconte n'importe quoi à un lycéen qui révise.
  const r = await m.chat.completions.create({ messages, temperature: 0.25 });
  const t = r?.choices?.[0]?.message?.content;
  if (typeof t !== "string" || !t.trim()) return null;
  const nom = MODELES.find((x) => x.id === id)?.nom ?? id;
  return { reponse: t, modele: `${nom} · dans ton navigateur` };
}

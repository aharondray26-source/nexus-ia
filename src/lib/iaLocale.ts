// ============================================================================
//  L'IA QUI TOURNE CHEZ TOI
//
//  Aharon voulait « un modèle en local, dans le site, pour que personne n'ait
//  besoin de mettre une clé ». Il faut dire les choses franchement : on ne peut
//  PAS mettre un modèle dans un site. Le plus petit pèse deux gigaoctets ; un
//  site en pèse neuf mégaoctets. Son copain n'a pas mis un modèle dans son
//  site : il a installé **Ollama** sur SA machine, et son site lui parle.
//
//  Alors Nexus fait mieux que copier : il essaie, dans l'ordre,
//    1. ta clé, si tu en as mis une ;
//    2. Ollama, s'il tourne sur cette machine — gratuit, hors ligne, privé ;
//    3. et sinon il le dit, au lieu de faire semblant.
//
//  Ce fichier ne s'occupe que du deuxième étage.
// ============================================================================

export const OLLAMA = "http://127.0.0.1:11434";

/// Ce qu'on a appris de la machine, pour ne pas redemander à chaque message.
export type EtatLocal =
  | { present: false; raison: "absent" | "bloque" | "sans-modele"; detail: string }
  | { present: true; modele: string; modeles: string[] };

let connu: EtatLocal | null = null;
let enCours: Promise<EtatLocal> | null = null;

/// Les modèles qu'on préfère, du meilleur au plus léger. On prend le premier
/// installé ; si aucun ne l'est, on prend simplement le premier de la liste
/// de la machine — mieux vaut un modèle inconnu que pas de modèle.
const PREFERES = [
  "llama3.2", "llama3.1", "llama3", "qwen2.5", "mistral",
  "gemma2", "gemma3", "phi3", "tinyllama",
];

function avecDelai(url: string, o: RequestInit = {}, ms = 1500): Promise<Response> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  return fetch(url, { ...o, signal: c.signal }).finally(() => clearTimeout(t));
}

/// Ollama tourne-t-il ici, et avec quoi ?
export async function ollamaDisponible(refaire = false): Promise<EtatLocal> {
  if (connu && !refaire) return connu;
  if (enCours && !refaire) return enCours;

  enCours = (async (): Promise<EtatLocal> => {
    try {
      const r = await avecDelai(`${OLLAMA}/api/tags`);
      if (!r.ok) {
        return { present: false, raison: "bloque",
                 detail: `Ollama répond mais refuse (${r.status}).` };
      }
      const d = await r.json();
      const noms: string[] = (d?.models ?? []).map((m: any) => String(m?.name ?? "")).filter(Boolean);
      if (!noms.length) {
        return { present: false, raison: "sans-modele",
                 detail: "Ollama tourne, mais aucun modèle n'est installé." };
      }
      const choisi =
        noms.find((n) => PREFERES.some((p) => n.startsWith(p))) ?? noms[0];
      return { present: true, modele: choisi, modeles: noms };
    } catch (e) {
      // On ne peut pas distinguer « éteint » de « refusé par la politique de
      // sécurité » depuis le navigateur : les deux donnent la même erreur. On
      // le dit honnêtement au lieu d'inventer une cause.
      const surHttps = typeof location !== "undefined" && location.protocol === "https:";
      return {
        present: false,
        raison: surHttps ? "bloque" : "absent",
        detail: surHttps
          ? "Ollama n'a pas répondu. Soit il n'est pas lancé, soit il refuse "
            + "les pages web de l'extérieur (c'est son réglage par défaut)."
          : "Ollama n'a pas répondu : il n'est probablement pas lancé.",
      };
    } finally {
      enCours = null;
    }
  })();

  connu = await enCours;
  return connu;
}

/// Poser une question au modèle de la machine.
export async function demanderALocal(
  question: string,
  historique: { role: "user" | "assistant"; text: string }[] = [],
  consigne?: string,
): Promise<{ reponse: string; modele: string } | null> {
  const etat = await ollamaDisponible();
  if (!etat.present) return null;

  const messages = [
    ...(consigne ? [{ role: "system", content: consigne }] : []),
    ...historique.map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.text,
    })),
    { role: "user", content: question },
  ];

  try {
    // Pas de délai serré ici : un modèle local met plusieurs secondes à
    // répondre, et c'est normal. Le délai court ne sert qu'à la détection.
    const r = await fetch(`${OLLAMA}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: etat.modele, messages, stream: false }),
    });
    if (!r.ok) return null;
    const d = await r.json();
    const t = d?.message?.content;
    return typeof t === "string" && t.trim() ? { reponse: t, modele: etat.modele } : null;
  } catch {
    return null;
  }
}

/// Ce qu'il faut dire à quelqu'un qui n'a pas encore d'IA locale — en français,
/// sans jargon, avec la commande exacte à copier.
export function commentInstaller(etat: EtatLocal): string[] {
  // On isole le cas « pas la » : TypeScript sait alors que `raison` existe.
  if (etat.present === true) return [];
  const raison: "absent" | "bloque" | "sans-modele" = etat.raison;
  if (raison === "sans-modele") {
    return [
      "Ollama tourne, mais il est vide : il faut lui donner un modèle.",
      "Ouvre le Terminal et colle : ollama pull llama3.2",
      "C'est un téléchargement d'environ 2 Go, une seule fois.",
    ];
  }
  const base = [
    "Installe Ollama : va sur ollama.com, clique « Download », glisse-le dans Applications.",
    "Ouvre le Terminal et colle : ollama pull llama3.2",
    "C'est tout. Nexus le trouvera tout seul.",
  ];
  if (raison === "bloque" && typeof location !== "undefined" && location.protocol === "https:") {
    base.push(
      "Si Ollama tourne déjà, c'est qu'il refuse les pages web : par sécurité il "
      + "n'accepte que celles de ta propre machine.",
      "Pour l'autoriser, colle dans le Terminal :",
      `launchctl setenv OLLAMA_ORIGINS "${location.origin}" && killall ollama`,
      "puis relance Ollama.",
    );
  }
  return base;
}

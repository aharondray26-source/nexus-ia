// ============================================================================
//  LE MODE VISITEUR.
//
//  Aharon : « sur mon Mac il y a déjà une clé API par défaut, et aussi un
//  modèle installé qui fait deux gigas. Donc à chaque fois que je veux tester,
//  je n'ai pas la certitude que ça fonctionne : je peux toujours me dire que
//  c'est ma clé, ou mon modèle installé. »
//
//  Il a entièrement raison, et c'est un problème de MÉTHODE, pas de code : on
//  ne peut pas juger ce qu'un inconnu va vivre quand on teste depuis une
//  machine équipée. Ce commutateur fait comme s'il n'avait RIEN : pas de clé,
//  pas d'Ollama. Il ne reste que ce qu'un visiteur a vraiment — le modèle en
//  ligne du site, et à défaut celui que son navigateur télécharge tout seul.
//
//  Il ne change rien pour les visiteurs : il n'existe que dans CE navigateur.
// ============================================================================

const CLE = "nexus.mode.visiteur";

/// Est-on en train de se faire passer pour quelqu'un qui n'a rien ?
export function modeVisiteur(): boolean {
  try { return localStorage.getItem(CLE) === "1"; } catch { return false; }
}

export function poserModeVisiteur(actif: boolean) {
  try {
    if (actif) localStorage.setItem(CLE, "1");
    else localStorage.removeItem(CLE);
  } catch { /* rangement refusé */ }
}

/// Le chemin que Nexus a réellement emprunté pour répondre, étape par étape.
/// Sans ça on lit une réponse sans savoir d'où elle vient — et l'on doute.
export type Etape = { nom: string; etat: "ok" | "absent" | "echec" | "saute"; detail?: string };

export function raconter(etapes: Etape[]): string {
  const signe = (e: Etape["etat"]) =>
    e === "ok" ? "✓" : e === "echec" ? "✗" : e === "saute" ? "—" : "·";
  const mot = (e: Etape["etat"]) =>
    e === "ok" ? "a répondu" : e === "echec" ? "a échoué" :
    e === "saute" ? "ignoré (mode visiteur)" : "absent";
  return etapes.map((e) => `${signe(e.etat)} ${e.nom} — ${mot(e.etat)}`
    + (e.detail ? ` (${e.detail})` : "")).join("\n");
}

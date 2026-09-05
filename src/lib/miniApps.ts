// ============================================================================
//  LES PETITES APPLICATIONS DE NEXUS.
//
//  Aharon : « il faut qu'elle puisse créer des applications qui se mettent
//  dans le site. Officieusement ce sera relié à Nexus, mais officiellement et
//  visuellement ce sera comme des petites applications qui font ce que l'on
//  demande. Par exemple : crée-moi une application pour mettre un fond d'écran
//  rouge à chaque fois que je ferme une application, pendant cinq secondes. »
//
//  Une application fabriquée à la demande, c'est du code qu'on n'a pas écrit
//  qui tourne chez soi. On ne peut donc PAS la laisser dans la même pièce que
//  le reste : elle vit dans un cadre isolé, sans accès au rangement de Nexus,
//  sans accès au réseau, sans accès à la page. Elle ne peut parler que par une
//  porte étroite, et Nexus décide ce qui passe.
//
//  C'est la différence entre « une application » et « un trou ».
// ============================================================================

export type MiniApp = {
  id: string;
  nom: string;
  /// Un emoji : c'est son icône dans la barre latérale.
  icone: string;
  /// Ce qu'elle fait, en une phrase — pour la retrouver.
  quoi: string;
  /// Le code de la page, tel qu'il sera exécuté dans le cadre isolé.
  code: string;
  creeeLe: string;
  /// La demande d'origine, pour pouvoir la refaire autrement.
  demande?: string;
};

const CLE = "nexus.miniapps";

export function lireMiniApps(): MiniApp[] {
  try {
    const b = localStorage.getItem(CLE);
    const l = b ? JSON.parse(b) : [];
    return Array.isArray(l) ? l : [];
  } catch { return []; }
}

function ecrire(l: MiniApp[]) {
  try {
    localStorage.setItem(CLE, JSON.stringify(l));
    window.dispatchEvent(new CustomEvent("nexus:persist-update", { detail: { key: CLE } }));
    // La barre latérale doit voir la nouvelle application tout de suite.
    window.dispatchEvent(new CustomEvent("nexus:miniapps"));
  } catch { /* rangement refusé */ }
}

export function ajouterMiniApp(a: Omit<MiniApp, "id" | "creeeLe">): MiniApp {
  const neuve: MiniApp = {
    ...a,
    id: `mini-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    creeeLe: new Date().toISOString(),
  };
  ecrire([...lireMiniApps(), neuve]);
  return neuve;
}

export function retirerMiniApp(id: string) {
  ecrire(lireMiniApps().filter((a) => a.id !== id));
  try { localStorage.removeItem(`nexus.miniapp.${id}`); } catch { /* rien */ }
}

// ── CE QUE LA PETITE APPLICATION A LE DROIT DE DEMANDER ─────────────────────
//
// Une liste FERMÉE. Tout ce qui n'y est pas est refusé, sans discussion. Une
// liste ouverte — « tout sauf… » — laisse toujours passer ce qu'on n'a pas
// imaginé.
export const ACTIONS = [
  "tache",      // ajouter une tâche
  "agenda",     // ajouter un évènement
  "note",       // ajouter une note
  "dire",       // afficher un petit message dans Nexus
  "accent",     // changer la couleur d'ambiance
  "ranger",     // garder une donnée à ELLE (jamais celles de Nexus)
  "relire",     // relire ce qu'elle a rangé
  "ouvrir",     // ouvrir un espace de Nexus
] as const;
export type Action = (typeof ACTIONS)[number];

/// Le petit vocabulaire donné à chaque application, injecté dans son cadre.
/// Elle ne voit RIEN d'autre de Nexus : ni le rangement, ni le reste de la
/// page. `nexus.dire("bonjour")` est tout ce qu'elle sait faire de plus qu'une
/// page web ordinaire.
export function vocabulaire(id: string): string {
  return `<script>
(() => {
  const attentes = new Map();
  let n = 0;
  function demander(quoi, donnees) {
    return new Promise((rendre) => {
      const jeton = ++n;
      attentes.set(jeton, rendre);
      parent.postMessage({ nexusMini: true, id: ${JSON.stringify(id)}, jeton, quoi, donnees }, "*");
      // Une promesse qui ne se résout jamais fige l'application pour toujours.
      setTimeout(() => { if (attentes.has(jeton)) { attentes.delete(jeton); rendre(null); } }, 4000);
    });
  }
  addEventListener("message", (e) => {
    const m = e.data;
    if (!m || !m.nexusReponse || !attentes.has(m.jeton)) return;
    attentes.get(m.jeton)(m.valeur);
    attentes.delete(m.jeton);
  });
  window.nexus = {
    tache:  (texte, quand) => demander("tache", { texte, quand }),
    agenda: (titre, quand) => demander("agenda", { titre, quand }),
    note:   (texte) => demander("note", { texte }),
    dire:   (texte) => demander("dire", { texte }),
    accent: (couleur) => demander("accent", { couleur }),
    ranger: (cle, valeur) => demander("ranger", { cle, valeur }),
    relire: (cle) => demander("relire", { cle }),
    ouvrir: (espace) => demander("ouvrir", { espace }),
  };
})();
</script>`;
}

/// La page complète d'une petite application : son habillage, son vocabulaire,
/// puis son code. L'habillage lui donne l'air de Nexus sans qu'elle ait à s'en
/// occuper — elle n'écrit que ce qu'elle fait.
export function pageComplete(a: MiniApp): string {
  return `<!doctype html><meta charset="utf-8">
<style>
  :root{
    --accent:#6366f1; --fond:#0b0b12; --carte:rgba(255,255,255,.05);
    --bord:rgba(255,255,255,.10); --txt:#f2f2f7; --doux:#a5a5b2;
    --ressort:cubic-bezier(.34,1.4,.5,1); --appui:cubic-bezier(.32,.72,0,1);
    color-scheme:dark;
  }
  *{box-sizing:border-box;margin:0}
  body{background:var(--fond);color:var(--txt);padding:16px;
    font:13.5px/1.55 -apple-system,BlinkMacSystemFont,"SF Pro Text",Inter,system-ui,sans-serif}
  h1,h2,h3{letter-spacing:-.015em;line-height:1.25}
  h1{font-size:19px;font-weight:650;margin-bottom:4px}
  p{color:var(--doux)}
  button{appearance:none;border:1px solid var(--bord);background:var(--carte);
    color:var(--txt);padding:8px 14px;border-radius:11px;cursor:pointer;font:inherit;
    transition:background .16s ease,transform .16s var(--ressort)}
  button:hover{background:rgba(99,102,241,.24)}
  button:active{transform:scale(.97)}
  button.p{background:var(--accent);border-color:transparent;font-weight:600}
  input,textarea,select{background:var(--carte);border:1px solid var(--bord);
    color:var(--txt);padding:8px 11px;border-radius:11px;font:inherit;outline:none}
  input:focus,textarea:focus{border-color:var(--accent)}
  .carte{background:var(--carte);border:1px solid var(--bord);border-radius:14px;padding:13px}
</style>
${vocabulaire(a.id)}
${a.code}`;
}

// ============================================================================
//  FABRIQUER UNE PETITE APPLICATION.
//
//  Aharon : « crée-moi une application pour… ». Nexus écrit alors une petite
//  page, la range, et elle apparaît dans la barre latérale comme un espace.
//
//  DEUX RÈGLES qui décident de tout :
//
//  1. On ne met JAMAIS dans Nexus du code qu'on n'a pas relu. Le modèle rend
//     du texte ; on en extrait le code, et on REFUSE tout ce qui sort du cadre
//     (pas de réseau, pas d'accès au parent, pas de chargement distant). Une
//     application fabriquée tourne isolée, mais le premier verrou est ici.
//
//  2. Sans modèle joignable, on ne rend pas une page vide. Nexus sait déjà
//     fabriquer quelques applications utiles LUI-MÊME, sans rien demander à
//     personne : c'est ce qui fait que ça marche même hors ligne.
// ============================================================================

import { ajouterMiniApp, type MiniApp } from "./miniApps";

export const CONSIGNE_FABRIQUE = `Tu écris une PETITE APPLICATION pour Nexus.

Rends UNIQUEMENT du code, sans un mot autour, sans barrière de code, sous
cette forme exacte :

<h1>Titre court</h1>
… le reste du HTML …
<script> … le JavaScript … </script>

Règles absolues :
- Pas de fetch, pas d'XMLHttpRequest, pas d'import, pas de <link>, pas de
  <script src>. Rien ne doit venir d'internet : tout est dans le code.
- N'utilise ni window.parent, ni window.top, ni localStorage.
- Pour agir sur Nexus, tu disposes UNIQUEMENT de :
    nexus.tache(texte, quand?)     nexus.agenda(titre, "demain à 14h")
    nexus.note(texte)              nexus.dire(texte)
    nexus.accent("#rrggbb")        nexus.ouvrir("nom-de-l-espace")
    await nexus.ranger(cle, valeur)   await nexus.relire(cle)
- Le style de base est déjà là (fond sombre, boutons, cartes) : n'écris du CSS
  que si tu en as vraiment besoin, avec une balise <style>.
- Écris en français. Sois court et utile : une application qui fait UNE chose
  bien vaut mieux qu'un tableau de bord.`;

/// Ce qui n'a rien à faire dans une petite application.
const INTERDITS: [RegExp, string][] = [
  [/\bfetch\s*\(/i, "elle essaie d'aller chercher quelque chose sur internet"],
  [/XMLHttpRequest/i, "elle essaie d'aller chercher quelque chose sur internet"],
  [/\bimport\s*\(/i, "elle essaie de charger du code ailleurs"],
  [/<script[^>]+src=/i, "elle essaie de charger un script depuis internet"],
  [/<link[^>]+href=/i, "elle essaie de charger un fichier depuis internet"],
  [/window\s*\.\s*(parent|top|opener)/i, "elle essaie de sortir de son cadre"],
  [/\blocalStorage\b/i, "elle essaie de toucher au rangement de Nexus"],
  [/\bdocument\s*\.\s*cookie\b/i, "elle essaie de lire des cookies"],
  [/\bnew\s+WebSocket\b/i, "elle essaie d'ouvrir une connexion"],
];

export type Verdict = { code: string } | { refus: string };

/// Extraire le code d'une réponse de modèle, et le refuser s'il déborde.
export function verifier(reponseDuModele: string): Verdict {
  let code = String(reponseDuModele || "").trim()
    .replace(/^```(?:html|js|javascript)?/i, "")
    .replace(/```$/, "")
    .trim();
  // Certains modèles rendent une page entière : on ne garde que le corps.
  const corps = code.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (corps) code = corps[1].trim();
  code = code.replace(/<\/?(?:html|head|body|!doctype)[^>]*>/gi, "").trim();

  if (code.length < 20) return { refus: "le modèle n'a rien rendu d'utilisable" };
  if (code.length > 40000) return { refus: "le code est beaucoup trop long" };
  for (const [re, pourquoi] of INTERDITS) {
    if (re.test(code)) return { refus: pourquoi };
  }
  return { code };
}

// ── CE QUE NEXUS SAIT FABRIQUER TOUT SEUL ───────────────────────────────────
//
// Sans modèle joignable — hors ligne, réserve épuisée — on ne rend pas une
// page vide en s'excusant. Ces quelques applications couvrent les demandes les
// plus fréquentes, et elles sont écrites à la main : elles marchent toujours.
type Recette = { quand: RegExp; nom: string; icone: string; quoi: string; code: string };

const RECETTES: Recette[] = [
  {
    quand: /\b(minuteur|timer|chrono|compte\s*[àa]\s*rebours)\b/i,
    nom: "Minuteur", icone: "⏳", quoi: "Un compte à rebours simple",
    code: `<h1>Minuteur</h1>
<p id="p">Choisis une durée.</p>
<div class="carte" style="text-align:center;margin:14px 0">
  <div id="t" style="font-size:44px;font-weight:200;letter-spacing:-.03em;
       font-variant-numeric:tabular-nums">00:00</div>
</div>
<div style="display:flex;gap:8px;flex-wrap:wrap">
  <button data-s="60">1 min</button><button data-s="300">5 min</button>
  <button data-s="600">10 min</button><button data-s="1500">25 min</button>
  <button id="stop">Arrêter</button>
</div>
<script>
let reste = 0, fil = null;
const t = document.getElementById('t'), p = document.getElementById('p');
const deux = n => String(n).padStart(2,'0');
function afficher(){ t.textContent = deux(Math.floor(reste/60)) + ':' + deux(reste%60); }
function battre(){
  if (reste <= 0) { clearInterval(fil); fil = null; p.textContent = "C'est fini.";
    nexus.dire('Minuteur terminé'); return; }
  reste--; afficher();
}
document.querySelectorAll('[data-s]').forEach(b => b.onclick = () => {
  reste = +b.dataset.s; afficher(); p.textContent = 'En route.';
  clearInterval(fil); fil = setInterval(battre, 1000);
});
document.getElementById('stop').onclick = () => {
  clearInterval(fil); fil = null; reste = 0; afficher(); p.textContent = 'Arrêté.';
};
afficher();
</script>`,
  },
  {
    quand: /\b(d[ée]s?|hasard|al[ée]atoire|tirage|pile\s*ou\s*face)\b/i,
    nom: "Tirage au sort", icone: "🎲", quoi: "Un dé, une pièce, ou un nom au hasard",
    code: `<h1>Tirage au sort</h1>
<p>Un dé, une pièce, ou l'un de tes noms.</p>
<div class="carte" style="text-align:center;margin:14px 0">
  <div id="r" style="font-size:40px;font-weight:600">—</div>
</div>
<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
  <button id="de" class="p">Dé (1–6)</button>
  <button id="piece">Pile ou face</button>
  <button id="noms">Parmi mes noms</button>
</div>
<input id="liste" style="width:100%" placeholder="Léa, Tom, Inès…">
<script>
const r = document.getElementById('r');
const montrer = v => { r.textContent = v; r.animate(
  [{transform:'scale(.7)',opacity:0},{transform:'scale(1)',opacity:1}],
  {duration:280, easing:'cubic-bezier(.34,1.4,.5,1)'}); };
document.getElementById('de').onclick = () => montrer(1 + Math.floor(Math.random()*6));
document.getElementById('piece').onclick = () => montrer(Math.random()<.5 ? 'Pile' : 'Face');
document.getElementById('noms').onclick = () => {
  const l = document.getElementById('liste').value.split(/[,;]/).map(s=>s.trim()).filter(Boolean);
  if (!l.length) return montrer('…');
  montrer(l[Math.floor(Math.random()*l.length)]);
};
</script>`,
  },
  {
    quand: /\b(compteur|compter|score)\b/i,
    nom: "Compteur", icone: "🔢", quoi: "Un compteur qui se souvient",
    code: `<h1>Compteur</h1>
<p>Il se souvient d'une fois sur l'autre.</p>
<div class="carte" style="text-align:center;margin:14px 0">
  <div id="n" style="font-size:52px;font-weight:200;font-variant-numeric:tabular-nums">0</div>
</div>
<div style="display:flex;gap:8px">
  <button id="moins">−1</button>
  <button id="plus" class="p" style="flex:1">+1</button>
  <button id="zero">Remettre à zéro</button>
</div>
<script>
const el = document.getElementById('n');
let n = 0;
(async () => { n = (await nexus.relire('n')) || 0; el.textContent = n; })();
const poser = v => { n = v; el.textContent = n; nexus.ranger('n', n); };
document.getElementById('plus').onclick = () => poser(n + 1);
document.getElementById('moins').onclick = () => poser(n - 1);
document.getElementById('zero').onclick = () => poser(0);
</script>`,
  },
];

/// Fabriquer sans modèle, quand on reconnaît la demande.
export function fabriquerSansModele(demande: string): MiniApp | null {
  const r = RECETTES.find((x) => x.quand.test(demande));
  if (!r) return null;
  return ajouterMiniApp({ nom: r.nom, icone: r.icone, quoi: r.quoi, code: r.code, demande });
}

/// Un nom et un emoji tirés de la demande, quand le modèle n'en propose pas.
export function nommer(demande: string): { nom: string; icone: string } {
  const d = demande.toLowerCase();
  const table: [RegExp, string, string][] = [
    [/minuteur|chrono|timer/, "Minuteur", "⏳"],
    [/m[ée]t[ée]o/, "Météo", "🌤"],
    [/note|carnet/, "Carnet", "📝"],
    [/liste|course/, "Ma liste", "🧾"],
    [/musique|son/, "Musique", "🎵"],
    [/jeu|jouer/, "Petit jeu", "🎮"],
    [/couleur|fond/, "Couleurs", "🎨"],
    [/calcul|convert/, "Calcul", "🔢"],
    [/r[ée]vis|cours|le[çc]on/, "Révisions", "📚"],
  ];
  for (const [re, nom, icone] of table) if (re.test(d)) return { nom, icone };
  // À défaut : les premiers mots utiles de la demande.
  const mots = demande
    .replace(/^.*?(?:cr[ée]e|fabrique|fais)(?:[- ]moi)?\s+(?:une?\s+)?(?:petite\s+)?(?:appli\w*)?\s*/i, "")
    .replace(/\bqui\b|\bpour\b/gi, " ")
    .trim().split(/\s+/).slice(0, 3).join(" ");
  const nom = (mots || "Mon application").slice(0, 28);
  return { nom: nom.charAt(0).toUpperCase() + nom.slice(1), icone: "✨" };
}

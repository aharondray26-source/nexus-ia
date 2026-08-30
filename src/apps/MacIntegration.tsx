import { useRef, useState } from "react";
import { Image as ImageIcon, Download, Monitor, Puzzle, Check, Info } from "lucide-react";
import { useSettings, resolveWallpaper } from "../os/useSettings";
import { creerZip, fichierDistant, enOctets } from "../lib/zip";

const SITE = "https://nexus-espace.netlify.app/";

/* ============ INTEGRATION macOS ============
   Trois choses concretes, sans rien installer d'obscur :
   1. Fond d'ecran Nexus : on genere une vraie image, aux dimensions de ton
      ecran, avec l'ambiance et la couleur que tu as choisies.
   2. Widgets macOS : via l'application installee (raccourcis dans le Dock).
   3. Extension navigateur : Nexus s'ouvre a chaque nouvel onglet.            */

const TAILLES = [
  { nom: "Retina 16 pouces", w: 3456, h: 2234 },
  { nom: "Retina 14 pouces", w: 3024, h: 1964 },
  { nom: "Écran 5K", w: 5120, h: 2880 },
  { nom: "Full HD", w: 1920, h: 1080 },
  { nom: "iPad Pro", w: 2732, h: 2048 },
];

export default function MacIntegration() {
  const accent = useSettings((s) => s.accent);
  const wallpaper = useSettings((s) => s.wallpaper);
  const customWallpaper = useSettings((s) => s.customWallpaper);
  const userName = useSettings((s) => s.userName);
  const [taille, setTaille] = useState(TAILLES[0]);
  const [avecWidgets, setAvecWidgets] = useState(true);
  const [fait, setFait] = useState<string | null>(null);
  const apercu = useRef<HTMLCanvasElement>(null);

  // Dessine le fond d'ecran a la taille demandee.
  function dessiner(cv: HTMLCanvasElement, W: number, H: number) {
    const c = cv.getContext("2d");
    if (!c) return;
    cv.width = W; cv.height = H;

    // Fond profond
    c.fillStyle = "#07070b";
    c.fillRect(0, 0, W, H);

    // Nappes de couleur (la meme aurore que dans Nexus)
    const nappe = (x: number, y: number, r: number, col: string, a: number) => {
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, col); g.addColorStop(1, "rgba(0,0,0,0)");
      c.globalAlpha = a; c.fillStyle = g; c.fillRect(0, 0, W, H); c.globalAlpha = 1;
    };
    nappe(W * 0.18, H * 0.12, Math.max(W, H) * 0.55, accent, 0.36);
    nappe(W * 0.86, H * 0.88, Math.max(W, H) * 0.5, accent, 0.22);
    nappe(W * 0.55, H * 0.5, Math.max(W, H) * 0.4, "#1e293b", 0.3);

    // Grille discrete
    c.strokeStyle = "rgba(255,255,255,0.035)";
    c.lineWidth = Math.max(1, W / 2400);
    const pas = Math.round(W / 34);
    for (let x = 0; x < W; x += pas) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
    for (let y = 0; y < H; y += pas) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }

    // Zones libres a gauche et a droite : la ou macOS pose ses widgets,
    // le fond reste calme pour qu'ils restent lisibles.
    if (avecWidgets) {
      const zone = (x: number) => {
        c.fillStyle = "rgba(0,0,0,0.16)";
        c.fillRect(x, H * 0.1, W * 0.19, H * 0.8);
      };
      zone(W * 0.035); zone(W * 0.775);
    }

    // Signature Nexus, discrete, en bas au centre
    c.textAlign = "center";
    c.fillStyle = "rgba(255,255,255,0.30)";
    c.font = `300 ${Math.round(H / 30)}px -apple-system, BlinkMacSystemFont, sans-serif`;
    c.fillText("NEXUS", W / 2, H * 0.9);
    c.fillStyle = "rgba(255,255,255,0.16)";
    c.font = `400 ${Math.round(H / 68)}px -apple-system, sans-serif`;
    c.letterSpacing = "4px";
    c.fillText(userName ? `L'espace de ${userName}` : "Ton espace de travail", W / 2, H * 0.935);
  }

  function telecharger() {
    const cv = document.createElement("canvas");
    dessiner(cv, taille.w, taille.h);
    cv.toBlob((b) => {
      if (!b) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(b);
      a.download = `nexus-fond-${taille.w}x${taille.h}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 3000);
      setFait("Image enregistrée dans tes Téléchargements.");
    }, "image/png");
  }

  // L'extension du navigateur, en UN seul fichier .zip.
  // Refondue : vrai style Nexus, menu contextuel, raccourcis vers les espaces,
  // et tout ce qu'elle enregistre passe par ton compte — donc arrive partout.
  async function telechargerExtension() {
    setFait("Préparation de l'extension…");
    try {
      const manifest = {
        manifest_version: 3,
        name: "Nexus",
        version: "2.1.0",
        description:
          "Ton espace Nexus à chaque onglet. Enregistre une note, une tâche ou " +
          "un morceau de page choisie — tout rejoint ton compte.",
        icons: { "16": "icones/16.png", "48": "icones/48.png", "128": "icones/128.png" },
        permissions: ["contextMenus", "storage"],
        background: { service_worker: "fond.js" },
        chrome_url_overrides: { newtab: "onglet.html" },
        action: {
          default_title: "Nexus",
          default_popup: "popup.html",
          default_icon: { "16": "icones/16.png", "48": "icones/48.png" },
        },
      };

      const style = `
  *{box-sizing:border-box;margin:0}
  body{width:296px;padding:0;background:#0b0b11;color:#f2f2f7;
    font:13px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif}
  .haut{display:flex;align-items:center;gap:9px;padding:14px 15px 11px}
  .haut img{width:26px;height:26px;border-radius:7px}
  .haut b{font-size:13.5px;font-weight:600;letter-spacing:-.01em;flex:1}
  .haut span{font-size:10.5px;color:#8a8a95}
  .corps{padding:0 15px 14px;display:flex;flex-direction:column;gap:10px}
  .onglets{display:flex;gap:5px;background:rgba(255,255,255,.05);padding:3px;
    border-radius:11px}
  .onglets button{flex:1;border:0;border-radius:8px;padding:6px;font:inherit;
    font-size:12px;color:#a9a9b4;background:transparent;cursor:pointer}
  .onglets button.on{background:#6366f1;color:#fff;font-weight:500}
  textarea{width:100%;height:78px;resize:none;border-radius:12px;padding:10px 12px;
    background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.11);
    color:#f2f2f7;font:inherit;outline:none;transition:border-color .15s}
  textarea:focus{border-color:#6366f1;background:rgba(255,255,255,.09)}
  textarea::placeholder{color:#6f6f7a}
  .r{display:flex;gap:7px}
  .r button{flex:1;border:0;border-radius:10px;padding:9px;font:inherit;
    font-weight:500;color:#f2f2f7;background:rgba(255,255,255,.08);cursor:pointer;
    transition:background .15s}
  .r button:hover{background:rgba(255,255,255,.16)}
  .r button.p{background:#6366f1;color:#fff}
  .r button.p:hover{background:#7679f5}
  .esp{display:flex;flex-wrap:wrap;gap:5px;padding-top:2px}
  .esp button{border:0;border-radius:20px;padding:5px 11px;font:inherit;font-size:11.5px;
    color:#c9c9d4;background:rgba(255,255,255,.06);cursor:pointer}
  .esp button:hover{background:rgba(99,102,241,.35);color:#fff}
  .pied{border-top:1px solid rgba(255,255,255,.08);padding:9px 15px;
    font-size:11px;color:#8a8a95;display:flex;align-items:center;gap:6px}
  .pt{width:6px;height:6px;border-radius:50%;background:#4ade80}
  .ok{color:#4ade80}`;

      const popup = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
<style>${style}</style></head><body>
  <div class="haut"><img src="icones/48.png" alt="">
    <b>Nexus</b><span id="etat"></span></div>
  <div class="corps">
    <div class="onglets">
      <button id="tNote" class="on">Note</button>
      <button id="tTache">Tâche</button>
    </div>
    <textarea id="texte" placeholder="Une idée, un rappel…" autofocus></textarea>
    <div class="r">
      <button class="p" id="ok">Enregistrer</button>
      <button id="page">Cette page</button>
    </div>
    <div class="esp">
      <button data-app="notes">Notes</button>
      <button data-app="tasks">Tâches</button>
      <button data-app="ai">Nexus IA</button>
      <button data-app="files">Fichiers</button>
      <button data-app="calendar">Agenda</button>
    </div>
  </div>
  <div class="pied"><span class="pt"></span><span id="info">Tout rejoint ton compte Nexus</span></div>
  <script src="popup.js"></script>
</body></html>`;

      // Pas de code en ligne : les extensions modernes l'interdisent.
      const popupJs = `const SITE = ${JSON.stringify(SITE)};
let mode = "note";
const $ = (id) => document.getElementById(id);

function basculer(m) {
  mode = m;
  $("tNote").classList.toggle("on", m === "note");
  $("tTache").classList.toggle("on", m === "tache");
  $("texte").placeholder = m === "note" ? "Une idée, un rappel…" : "À faire…";
  $("texte").focus();
}
$("tNote").addEventListener("click", () => basculer("note"));
$("tTache").addEventListener("click", () => basculer("tache"));

function envoyer(contenu) {
  const t = (contenu || "").trim();
  if (!t) { $("texte").focus(); return; }
  chrome.tabs.create({ url: SITE + "?" + mode + "=" + encodeURIComponent(t) });
  window.close();
}
$("ok").addEventListener("click", () => envoyer($("texte").value));
$("texte").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) envoyer($("texte").value);
});

// « Cette page » : le titre et l'adresse de l'onglet en cours.
$("page").addEventListener("click", async () => {
  const [onglet] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!onglet) return;
  envoyer(onglet.title + "\\n" + onglet.url);
});

document.querySelectorAll(".esp button").forEach((b) => {
  b.addEventListener("click", () => {
    chrome.tabs.create({ url: SITE + "?app=" + b.dataset.app });
    window.close();
  });
});

// On garde le brouillon : fermer la fenêtre ne doit pas effacer ce qu'on écrit.
chrome.storage.local.get(["brouillon", "mode"], (d) => {
  if (d.brouillon) $("texte").value = d.brouillon;
  if (d.mode) basculer(d.mode);
});
$("texte").addEventListener("input", () => {
  chrome.storage.local.set({ brouillon: $("texte").value, mode });
});`;

      // Le menu du clic droit : sélectionner du texte n'importe où, l'envoyer.
      const fondJs = `const SITE = ${JSON.stringify(SITE)};
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "nexus-note", title: "Enregistrer dans Nexus", contexts: ["selection"],
  });
  chrome.contextMenus.create({
    id: "nexus-tache", title: "Ajouter aux tâches Nexus", contexts: ["selection"],
  });
  chrome.contextMenus.create({
    id: "nexus-page", title: "Enregistrer cette page dans Nexus", contexts: ["page"],
  });
});

chrome.contextMenus.onClicked.addListener((info, onglet) => {
  let cle = "note", contenu = info.selectionText || "";
  if (info.menuItemId === "nexus-tache") cle = "tache";
  if (info.menuItemId === "nexus-page") {
    contenu = ((onglet && onglet.title) || "Page") + "\\n" + (info.pageUrl || "");
  }
  if (!contenu.trim()) return;
  chrome.tabs.create({ url: SITE + "?" + cle + "=" + encodeURIComponent(contenu) });
});`;

      const ongletHtml = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Nexus</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%}
body{background:#07070b;color:#f2f2f7;overflow:hidden;
  font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  -webkit-font-smoothing:antialiased}
#lueur{position:fixed;inset:-30%;z-index:0;pointer-events:none;filter:blur(90px);opacity:.5}
#lueur i{position:absolute;border-radius:50%;display:block}
#lueur i:nth-child(1){width:46vw;height:46vw;left:8%;top:6%;background:#4f46e5;
  animation:d1 26s ease-in-out infinite}
#lueur i:nth-child(2){width:38vw;height:38vw;right:6%;top:22%;background:#7c3aed;
  animation:d2 31s ease-in-out infinite}
#lueur i:nth-child(3){width:34vw;height:34vw;left:34%;bottom:2%;background:#0ea5e9;
  animation:d3 37s ease-in-out infinite;opacity:.65}
@keyframes d1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(9vw,6vh) scale(1.12)}}
@keyframes d2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-8vw,9vh) scale(.9)}}
@keyframes d3{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(6vw,-7vh) scale(1.1)}}
main{position:relative;z-index:1;width:100%;max-width:660px;padding:0 26px;
  display:flex;flex-direction:column;align-items:center;gap:26px}
#heure{font-size:78px;font-weight:200;letter-spacing:-.045em;line-height:1;
  font-variant-numeric:tabular-nums}
#bonjour{font-size:16.5px;color:#a5a5b2;letter-spacing:-.01em;margin-top:-14px}
form{width:100%;position:relative;display:flex;align-items:center}
#q{width:100%;border:1px solid rgba(255,255,255,.13);border-radius:16px;
  background:rgba(255,255,255,.07);color:#f2f2f7;font:inherit;font-size:16px;
  padding:16px 116px 16px 48px;outline:none;
  transition:border-color .18s,background .18s,box-shadow .18s}
#q::placeholder{color:#77777f}
#q:focus{border-color:rgba(99,102,241,.75);background:rgba(255,255,255,.1);
  box-shadow:0 0 0 4px rgba(99,102,241,.16)}
.loupe{position:absolute;left:17px;width:17px;height:17px;opacity:.45;pointer-events:none}
#ia{position:absolute;right:8px;border:0;border-radius:11px;padding:9px 14px;
  font:inherit;font-size:13px;font-weight:500;color:#fff;background:#6366f1;
  cursor:pointer;transition:background .15s,transform .1s}
#ia:hover{background:#7679f5}
#ia:active{transform:scale(.96)}
#astuce{font-size:12.5px;color:#6e6e78;margin-top:-16px;height:16px}
#esp{display:flex;flex-wrap:wrap;gap:9px;justify-content:center}
#esp button{border:1px solid rgba(255,255,255,.09);border-radius:13px;
  padding:10px 15px;font:inherit;font-size:13.5px;color:#c9c9d4;
  background:rgba(255,255,255,.05);cursor:pointer;display:flex;align-items:center;
  gap:7px;transition:background .16s,color .16s,transform .12s,border-color .16s}
#esp button:hover{background:rgba(99,102,241,.26);border-color:rgba(99,102,241,.5);
  color:#fff;transform:translateY(-2px)}
#esp button b{font-size:15px;font-weight:400;line-height:1}
#bas{position:fixed;bottom:22px;z-index:1;font-size:12px;color:#55555e;
  display:flex;align-items:center;gap:7px}
#bas span{width:5px;height:5px;border-radius:50%;background:#4ade80}
</style></head><body>
<div id="lueur"><i></i><i></i><i></i></div>
<main>
  <div id="heure">--:--</div>
  <div id="bonjour"></div>
  <form id="f" autocomplete="off">
    <svg class="loupe" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"></circle>
      <path d="M20 20l-3.6-3.6"></path></svg>
    <input id="q" placeholder="Chercher sur le web, ou demander à Nexus…" autofocus>
    <button type="button" id="ia">Nexus</button>
  </form>
  <div id="astuce">Entrée pour chercher · le bouton Nexus pour demander à l’IA</div>
  <div id="esp"></div>
</main>
<div id="bas"><span></span>Nexus — conçu par Aharon Dray</div>
<script src="onglet.js"></script>
</body></html>
`;

      const ongletJs = `// Page d'accueil Nexus — entierement locale : elle ne depend d'aucun site.
const SITE = "https://nexus-espace.netlify.app";

const deuxChiffres = (n) => (n < 10 ? "0" + n : "" + n);

function salut(h) {
  if (h < 5) return "Bonne nuit";
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet",
  "août", "septembre", "octobre", "novembre", "décembre"];

let prenom = "";

function battre() {
  const d = new Date();
  document.getElementById("heure").textContent =
    deuxChiffres(d.getHours()) + ":" + deuxChiffres(d.getMinutes());
  const date = JOURS[d.getDay()] + " " + d.getDate() + " " + MOIS[d.getMonth()];
  document.getElementById("bonjour").textContent =
    salut(d.getHours()) + (prenom ? " " + prenom : "") + " · " + date;
}

// Le prenom vient du compte Nexus s'il a ete enregistre par le popup.
try {
  chrome.storage?.local.get(["nexusPrenom"], (r) => {
    if (r && r.nexusPrenom) { prenom = r.nexusPrenom; battre(); }
  });
} catch (_) {}

battre();
setInterval(battre, 1000);

// Une chaine est-elle une adresse plutot qu'une recherche ?
function estUneAdresse(t) {
  if (/\\s/.test(t)) return false;
  if (/^https?:\\/\\//i.test(t)) return true;
  return /^[\\w-]+(\\.[\\w-]+)+(\\/.*)?$/.test(t);
}

function allerA(url) { window.location.href = url; }

document.getElementById("f").addEventListener("submit", (e) => {
  e.preventDefault();
  const t = document.getElementById("q").value.trim();
  if (!t) return;
  if (estUneAdresse(t)) {
    allerA(/^https?:\\/\\//i.test(t) ? t : "https://" + t);
  } else {
    allerA("https://www.google.com/search?q=" + encodeURIComponent(t));
  }
});

document.getElementById("ia").addEventListener("click", () => {
  const t = document.getElementById("q").value.trim();
  allerA(SITE + (t ? "?ia=" + encodeURIComponent(t) : ""));
});

// Les espaces Nexus, en raccourcis.
const ESPACES = [
  ["Chat", "💬", "chat"],
  ["Notes", "📝", "notes"],
  ["Tâches", "✓", "tasks"],
  ["Calendrier", "📅", "calendar"],
  ["Fichiers", "📁", "files"],
  ["École", "🎓", "school"],
];

const esp = document.getElementById("esp");
for (const [nom, glyphe, app] of ESPACES) {
  const b = document.createElement("button");
  const g = document.createElement("b");
  g.textContent = glyphe;
  b.appendChild(g);
  b.appendChild(document.createTextNode(nom));
  b.addEventListener("click", () => allerA(SITE + "?app=" + app));
  esp.appendChild(b);
}

// « / » remet le curseur dans la recherche, comme partout ailleurs.
document.addEventListener("keydown", (e) => {
  if (e.key === "/" && document.activeElement !== document.getElementById("q")) {
    e.preventDefault();
    document.getElementById("q").focus();
  }
});
`;

      const lisezMoi = `EXTENSION NEXUS 2.1 — installation gratuite, 4 clics

SI TU AVAIS DEJA UNE VERSION DE NEXUS : supprime-la d'abord.
Sur chrome://extensions, sur la carte « Nexus », clique « Supprimer ».
Recharger par-dessus ne remplace pas les anciens fichiers.

1. Decompresse ce fichier : tu obtiens un dossier « nexus-extension ».
2. Ouvre ton navigateur sur  chrome://extensions
3. Active « Mode developpeur » (interrupteur en haut a droite).
4. Clique « Charger l'extension non empaquetee » et choisis le dossier.

CE QUE TU OBTIENS

  · Chaque nouvel onglet devient ta page d'accueil Nexus : l'heure,
    la date, et une seule barre au centre.
      - Entree        -> cherche sur le web (ou ouvre l'adresse tapee).
      - bouton Nexus  -> pose la question a l'IA dans ton espace.
      - « / »         -> remet le curseur dans la barre.
    En dessous, un raccourci vers chacun de tes espaces.

  · Le bouton Nexus dans la barre d'outils : une note ou une tache en
    deux secondes. « Cette page » enregistre le titre et l'adresse.

  · Clic droit sur du texte selectionne n'importe ou sur le web :
    « Enregistrer dans Nexus » ou « Ajouter aux taches Nexus ».

Tout ce qu'elle enregistre passe par ton compte Nexus : tu le retrouves
sur le site, sur ton Mac et sur tes autres appareils.

NOUVEAU EN 2.1 — la page d'accueil est desormais construite dans
l'extension elle-meme. Avant, elle affichait le site a l'interieur d'un
cadre : tant que le site n'etait pas remis en ligne, tu voyais l'ancienne
version. Maintenant elle s'affiche instantanement, meme sans connexion.

Marche aussi sur Edge, Brave, Opera et Vivaldi (meme procedure).

A savoir : publier une extension sur le Chrome Web Store demande une
inscription payante unique de 5 $ chez Google. L'installation ci-dessus
n'en depend pas et donne exactement la meme extension.
`;

      const [i16, i48, i128] = await Promise.all([
        fichierDistant("/ext/icone-16.png"),
        fichierDistant("/ext/icone-48.png"),
        fichierDistant("/ext/icone-128.png"),
      ]);

      const zip = creerZip([
        { nom: "nexus-extension/manifest.json", donnees: enOctets(JSON.stringify(manifest, null, 2)) },
        { nom: "nexus-extension/onglet.html", donnees: enOctets(ongletHtml) },
        { nom: "nexus-extension/onglet.js", donnees: enOctets(ongletJs) },
        { nom: "nexus-extension/popup.html", donnees: enOctets(popup) },
        { nom: "nexus-extension/popup.js", donnees: enOctets(popupJs) },
        { nom: "nexus-extension/fond.js", donnees: enOctets(fondJs) },
        { nom: "nexus-extension/icones/16.png", donnees: i16 },
        { nom: "nexus-extension/icones/48.png", donnees: i48 },
        { nom: "nexus-extension/icones/128.png", donnees: i128 },
        { nom: "nexus-extension/LISEZ-MOI.txt", donnees: enOctets(lisezMoi) },
      ]);

      const a = document.createElement("a");
      a.href = URL.createObjectURL(zip);
      a.download = "nexus-extension.zip";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      setFait("nexus-extension.zip téléchargé. Décompresse-le, puis suis LISEZ-MOI.txt.");
    } catch (e) {
      setFait("Échec : " + (e as Error).message);
    }
  }

  function voirApercu() {
    if (apercu.current) dessiner(apercu.current, 640, 400);
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto pr-1">
      <div>
        <h2 className="text-base font-semibold text-nexus-text">Nexus sur ton Mac</h2>
        <p className="mt-1 text-xs leading-relaxed text-nexus-muted">
          Une vraie application native, dans la barre de menus — même navigateur
          fermé. Tes notes et tes scores rejoignent ton compte Nexus.
        </p>
      </div>

      {/* ---------- L'APPLICATION NATIVE ---------- */}
      <div className="nx-widget !gap-3 !p-4">
        <div className="nx-widget-title">
          <span className="nx-widget-icon" style={{ backgroundColor: accent + "26", color: accent }}>
            <Monitor size={15} />
          </span>
          Application macOS
        </div>
        <ul className="flex flex-col gap-1.5 text-xs leading-relaxed text-nexus-muted">
          <li>• <span className="text-nexus-text">Chat Nexus</span> — il ouvre tes applications, retrouve
            tes fichiers, lit un PDF ou une image que tu lui donnes.</li>
          <li>• <span className="text-nexus-text">Capture de texte</span> — sélectionne une zone
            de l'écran, tout le texte part dans le presse-papiers. Hors ligne.</li>
          <li>• <span className="text-nexus-text">Widgets sur le bureau</span> — horloge, météo, tâches,
            notes et captures. Déplaçables, et ils s'adaptent à leur contenu.</li>
          <li>• <span className="text-nexus-text">Dock Nexus</span> — se range tout seul contre un bord,
            à la verticale ou à l'horizontale.</li>
          <li>• <span className="text-nexus-text">École Directe</span> — notes, devoirs et emploi du
            temps, sans passer par leur site.</li>
          <li>• <span className="text-nexus-text">Arena</span> — le jeu, avec tes scores reliés à ton compte.</li>
          <li>• <span className="text-nexus-text">Fond d'écran vivant</span> et lancement au démarrage.</li>
        </ul>
        <a href="/Nexus-macOS.zip" download className="nx-btn nx-btn-primary w-full">
          <Download size={14} /> Télécharger Nexus pour macOS
        </a>
        <div className="flex flex-col gap-1.5 rounded-lg bg-white/[0.05] p-3 text-[11px] leading-relaxed text-nexus-muted">
          <span className="font-semibold text-nexus-text">Installation, étape par étape</span>
          <span>1. Double-clique le .zip téléchargé : tu obtiens <span className="text-nexus-text">Nexus.app</span>.</span>
          <span>2. Glisse-le dans ton dossier <span className="text-nexus-text">Applications</span>.</span>
          <span>3. Double-clique dessus. macOS refuse la première fois : c'est normal,
            il le fait pour toute application qui ne vient pas de l'App&nbsp;Store.</span>
          <span>4. Va dans <span className="text-nexus-text">Réglages Système → Confidentialité
            et sécurité</span>, descends en bas, et clique
            <span className="text-nexus-text"> « Ouvrir quand même »</span>.</span>
          <span>5. Une icône apparaît dans ta barre de menus, en haut à droite. C'est fait.</span>
          <span className="pt-1">Nexus demandera l'autorisation « Enregistrement de l'écran »
            la première fois que tu captures du texte — c'est ce qui lui permet de lire
            ton écran. La reconnaissance se fait sur ton Mac, rien n'est envoyé.</span>
        </div>
      </div>

      {/* ---------- FOND D'ECRAN EN IMAGE ---------- */}
      <div className="nx-widget !gap-3 !p-4">
        <div className="nx-widget-title">
          <span className="nx-widget-icon" style={{ backgroundColor: accent + "26", color: accent }}>
            <ImageIcon size={15} />
          </span>
          Fond d'écran en image
        </div>
        <p className="text-xs leading-relaxed text-nexus-muted">
          Si tu préfères un fond fixe, sans application : une image aux dimensions
          exactes de ton écran, dans ta couleur d'accent.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {TAILLES.map((t) => (
            <button key={t.nom} onClick={() => setTaille(t)}
              className={`nx-chip ${taille.nom === t.nom ? "nx-chip-active" : ""}`}>
              {t.nom}
            </button>
          ))}
        </div>
        <button onClick={() => setAvecWidgets((v) => !v)}
          className={`nx-chip w-fit ${avecWidgets ? "nx-chip-active" : ""}`}>
          {avecWidgets ? "✓ " : ""}Zones calmes pour les widgets
        </button>
        <canvas ref={apercu} className="w-full rounded-xl border border-nexus-border" style={{ aspectRatio: "16/10" }} />
        <div className="flex gap-2">
          <button onClick={voirApercu} className="nx-btn nx-btn-secondary flex-1">Aperçu</button>
          <button onClick={telecharger} className="nx-btn nx-btn-primary flex-1">
            <Download size={14} /> {taille.w}×{taille.h}
          </button>
        </div>
      </div>

      {/* ---------- EXTENSION ---------- */}
      <div className="nx-widget !gap-3 !p-4">
        <div className="nx-widget-title">
          <span className="nx-widget-icon" style={{ backgroundColor: accent + "26", color: accent }}>
            <Puzzle size={15} />
          </span>
          Extension navigateur
        </div>
        <ul className="flex flex-col gap-1.5 text-xs leading-relaxed text-nexus-muted">
          <li>• <span className="text-nexus-text">Chaque nouvel onglet</span> ouvre ton espace Nexus.</li>
          <li>• <span className="text-nexus-text">Note ou tâche en deux secondes</span> depuis la barre d'outils,
            avec des raccourcis vers tes espaces.</li>
          <li>• <span className="text-nexus-text">Clic droit sur du texte</span>, n'importe où sur le web :
            « Enregistrer dans Nexus ».</li>
          <li>• <span className="text-nexus-text">« Cette page »</span> garde le titre et l'adresse de l'onglet.</li>
          <li>• Tout passe par <span className="text-nexus-text">ton compte</span> : tu le retrouves sur le site et sur ton Mac.</li>
        </ul>
        <button onClick={telechargerExtension} className="nx-btn nx-btn-primary w-full">
          <Download size={14} /> Télécharger l'extension (.zip)
        </button>
        <div className="rounded-lg bg-white/[0.05] p-3 text-[11px] leading-relaxed text-nexus-muted">
          <span className="font-semibold text-nexus-text">Installation gratuite :</span> décompresse,
          va sur <span className="text-nexus-text">chrome://extensions</span>, active le
          « Mode développeur », puis « Charger l'extension non empaquetée ».
          Publier sur le Chrome Web Store demanderait une inscription à 5 $ chez Google —
          cette installation-là n'en dépend pas et donne exactement la même extension.
        </div>
      </div>

      {fait && (
        <p className="flex items-start gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-[11px] leading-relaxed text-emerald-300">
          <Check size={13} className="mt-0.5 shrink-0" /> {fait}
        </p>
      )}
    </div>
  );
}

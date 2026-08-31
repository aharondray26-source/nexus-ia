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
        version: "2.3.0",
        description:
          "Ton espace Nexus à chaque onglet. Enregistre une note, une tâche ou " +
          "un morceau de page choisie — tout rejoint ton compte.",
        icons: { "16": "icones/16.png", "48": "icones/48.png", "128": "icones/128.png" },
        permissions: ["contextMenus", "storage"],
        background: { service_worker: "fond.js" },
        chrome_url_overrides: { newtab: "onglet.html" },
        // Rien n'est demande a l'installation : ces sites ne sont
        // reclames que si une cle OpenAI/Groq/Mistral/OpenRouter est
        // ajoutee, car eux seuls refusent les appels du navigateur.
        optional_host_permissions: ["https://api.openai.com/*", "https://api.groq.com/*", "https://api.mistral.ai/*", "https://openrouter.ai/*"],
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
<style>
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
  .ok{color:#4ade80}
  .pied{justify-content:space-between}
  .minus{border:0;background:transparent;color:#7b7b86;font:inherit;font-size:11px;
    padding:3px 6px;border-radius:7px;cursor:pointer;transition:color .15s,background .15s}
  .minus:hover{color:#f2f2f7;background:rgba(255,255,255,.09)}</style></head><body>
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
      <button data-app="nexus-chat">Nexus IA</button>
      <button data-app="files">Fichiers</button>
      <button data-app="calendar">Agenda</button>
      <button data-neo="1">🎓 NeoSchool</button>
    </div>
  </div>
  <div class="pied">
    <span class="pt"></span>
    <span id="info">Enregistré dans Nexus sur ce navigateur</span>
    <button id="compte" class="minus">Compte</button>
    <button id="mac" class="minus" title="Télécharger Nexus pour macOS">macOS</button>
  </div>
  <script src="popup.js"></script>
</body></html>`;

      // Pas de code en ligne : les extensions modernes l'interdisent.
      const popupJs = `const SITE = "https://nexus-espace.netlify.app/";
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

// Les raccourcis d'espace ouvrent le site EN DEMANDANT l'espace : il s'affiche
// alors en grand, centre. Avant, on tombait sur l'accueil sans rien de plus.
document.querySelectorAll(".esp button").forEach((b) => {
  b.addEventListener("click", () => {
    // NeoSchool est un espace a part entiere : il a sa propre adresse.
    const u = b.dataset.neo
      ? "https://neo-school-nine.vercel.app/"
      : SITE + "?app=" + b.dataset.app;
    chrome.tabs.create({ url: u });
    window.close();
  });
});

// Le compte. On ne PRETEND pas que tout est synchronise : tant qu'Aharon ne
// s'est pas connecte sur le site, ses notes ne vivent que dans ce navigateur.
// Le pied de la fenetre le dit maintenant honnetement, et ce bouton mene la ou
// on se connecte.
$("compte").addEventListener("click", () => {
  chrome.tabs.create({ url: SITE + "?app=settings" });
  window.close();
});
$("mac").addEventListener("click", () => {
  chrome.tabs.create({ url: SITE + "Nexus-macOS.zip" });
  window.close();
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
body{background:#07070b;color:var(--txt,#f2f2f7);overflow:hidden;
  font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;
  -webkit-font-smoothing:antialiased}

/* ---- le fond, remplace par les reglages ---- */
#fond{position:fixed;inset:0;z-index:0;background:#07070b;
  background-size:cover;background-position:center;transition:opacity .5s}
#voile{position:fixed;inset:0;z-index:1;pointer-events:none;
  background:rgba(6,6,10,var(--voile,0));transition:background .35s}
#lueur{position:fixed;inset:-30%;z-index:0;pointer-events:none;filter:blur(90px);opacity:.5}
#lueur i{position:absolute;border-radius:50%;display:block}
#lueur i:nth-child(1){width:46vw;height:46vw;left:8%;top:6%;background:var(--l1,#4f46e5);
  animation:d1 26s ease-in-out infinite}
#lueur i:nth-child(2){width:38vw;height:38vw;right:6%;top:22%;background:var(--l2,#7c3aed);
  animation:d2 31s ease-in-out infinite}
#lueur i:nth-child(3){width:34vw;height:34vw;left:34%;bottom:2%;background:var(--l3,#0ea5e9);
  animation:d3 37s ease-in-out infinite;opacity:.65}
@keyframes d1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(9vw,6vh) scale(1.12)}}
@keyframes d2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-8vw,9vh) scale(.9)}}
@keyframes d3{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(6vw,-7vh) scale(1.1)}}
body.calme #lueur{animation:none}
body.calme #lueur i{animation:none}

/* ---- la scene centrale ---- */
main{position:relative;z-index:2;height:100%;display:flex;flex-direction:column;
  align-items:center;justify-content:center;gap:26px;padding:0 26px;
  transition:transform .5s cubic-bezier(.22,1,.36,1),opacity .35s}
body.ouvert main{transform:translateY(-9vh)}
#tete{display:flex;flex-direction:column;align-items:center;gap:6px;
  transition:opacity .35s,transform .45s cubic-bezier(.22,1,.36,1)}
body.ouvert #tete{opacity:0;transform:translateY(-30px) scale(.94);pointer-events:none}
#heure{font-size:78px;font-weight:200;letter-spacing:-.045em;line-height:1;
  font-variant-numeric:tabular-nums}
#bonjour{font-size:16.5px;color:var(--doux,#a5a5b2);letter-spacing:-.01em}

/* ---- la barre ---- */
#zone{width:100%;max-width:720px;display:flex;flex-direction:column;align-items:center;gap:10px}

/* LA BOITE. Fermee, c'est une barre. Ouverte, c'est un grand carre — le MEME
   element, qui grandit et dont les coins s'arrondissent davantage. Meme
   ressort que le panneau des reglages : c'est ce qui donne le geste. */
#boite{position:relative;width:100%;max-width:600px;
  border:1px solid var(--bord,rgba(255,255,255,.13));border-radius:16px;
  background:var(--verre,rgba(255,255,255,.07));
  -webkit-backdrop-filter:blur(22px) saturate(175%);backdrop-filter:blur(22px) saturate(175%);
  box-shadow:0 8px 26px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.1);
  display:flex;flex-direction:column;overflow:hidden;
  transition:max-width .62s cubic-bezier(.16,1.02,.24,1),
             border-radius .58s cubic-bezier(.3,.9,.2,1) .04s,
             box-shadow .5s ease, background .3s ease, border-color .3s ease}
body.ouvert #boite{max-width:720px;border-radius:26px;
  background:var(--verre2,rgba(255,255,255,.1));
  border-color:var(--vif,rgba(99,102,241,.5));
  box-shadow:0 26px 70px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.14)}
#boite:focus-within{border-color:var(--vif,rgba(99,102,241,.75));
  box-shadow:0 8px 26px rgba(0,0,0,.26), 0 0 0 4px rgba(99,102,241,.16),
             inset 0 1px 0 rgba(255,255,255,.12)}
body.ouvert #boite:focus-within{box-shadow:0 26px 70px rgba(0,0,0,.45),
  0 0 0 4px rgba(99,102,241,.16), inset 0 1px 0 rgba(255,255,255,.14)}

form{width:100%;position:relative;display:flex;align-items:center;flex:0 0 auto}
#q{width:100%;border:0;border-radius:0;background:transparent;color:inherit;
  font:inherit;font-size:16px;padding:16px 116px 16px 48px;outline:none}
#q::placeholder{color:var(--doux,#77777f)}
.loupe{position:absolute;left:17px;width:17px;height:17px;opacity:.45;pointer-events:none}
#ia{position:absolute;right:8px;border:0;border-radius:11px;padding:9px 14px;
  font:inherit;font-size:13px;font-weight:500;color:#fff;background:var(--acc,#6366f1);
  cursor:pointer;transition:background .15s,transform .12s cubic-bezier(.2,1.5,.4,1),filter .15s}
#ia:hover{filter:brightness(1.12)}
#ia:active{transform:scale(.94)}
#astuce{font-size:12.5px;color:var(--faible,#6e6e78);height:16px;
  transition:opacity .3s ease,transform .4s cubic-bezier(.22,1,.36,1)}
body.ouvert #astuce{opacity:0;transform:translateY(6px)}

/* ---- les raccourcis ---- */
#esp{display:flex;flex-wrap:wrap;gap:9px;justify-content:center;
  transition:opacity .35s,transform .45s cubic-bezier(.22,1,.36,1)}
body.ouvert #esp{opacity:0;transform:translateY(18px);pointer-events:none}
#esp button{border:1px solid var(--bord,rgba(255,255,255,.09));border-radius:13px;
  padding:10px 15px;font:inherit;font-size:13.5px;color:var(--doux,#c9c9d4);
  background:var(--verre,rgba(255,255,255,.05));cursor:pointer;display:flex;
  align-items:center;gap:7px;transition:background .16s,color .16s,transform .12s,border-color .16s}
#esp button{transition:background .16s ease,color .16s ease,border-color .16s ease,
  transform .26s cubic-bezier(.2,1.4,.4,1),box-shadow .22s ease}
#esp button:hover{background:var(--accFaible,rgba(99,102,241,.26));
  border-color:var(--vif,rgba(99,102,241,.5));color:#fff;transform:translateY(-3px);
  box-shadow:0 8px 20px rgba(0,0,0,.24)}
#esp button:active{transform:translateY(-1px) scale(.97)}
#esp button b{font-size:15px;font-weight:400;line-height:1}

/* ---- le panneau de resultats, deploye sous la barre ---- */
/* Les reponses sont DANS la boite : elles poussent ses parois, elles ne
   s'affichent pas dessous. C'est toute la difference entre « la barre grandit »
   et « une deuxieme boite apparait ». */
#res{width:100%;max-height:0;opacity:0;overflow:hidden;padding:0 16px;
  border-top:1px solid transparent;
  transition:max-height .62s cubic-bezier(.16,1.02,.24,1),
             opacity .32s ease .12s,
             padding .5s cubic-bezier(.22,1,.36,1),
             border-color .4s ease}
body.ouvert #res{max-height:min(58vh,520px);opacity:1;overflow-y:auto;
  padding:14px 16px 16px;border-top-color:var(--bord,rgba(255,255,255,.11))}
#res::-webkit-scrollbar{width:8px}
#res::-webkit-scrollbar-thumb{background:rgba(255,255,255,.14);border-radius:4px}
/* Tout ce qui entre dans la boite arrive avec le MEME ressort que le panneau
   des reglages. Un mouvement unique, reconnaissable, dans toute l'extension. */
@keyframes entre{
  from{opacity:0;transform:translateY(14px) scale(.965)}
  to{opacity:1;transform:none}
}
#res > *{animation:entre .52s cubic-bezier(.16,1.02,.24,1) both}
.moi{align-self:flex-end;max-width:82%;margin:2px 0 12px auto;padding:9px 14px;
  border-radius:15px 15px 5px 15px;background:var(--acc,#6366f1);color:#fff;font-size:14px;
  box-shadow:0 4px 14px rgba(0,0,0,.2)}
.rep{border:1px solid var(--bord,rgba(255,255,255,.1));border-radius:15px;
  background:var(--verre,rgba(255,255,255,.05));padding:13px 15px;font-size:14.5px;
  line-height:1.6;margin-bottom:12px;white-space:pre-wrap;
  animation-delay:.06s}
.rep .sig{display:flex;align-items:center;gap:6px;font-size:10px;font-weight:600;
  letter-spacing:.07em;text-transform:uppercase;color:var(--vifTxt,#a5aaff);margin-bottom:7px}
.pense{display:inline-flex;gap:4px;align-items:center}
.pense i{width:5px;height:5px;border-radius:50%;background:var(--vifTxt,#a5aaff);
  animation:bat 1.1s ease-in-out infinite}
.pense i:nth-child(2){animation-delay:.15s}.pense i:nth-child(3){animation-delay:.3s}
@keyframes bat{0%,60%,100%{opacity:.25;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}
.liens{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;
  margin-bottom:14px;animation-delay:.1s}
/* Les cartes tombent l'une apres l'autre, pas toutes d'un bloc : l'oeil suit. */
.liens .lien{animation:entre .5s cubic-bezier(.16,1.02,.24,1) both}
.liens .lien:nth-child(1){animation-delay:.10s}
.liens .lien:nth-child(2){animation-delay:.16s}
.liens .lien:nth-child(3){animation-delay:.22s}
.liens .lien:nth-child(4){animation-delay:.28s}
.liens .lien:nth-child(5){animation-delay:.33s}
.liens .lien:nth-child(6){animation-delay:.37s}
.liens .lien:nth-child(n+7){animation-delay:.41s}
.lien{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;
  border:1px solid var(--bord,rgba(255,255,255,.09));background:var(--verre,rgba(255,255,255,.04));
  cursor:pointer;text-align:left;font:inherit;color:inherit;transition:background .15s,transform .12s}
.lien{transition:background .16s ease,transform .22s cubic-bezier(.2,1.4,.4,1),
  border-color .16s ease,box-shadow .22s ease}
.lien:hover{background:var(--accFaible,rgba(99,102,241,.2));transform:translateY(-2px);
  border-color:var(--vif,rgba(99,102,241,.45));box-shadow:0 6px 16px rgba(0,0,0,.22)}
.lien:active{transform:translateY(0) scale(.985)}
.lien .p{width:26px;height:26px;border-radius:8px;display:flex;align-items:center;
  justify-content:center;font-size:14px;background:rgba(255,255,255,.08);flex:0 0 auto}
.lien .t{min-width:0}
.lien .t b{display:block;font-size:13px;font-weight:550;white-space:nowrap;
  overflow:hidden;text-overflow:ellipsis}
.lien .t span{display:block;font-size:11.5px;color:var(--faible,#8a8a95)}
.calc{font-size:26px;font-weight:300;letter-spacing:-.02em;padding:14px 16px;
  border-radius:15px;border:1px solid var(--bord,rgba(255,255,255,.1));
  background:var(--verre,rgba(255,255,255,.05));margin-bottom:12px;animation-delay:.05s}
.calc small{display:block;font-size:11.5px;color:var(--faible,#8a8a95);margin-top:3px}

/* ---- coins ---- */
#mac{position:fixed;left:20px;bottom:18px;z-index:3;display:flex;align-items:center;gap:7px;
  padding:7px 12px;border-radius:11px;border:1px solid transparent;background:transparent;
  color:var(--faible,#6a6a74);font:inherit;font-size:12px;cursor:pointer;
  transition:color .18s,background .18s,border-color .18s}
#mac:hover{color:var(--txt,#f2f2f7);background:var(--verre,rgba(255,255,255,.06));
  border-color:var(--bord,rgba(255,255,255,.1))}
#mac svg{width:13px;height:13px;fill:currentColor}
/* La roue ROULE : un tour complet a l'ouverture. Le mouvement dit ce qui se
   passe avant meme qu'on ait vu le panneau. */
#roue{position:fixed;right:22px;bottom:22px;z-index:12;width:40px;height:40px;border-radius:50%;
  border:1px solid rgba(255,255,255,.16);color:var(--doux,#a5a5b2);cursor:pointer;
  display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.08);
  -webkit-backdrop-filter:blur(18px) saturate(170%);backdrop-filter:blur(18px) saturate(170%);
  box-shadow:0 6px 18px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.18);
  transition:transform .72s cubic-bezier(.22,1,.36,1),background .2s,color .2s,box-shadow .2s}
#roue:hover{background:rgba(255,255,255,.15);color:#fff;
  box-shadow:0 8px 24px rgba(0,0,0,.34), inset 0 1px 0 rgba(255,255,255,.26)}
#roue:active{transform:scale(.92) rotate(40deg)}
#roue svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.7}
body.reglages #roue{transform:rotate(360deg);color:#fff;
  background:var(--accFaible,rgba(99,102,241,.34))}

/* ---- le panneau lateral ---- */
#ombre{position:fixed;inset:0;z-index:8;background:rgba(0,0,0,.34);opacity:0;
  pointer-events:none;transition:opacity .4s,backdrop-filter .4s;
  -webkit-backdrop-filter:blur(0px);backdrop-filter:blur(0px)}
body.reglages #ombre{opacity:1;pointer-events:auto;
  -webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px)}

/* Le panneau NAIT DE LA ROUE : il part en bulle ronde, minuscule, posee sur
   elle, puis il gonfle et ses coins se carrent. Il ne touche AUCUN bord — il
   flotte. C'est la barre laterale du site prise pour modele : transparente,
   liquide, bien arrondie, detachee. */
#panneau{position:fixed;top:22px;right:22px;bottom:22px;z-index:10;
  width:344px;max-width:calc(100vw - 44px);
  background:rgba(20,20,26,.62);border:1px solid rgba(255,255,255,.14);
  -webkit-backdrop-filter:blur(34px) saturate(190%);backdrop-filter:blur(34px) saturate(190%);
  box-shadow:0 26px 70px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.16);
  display:flex;flex-direction:column;color:#f2f2f7;overflow:hidden;
  transform-origin:calc(100% - 18px) calc(100% - 18px);
  transform:scale(.055);border-radius:50%;opacity:0;pointer-events:none;
  transition:transform .62s cubic-bezier(.16,1.02,.24,1),
             border-radius .58s cubic-bezier(.3,.9,.2,1) .06s,
             opacity .3s ease}
body.reglages #panneau{transform:scale(1);border-radius:26px;opacity:1;pointer-events:auto}
/* Le contenu n'apparait qu'une fois la bulle devenue carre : sinon on voit le
   texte s'etirer pendant la deformation, et c'est laid. */
#panneau > *{opacity:0;transition:opacity .28s ease .3s}
body.reglages #panneau > *{opacity:1}
#panneau header{padding:19px 20px 13px;display:flex;align-items:center;gap:10px;
  border-bottom:1px solid rgba(255,255,255,.09);flex:0 0 auto}
#panneau header b{font-size:15px;font-weight:600;flex:1;letter-spacing:-.01em}
#fermer{width:27px;height:27px;border-radius:50%;border:0;background:rgba(255,255,255,.08);
  color:#c9c9d4;font-size:15px;cursor:pointer;line-height:1}
#fermer:hover{background:rgba(255,255,255,.16);color:#fff}
#corps{flex:1;overflow-y:auto;padding:6px 20px 24px}
#corps::-webkit-scrollbar{width:8px}
#corps::-webkit-scrollbar-thumb{background:rgba(255,255,255,.13);border-radius:4px}
.sec{padding:16px 0 4px;font-size:10.5px;font-weight:600;letter-spacing:.08em;
  text-transform:uppercase;color:#7d7d88}
.grille{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.pastille{aspect-ratio:1;border-radius:11px;border:2px solid transparent;cursor:pointer;
  padding:0;transition:transform .14s,border-color .14s;background-size:cover;background-position:center}
.pastille:hover{transform:scale(1.07)}
.pastille.on{border-color:#fff}
.rangee{display:flex;gap:7px;flex-wrap:wrap}
.opt{border:1px solid rgba(255,255,255,.11);border-radius:10px;padding:7px 12px;
  font:inherit;font-size:12.5px;color:#c9c9d4;background:rgba(255,255,255,.05);cursor:pointer;
  transition:background .15s,color .15s,border-color .15s}
.opt:hover{background:rgba(255,255,255,.11)}
.opt.on{background:var(--acc,#6366f1);border-color:transparent;color:#fff;font-weight:500}
.champ{width:100%;border:1px solid rgba(255,255,255,.12);border-radius:11px;
  background:rgba(255,255,255,.06);color:#f2f2f7;font:inherit;font-size:13px;
  padding:10px 12px;outline:none;margin-top:4px}
.champ:focus{border-color:rgba(99,102,241,.7);background:rgba(255,255,255,.09)}
.note{font-size:11.5px;line-height:1.5;color:#82828d;margin-top:7px}
.note a{color:#a5aaff}
.bascule{display:flex;align-items:center;justify-content:space-between;gap:10px;
  padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:13.5px}
.bascule:last-child{border-bottom:0}
.inter{width:40px;height:23px;border-radius:12px;border:0;background:rgba(255,255,255,.14);
  position:relative;cursor:pointer;flex:0 0 auto;transition:background .2s}
.inter i{position:absolute;top:2.5px;left:2.5px;width:18px;height:18px;border-radius:50%;
  background:#fff;transition:transform .22s cubic-bezier(.3,1.4,.5,1)}
.inter.on{background:var(--acc,#6366f1)}
.inter.on i{transform:translateX(17px)}
#etatCle{font-size:11.5px;margin-top:6px;min-height:15px}
.ok{color:#4ade80}.ko{color:#f87171}
#pied{padding:14px 20px;border-top:1px solid rgba(255,255,255,.07);
  font-size:11px;color:#5c5c66;display:flex;align-items:center;gap:6px}
#pied span{width:5px;height:5px;border-radius:50%;background:#4ade80}
</style></head><body>
<div id="fond"></div>
<div id="lueur"><i></i><i></i><i></i></div>
<div id="voile"></div>

<main>
  <div id="tete">
    <div id="heure">--:--</div>
    <div id="bonjour"></div>
  </div>
  <div id="zone">
    <!-- UNE seule boite : la barre EST le carre. Quand on demande quelque
         chose, ce meme element grandit — il ne se dedouble pas en « barre en
         haut + panneau en bas ». Tout se passe dedans. -->
    <div id="boite">
      <form id="f" autocomplete="off">
        <svg class="loupe" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"></circle>
          <path d="M20 20l-3.6-3.6"></path></svg>
        <input id="q" placeholder="Chercher sur le web, ou demander à Nexus…" autofocus>
        <button type="button" id="ia">Nexus</button>
      </form>
      <div id="res"></div>
    </div>
    <div id="astuce">Entrée pour chercher · le bouton Nexus pour demander</div>
  </div>
  <div id="esp"></div>
</main>

<button id="mac" title="Nexus pour macOS">
  <svg viewBox="0 0 24 24"><path d="M16.4 12.7c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.2-2.8.8-3.5.8-.7 0-1.8-.8-3-.8-1.5 0-2.9.9-3.7 2.3-1.6 2.7-.4 6.8 1.1 9 .8 1.1 1.6 2.3 2.8 2.2 1.1 0 1.6-.7 2.9-.7 1.3 0 1.7.7 2.9.7 1.2 0 2-1.1 2.7-2.2.9-1.3 1.2-2.5 1.2-2.6 0 0-2.3-.9-2.3-3.4zM14.2 5.6c.6-.8 1-1.8.9-2.9-.9 0-2 .6-2.6 1.4-.6.7-1.1 1.7-.9 2.8 1 0 2-.5 2.6-1.3z"/></svg>
  Nexus pour macOS
</button>

<button id="roue" title="Réglages">
  <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.1"/>
    <path d="M19.4 14.5a1.6 1.6 0 0 0 .3 1.8l.1.1a1.9 1.9 0 1 1-2.7 2.7l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5v.2a1.9 1.9 0 1 1-3.8 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a1.9 1.9 0 1 1-2.7-2.7l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3.4a1.9 1.9 0 1 1 0-3.8h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a1.9 1.9 0 1 1 2.7-2.7l.1.1a1.6 1.6 0 0 0 1.8.3h.1a1.6 1.6 0 0 0 1-1.5V3.4a1.9 1.9 0 1 1 3.8 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a1.9 1.9 0 1 1 2.7 2.7l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1a1.6 1.6 0 0 0 1.5 1h.2a1.9 1.9 0 1 1 0 3.8h-.1a1.6 1.6 0 0 0-1.5 1z"/></svg>
</button>

<div id="ombre"></div>
<aside id="panneau" aria-label="Réglages Nexus">
  <header><b>Réglages</b><button id="fermer" title="Fermer">×</button></header>
  <div id="corps">
    <div class="sec">Fond d'écran</div>
    <div class="grille" id="fonds"></div>
    <div class="rangee" style="margin-top:9px">
      <button class="opt" id="fondPerso">Image de mon choix…</button>
    </div>
    <input class="champ" id="fondURL" placeholder="…ou colle l'adresse d'une image"
      style="display:none">

    <div class="sec">Ambiance</div>
    <div class="rangee" id="themes"></div>

    <div class="sec">Assombrir le fond</div>
    <div class="rangee" id="voiles"></div>

    <div class="sec">Affichage</div>
    <div class="bascule">Horloge<button class="inter" id="tHeure"><i></i></button></div>
    <div class="bascule">Raccourcis des espaces<button class="inter" id="tEsp"><i></i></button></div>
    <div class="bascule">Halos animés<button class="inter" id="tHalo"><i></i></button></div>
    <div class="bascule">Bouton macOS<button class="inter" id="tMac"><i></i></button></div>
    <div class="bascule">Format 24 h<button class="inter" id="t24"><i></i></button></div>

    <div class="sec">École</div>
    <div class="rangee" id="ecole"></div>
    <div class="note">NeoSchool est l'espace scolaire de Nexus, côté navigateur :
      notes, devoirs et emploi du temps, branché sur École Directe. Ton mot de
      passe ne quitte jamais ta machine.</div>
    <div class="bascule" style="margin-top:6px">Raccourci École sur l'accueil<button class="inter" id="tEcole"><i></i></button></div>

    <div class="sec">Moteur de recherche</div>
    <div class="rangee" id="moteurs"></div>

    <div class="sec">Ton prénom</div>
    <input class="champ" id="prenom" placeholder="Aharon" maxlength="24">

    <div class="sec">Clé d'intelligence artificielle</div>
    <input class="champ" id="cle" type="password" placeholder="Colle ta clé — elle reste ici">
    <div id="etatCle"></div>
    <div class="rangee" style="margin-top:8px">
      <button class="opt" id="testerCle">Tester</button>
      <button class="opt" id="voirCle">Afficher</button>
      <button class="opt" id="viderCle">Effacer</button>
    </div>
    <div class="note">Reconnue toute seule : Google Gemini, OpenAI, Anthropic, Groq,
      Mistral, OpenRouter. Elle est enregistrée dans ce navigateur uniquement, jamais
      envoyée ailleurs qu'au fournisseur. Sans clé, Nexus répond quand même — avec des
      résultats ciblés au lieu d'une réponse rédigée.
      <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">Clé Gemini gratuite</a></div>

    <div class="sec">Économie</div>
    <div class="bascule">Réponses courtes<button class="inter" id="tCourt"><i></i></button></div>
    <div class="note">Limite chaque réponse au strict nécessaire. Recommandé si tu
      partages la même clé avec l'application macOS.</div>
  </div>
  <div id="pied"><span></span>Nexus 2.2 — conçu par Aharon Dray</div>
</aside>

<script src="onglet.js"></script>
</body></html>
`;

      const ongletJs = `// ============================================================================
//  La page d'accueil Nexus, dans le navigateur.
//
//  Elle est ENTIEREMENT locale : aucune page distante, aucun cadre. C'est ce
//  qui lui permet de s'afficher instantanement, meme sans connexion, et de ne
//  plus dependre de la mise en ligne du site.
//
//  Trois principes :
//   · rien ne part d'ici sauf ce que tu demandes explicitement ;
//   · la cle d'IA reste dans ce navigateur, et ne sert qu'au fournisseur ;
//   · sans cle, la recherche marche quand meme — elle repond en resultats
//     cibles plutot qu'en phrases.
// ============================================================================

const SITE = "https://nexus-espace.netlify.app";
// NeoSchool : l'espace scolaire de Nexus cote navigateur.
const NEO = "https://neo-school-nine.vercel.app/";
const NEO_EXT = "https://chromewebstore.google.com/detail/ldkggbhackdddfbmoanfhbhglfdgfbkj";

// -- Rangement ---------------------------------------------------------------
// chrome.storage quand on est bien dans l'extension, sinon le rangement du
// navigateur : la page reste testable telle quelle dans un onglet normal.
const Rangement = {
  lire(cles) {
    return new Promise((res) => {
      try {
        if (chrome?.storage?.local) return chrome.storage.local.get(cles, (v) => res(v || {}));
      } catch (_) {}
      const out = {};
      for (const k of cles) {
        try { const v = localStorage.getItem("nx." + k); if (v != null) out[k] = JSON.parse(v); }
        catch (_) {}
      }
      res(out);
    });
  },
  ecrire(obj) {
    return new Promise((res) => {
      try {
        if (chrome?.storage?.local) return chrome.storage.local.set(obj, () => res());
      } catch (_) {}
      for (const k in obj) {
        try { localStorage.setItem("nx." + k, JSON.stringify(obj[k])); } catch (_) {}
      }
      res();
    });
  },
};

// -- Reglages ----------------------------------------------------------------
const PAR_DEFAUT = {
  fond: "nuit", fondImage: "", theme: "indigo", voile: 0,
  heure: true, espaces: true, halos: true, boutonMac: true, format24: true,
  moteur: "google", prenom: "", cle: "", court: true, ecole: true,
};
let R = { ...PAR_DEFAUT };

// Les fonds : dessines en CSS, donc instantanes, sans reseau et sans pistage.
const FONDS = {
  nuit:     "linear-gradient(160deg,#07070b 0%,#0d0d16 55%,#111122 100%)",
  aurore:   "linear-gradient(150deg,#0b1026 0%,#16264d 40%,#2b6f6f 75%,#0e2a2a 100%)",
  crepuscule:"linear-gradient(155deg,#1a0b2e 0%,#3b1053 45%,#7b2d5e 80%,#c05e4a 100%)",
  ocean:    "linear-gradient(160deg,#02111f 0%,#063456 45%,#0a5f83 78%,#0d8a9c 100%)",
  foret:    "linear-gradient(155deg,#04140d 0%,#0b2f1e 45%,#155e3a 80%,#2c8a55 100%)",
  braise:   "linear-gradient(155deg,#180605 0%,#3d0f0a 45%,#7a2211 78%,#c2521f 100%)",
  brume:    "linear-gradient(160deg,#101318 0%,#1d232c 50%,#2c3540 100%)",
  lavande:  "linear-gradient(150deg,#120e26 0%,#2a1f5c 45%,#4b3a92 78%,#7b6bd6 100%)",
  sable:    "linear-gradient(155deg,#1a1410 0%,#3a2b1e 45%,#6b4f34 80%,#a37a4e 100%)",
  encre:    "radial-gradient(120% 90% at 20% 10%,#1b2340 0%,#0a0d1a 55%,#05060c 100%)",
  neige:    "linear-gradient(160deg,#eceef4 0%,#dfe3ee 50%,#c9d1e4 100%)",
  papier:   "linear-gradient(160deg,#f7f4ee 0%,#efe9dd 55%,#e2d9c7 100%)",
};
const FONDS_CLAIRS = ["neige", "papier"];

const THEMES = {
  indigo:   { acc: "#6366f1", l1: "#4f46e5", l2: "#7c3aed", l3: "#0ea5e9" },
  emeraude: { acc: "#10b981", l1: "#0d9488", l2: "#10b981", l3: "#0ea5e9" },
  rubis:    { acc: "#e11d48", l1: "#be123c", l2: "#9f1239", l3: "#f97316" },
  ambre:    { acc: "#f59e0b", l1: "#d97706", l2: "#f59e0b", l3: "#ef4444" },
  ciel:     { acc: "#0ea5e9", l1: "#0284c7", l2: "#06b6d4", l3: "#6366f1" },
  violet:   { acc: "#a855f7", l1: "#7e22ce", l2: "#a855f7", l3: "#ec4899" },
  graphite: { acc: "#64748b", l1: "#334155", l2: "#475569", l3: "#0f172a" },
};

const MOTEURS = {
  google:     { nom: "Google",     url: (q) => "https://www.google.com/search?q=" + q },
  duckduckgo: { nom: "DuckDuckGo", url: (q) => "https://duckduckgo.com/?q=" + q },
  bing:       { nom: "Bing",       url: (q) => "https://www.bing.com/search?q=" + q },
  ecosia:     { nom: "Ecosia",     url: (q) => "https://www.ecosia.org/search?q=" + q },
  qwant:      { nom: "Qwant",      url: (q) => "https://www.qwant.com/?q=" + q },
};

// -- Petites aides -----------------------------------------------------------
const $ = (id) => document.getElementById(id);
const deux = (n) => (n < 10 ? "0" + n : "" + n);
const ech = (t) => (t == null ? "" : String(t))
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function appliquer() {
  const clair = FONDS_CLAIRS.includes(R.fond) && !R.fondImage;
  const f = $("fond");
  if (R.fondImage) {
    f.style.backgroundImage = \`url("\${R.fondImage}")\`;
    f.style.background = \`#07070b url("\${R.fondImage}") center/cover no-repeat\`;
  } else {
    f.style.background = FONDS[R.fond] || FONDS.nuit;
  }
  const t = THEMES[R.theme] || THEMES.indigo;
  const s = document.documentElement.style;
  s.setProperty("--acc", t.acc);
  s.setProperty("--l1", t.l1); s.setProperty("--l2", t.l2); s.setProperty("--l3", t.l3);
  s.setProperty("--vif", t.acc + "bf");
  s.setProperty("--accFaible", t.acc + "44");
  s.setProperty("--vifTxt", clair ? t.acc : "#a5aaff");
  s.setProperty("--voile", String(R.voile));
  // Sur fond clair, on inverse l'encre : sinon le texte blanc disparait.
  s.setProperty("--txt", clair ? "#15151b" : "#f2f2f7");
  s.setProperty("--doux", clair ? "#4a4a56" : "#a5a5b2");
  s.setProperty("--faible", clair ? "#6c6c78" : "#6e6e78");
  s.setProperty("--bord", clair ? "rgba(0,0,0,.12)" : "rgba(255,255,255,.13)");
  s.setProperty("--verre", clair ? "rgba(255,255,255,.55)" : "rgba(255,255,255,.07)");
  s.setProperty("--verre2", clair ? "rgba(255,255,255,.75)" : "rgba(255,255,255,.1)");

  $("tete").style.display = R.heure ? "" : "none";
  $("esp").style.display = R.espaces ? "" : "none";
  $("mac").style.display = R.boutonMac ? "" : "none";
  const ce = $("chipEcole");
  if (ce) ce.style.display = R.ecole ? "" : "none";
  document.body.classList.toggle("calme", !R.halos);
  $("lueur").style.display = R.halos && !R.fondImage ? "" : "none";
  battre();
}

// -- L'heure -----------------------------------------------------------------
const JOURS = ["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"];
const MOIS = ["janvier","février","mars","avril","mai","juin","juillet","août",
              "septembre","octobre","novembre","décembre"];
function salut(h) {
  if (h < 5) return "Bonne nuit";
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}
function battre() {
  const d = new Date();
  $("heure").textContent = R.format24
    ? deux(d.getHours()) + ":" + deux(d.getMinutes())
    : d.toLocaleTimeString("fr-FR", { hour: "numeric", minute: "2-digit", hour12: true });
  $("bonjour").textContent = salut(d.getHours()) + (R.prenom ? " " + R.prenom : "")
    + " · " + JOURS[d.getDay()] + " " + d.getDate() + " " + MOIS[d.getMonth()];
}
setInterval(battre, 1000);

// -- Les espaces -------------------------------------------------------------
const ESPACES = [
  ["Chat", "💬", "nexus-chat"], ["Notes", "📝", "notes"], ["Tâches", "✓", "tasks"],
  ["Calendrier", "📅", "calendar"], ["Fichiers", "📁", "files"],
];
// NeoSchool a son propre raccourci : c'est un espace a part entiere de Nexus,
// pas une page du site. Il s'affiche en dernier et se debranche depuis les
// reglages si Aharon n'en veut pas.
const ECOLE = ["NeoSchool", "🎓", NEO];
function ouvrirEspace(app) {
  // On ouvre le site EN DEMANDANT l'espace : il s'ouvre alors en grand,
  // centre. Avant, le bouton menait a l'accueil et semblait ne rien faire.
  window.location.href = SITE + "/?app=" + encodeURIComponent(app);
}
{
  const esp = $("esp");
  for (const [nom, glyphe, app] of ESPACES) {
    const b = document.createElement("button");
    const g = document.createElement("b"); g.textContent = glyphe;
    b.append(g, document.createTextNode(nom));
    b.title = "Ouvrir « " + nom + " » en grand sur Nexus";
    b.addEventListener("click", () => ouvrirEspace(app));
    esp.appendChild(b);
  }
  const [nomE, glypheE, urlE] = ECOLE;
  const e = document.createElement("button");
  e.id = "chipEcole";
  const ge = document.createElement("b"); ge.textContent = glypheE;
  e.append(ge, document.createTextNode(nomE));
  e.title = "NeoSchool — notes, devoirs et emploi du temps";
  e.addEventListener("click", () => { window.location.href = urlE; });
  esp.appendChild(e);
}

// -- Recherche ---------------------------------------------------------------
function estUneAdresse(t) {
  if (/\\s/.test(t)) return false;
  if (/^https?:\\/\\//i.test(t)) return true;
  return /^[\\w-]+(\\.[\\w-]+)+(\\/.*)?$/.test(t);
}
function chercher(t) {
  if (estUneAdresse(t)) {
    window.location.href = /^https?:\\/\\//i.test(t) ? t : "https://" + t;
    return;
  }
  const m = MOTEURS[R.moteur] || MOTEURS.google;
  window.location.href = m.url(encodeURIComponent(t));
}

// -- L'intelligence sans intelligence ---------------------------------------
// Sans cle, on ne rédige pas : on vise juste. Le but est qu'un lycéen tombe en
// UN clic sur la bonne source, au lieu d'une page de résultats à trier.
function calculer(t) {
  const propre = t.replace(/[^0-9+\\-*/().,%^ ]/g, "").replace(/,/g, ".").trim();
  if (!propre || !/[0-9]/.test(propre) || !/[+\\-*/^%]/.test(propre)) return null;
  if (propre.length > 80) return null;
  try {
    const v = Function('"use strict";return (' + propre.replace(/\\^/g, "**") + ")")();
    if (typeof v !== "number" || !isFinite(v)) return null;
    return { calcul: propre, valeur: Math.round(v * 1e10) / 1e10 };
  } catch (_) { return null; }
}

function cibler(q) {
  const e = encodeURIComponent(q);
  const bas = q.toLowerCase();
  const mots = q.trim().split(/\\s+/).length;
  const L = [];
  const A = (icone, titre, sous, url) => L.push({ icone, titre, sous, url });

  const trad = bas.match(/^(?:traduis|traduire|traduction de)\\s+(.+)$/);
  if (trad) {
    const x = encodeURIComponent(trad[1]);
    A("🌍", "DeepL", "La meilleure traduction", "https://www.deepl.com/translator#fr/en/" + x);
    A("🔤", "Google Traduction", "Rapide, 100 langues",
      "https://translate.google.com/?sl=auto&tl=en&text=" + x);
  }
  if (/^(definition|définition|sens|que veut dire|c'est quoi)\\b/.test(bas) || mots === 1) {
    A("📖", "Larousse", "Définition en français",
      "https://www.larousse.fr/dictionnaires/francais/" + e);
    A("📚", "Wiktionnaire", "Étymologie et emplois",
      "https://fr.wiktionary.org/wiki/" + e);
  }
  if (/\\b(cours|exercice|revision|révision|bac|brevet|dissertation|theoreme|théorème|formule|demonstration|démonstration)\\b/.test(bas)
      || /^(explique|comment marche|pourquoi)\\b/.test(bas)) {
    A("🎓", "NeoSchool", "Tes notes et tes devoirs", NEO);
    A("📓", "Nexus École", "Tes cours et tes fiches", SITE + "/?app=learn");
    A("▶️", "YouTube", "Explications en vidéo",
      "https://www.youtube.com/results?search_query=" + e);
    A("🧮", "Wikipédia", "L'article de fond", "https://fr.wikipedia.org/w/index.php?search=" + e);
  }
  if (/^(comment|tuto|apprendre a|apprendre à)\\b/.test(bas)) {
    A("▶️", "YouTube", "Le geste en vidéo",
      "https://www.youtube.com/results?search_query=" + e);
  }
  if (/\\b(meteo|météo|temperature|température|pluie|demain)\\b/.test(bas)) {
    A("🌤", "Météo-France", "Prévisions officielles",
      "https://meteofrance.com/recherche/resultats?query=" + e);
  }
  if (/\\b(acheter|prix|pas cher|promo|avis)\\b/.test(bas)) {
    A("🛒", "Google Shopping", "Comparer les prix",
      "https://www.google.com/search?tbm=shop&q=" + e);
  }
  if (/\\b(itineraire|itinéraire|adresse|ou est|où est|restaurant|gare|horaires)\\b/.test(bas)) {
    A("📍", "Google Maps", "Sur la carte", "https://www.google.com/maps/search/" + e);
  }
  if (/\\b(article|etude|étude|recherche scientifique|these|thèse|source)\\b/.test(bas)) {
    A("🔬", "Google Scholar", "Sources universitaires",
      "https://scholar.google.com/scholar?q=" + e);
  }
  // Toujours proposer la sortie large, en dernier.
  const m = MOTEURS[R.moteur] || MOTEURS.google;
  A("🔎", m.nom, "Tous les résultats", m.url(e));
  if (R.moteur !== "google") A("🔎", "Google", "Deuxième avis", "https://www.google.com/search?q=" + e);
  A("📚", "Wikipédia", "L'encyclopédie", "https://fr.wikipedia.org/w/index.php?search=" + e);
  A("▶️", "YouTube", "En vidéo", "https://www.youtube.com/results?search_query=" + e);
  // On enleve les doublons de titre, en gardant le premier (le plus cible).
  const vus = new Set();
  return L.filter((x) => (vus.has(x.titre) ? false : (vus.add(x.titre), true))).slice(0, 8);
}

// -- L'affichage des reponses ------------------------------------------------
const res = $("res");
function ouvrirPanneau() { document.body.classList.add("ouvert"); }
function poserQuestion(t) {
  const d = document.createElement("div");
  d.className = "moi"; d.textContent = t;
  res.appendChild(d); res.scrollTop = res.scrollHeight;
}
function poserLiens(liste) {
  const g = document.createElement("div");
  g.className = "liens";
  for (const x of liste) {
    const b = document.createElement("button");
    b.className = "lien";
    b.innerHTML = '<span class="p">' + ech(x.icone) + '</span><span class="t"><b>'
      + ech(x.titre) + '</b><span>' + ech(x.sous) + '</span></span>';
    b.addEventListener("click", () => window.open(x.url, "_blank", "noopener"));
    g.appendChild(b);
  }
  res.appendChild(g); res.scrollTop = res.scrollHeight;
}
function poserCalcul(c) {
  const d = document.createElement("div");
  d.className = "calc";
  d.innerHTML = ech(c.valeur) + "<small>" + ech(c.calcul) + "</small>";
  res.appendChild(d);
}
function poserReponse() {
  const d = document.createElement("div");
  d.className = "rep";
  d.innerHTML = '<div class="sig">✦ Nexus</div><div class="c">'
    + '<span class="pense"><i></i><i></i><i></i></span></div>';
  res.appendChild(d); res.scrollTop = res.scrollHeight;
  return d.querySelector(".c");
}

// -- Les fournisseurs d'IA ---------------------------------------------------
// Meme reconnaissance que l'application macOS : on devine au prefixe.
function devinerFournisseur(cle) {
  const c = (cle || "").trim();
  if (!c) return null;
  if (/^AIza|^AQ\\./.test(c)) return { nom: "Google Gemini", genre: "google" };
  if (/^sk-ant-/.test(c)) return { nom: "Anthropic", genre: "anthropic" };
  if (/^sk-or-/.test(c)) return { nom: "OpenRouter", genre: "openai",
    base: "https://openrouter.ai/api/v1", modele: "google/gemini-2.0-flash-exp:free" };
  if (/^gsk_/.test(c)) return { nom: "Groq", genre: "openai",
    base: "https://api.groq.com/openai/v1", modele: "llama-3.3-70b-versatile" };
  if (/^sk-/.test(c)) return { nom: "OpenAI", genre: "openai",
    base: "https://api.openai.com/v1", modele: "gpt-4o-mini" };
  if (/^[0-9a-f]{32}$/i.test(c)) return { nom: "Mistral", genre: "openai",
    base: "https://api.mistral.ai/v1", modele: "mistral-small-latest" };
  return { nom: "fournisseur inconnu", genre: "openai",
    base: "https://api.openai.com/v1", modele: "gpt-4o-mini" };
}

const CONSIGNE = "Tu es Nexus, l'assistant d'Aharon Dray, qui t'a conçu. "
  + "Réponds en français, directement, sans formule de politesse ni introduction. "
  + "Sois exact ; si tu ignores quelque chose, dis-le en une ligne.";

// Certains fournisseurs (OpenAI, Groq, Mistral, OpenRouter) refusent les appels
// venus directement d'une page : le navigateur les bloque. Une permission
// facultative leve le blocage — on ne la demande QUE si la cle en a besoin, et
// jamais a l'installation.
async function permissionSiBesoin(f) {
  if (!f || f.genre !== "openai" || !f.base) return true;
  const motif = f.base.replace(/^(https:\\/\\/[^/]+).*$/, "$1") + "/*";
  try {
    if (!chrome?.permissions) return true;
    const deja = await new Promise((r) =>
      chrome.permissions.contains({ origins: [motif] }, r));
    if (deja) return true;
    return await new Promise((r) => chrome.permissions.request({ origins: [motif] }, r));
  } catch (_) { return true; }
}

async function demanderALIA(question, court) {
  const f = devinerFournisseur(R.cle);
  if (!f) throw new Error("aucune clé");
  if (!(await permissionSiBesoin(f))) {
    throw new Error("ce fournisseur exige une autorisation que tu viens de refuser");
  }
  const limite = court ? 500 : 1600;
  if (f.genre === "google") {
    // Les modeles recents reflechissent AVANT d'ecrire, et cette reflexion se
    // paie sur le meme budget : trop serrer coupe la phrase en deux.
    const modeles = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-flash-latest"];
    let derniere = "";
    for (const m of modeles) {
      try {
        const r = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/" + m
          + ":generateContent?key=" + encodeURIComponent(R.cle),
          { method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: CONSIGNE }] },
              contents: [{ role: "user", parts: [{ text: question }] }],
              generationConfig: { temperature: 0.5, maxOutputTokens: limite + 900 },
            }) });
        const d = await r.json();
        if (d.error) { derniere = d.error.message || "refus"; continue; }
        const c = (d.candidates || [])[0] || {};
        if (c.finishReason === "MAX_TOKENS") { derniere = "réponse coupée"; continue; }
        const t = ((c.content || {}).parts || []).map((p) => p.text || "").join("").trim();
        if (t) return t;
        derniere = "réponse vide";
      } catch (e) { derniere = e.message; }
    }
    throw new Error(derniere || "aucun modèle n'a répondu");
  }
  if (f.genre === "anthropic") {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": R.cle,
                 "anthropic-version": "2023-06-01",
                 "anthropic-dangerous-direct-browser-access": "true" },
      body: JSON.stringify({ model: "claude-3-5-haiku-latest", max_tokens: limite,
                             system: CONSIGNE,
                             messages: [{ role: "user", content: question }] }) });
    const d = await r.json();
    if (d.error) throw new Error(d.error.message || "refus");
    return (d.content || []).map((x) => x.text || "").join("").trim();
  }
  const r = await fetch(f.base + "/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + R.cle },
    body: JSON.stringify({ model: f.modele, max_tokens: limite,
      messages: [{ role: "system", content: CONSIGNE },
                 { role: "user", content: question }] }) });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message || "refus");
  return ((d.choices || [])[0]?.message?.content || "").trim();
}

// -- Le bouton Nexus ---------------------------------------------------------
let enCours = false;
async function demander() {
  const t = $("q").value.trim();
  if (!t || enCours) return;
  $("q").value = "";
  ouvrirPanneau();
  poserQuestion(t);

  const c = calculer(t);
  if (c) poserCalcul(c);

  if (!R.cle) {
    // Sans cle : on ne rédige pas, on vise. Et on dit ou trouver mieux.
    poserLiens(cibler(t));
    const d = document.createElement("div");
    d.className = "rep";
    d.innerHTML = '<div class="sig">✦ Nexus</div>Voilà les sources les plus '
      + 'directes pour ça. Pour une vraie réponse rédigée, ajoute une clé dans '
      + 'les réglages (la roue, en bas à droite) — ou ouvre le chat du site.';
    const b = document.createElement("button");
    b.className = "opt"; b.textContent = "Ouvrir le chat Nexus";
    b.style.cssText = "margin-top:11px;display:block";
    b.addEventListener("click", () =>
      window.open(SITE + "/?app=nexus-chat", "_blank", "noopener"));
    d.appendChild(b);
    res.appendChild(d); res.scrollTop = res.scrollHeight;
    return;
  }

  enCours = true;
  const boite = poserReponse();
  try {
    const rep = await demanderALIA(t, R.court);
    boite.textContent = rep || "Je n'ai rien à ajouter.";
  } catch (e) {
    boite.innerHTML = "Je n'ai pas pu répondre : " + ech(e.message)
      + "<br><span style='opacity:.7;font-size:12.5px'>Vérifie ta clé dans les réglages.</span>";
  } finally {
    enCours = false;
    poserLiens(cibler(t));
    res.scrollTop = res.scrollHeight;
  }
}

$("f").addEventListener("submit", (e) => {
  e.preventDefault();
  const t = $("q").value.trim();
  if (t) chercher(t);
});
$("ia").addEventListener("click", demander);
$("q").addEventListener("keydown", (e) => {
  // Cmd/Ctrl + Entree : demander a Nexus sans lacher le clavier.
  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); demander(); }
  if (e.key === "Escape") {
    if (document.body.classList.contains("ouvert")) {
      document.body.classList.remove("ouvert"); res.innerHTML = "";
    } else { $("q").value = ""; }
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "/" && document.activeElement !== $("q")) { e.preventDefault(); $("q").focus(); }
});

// -- Les coins ---------------------------------------------------------------
$("mac").addEventListener("click", () =>
  window.open(SITE + "/Nexus-macOS.zip", "_blank", "noopener"));

// -- Le panneau de reglages --------------------------------------------------
const ouvrirReglages = () => document.body.classList.add("reglages");
const fermerReglages = () => document.body.classList.remove("reglages");
$("roue").addEventListener("click", () =>
  document.body.classList.contains("reglages") ? fermerReglages() : ouvrirReglages());
$("fermer").addEventListener("click", fermerReglages);
$("ombre").addEventListener("click", fermerReglages);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && document.body.classList.contains("reglages")) fermerReglages();
});

function garder(champ, valeur) {
  R[champ] = valeur;
  Rangement.ecrire({ [champ]: valeur });
  appliquer();
}

function construireReglages() {
  // Les fonds
  const g = $("fonds"); g.innerHTML = "";
  for (const nom in FONDS) {
    const b = document.createElement("button");
    b.className = "pastille" + (!R.fondImage && R.fond === nom ? " on" : "");
    b.style.background = FONDS[nom];
    b.title = nom.charAt(0).toUpperCase() + nom.slice(1);
    b.addEventListener("click", () => {
      R.fondImage = ""; Rangement.ecrire({ fondImage: "" });
      garder("fond", nom); construireReglages();
    });
    g.appendChild(b);
  }
  // Les ambiances
  const th = $("themes"); th.innerHTML = "";
  for (const nom in THEMES) {
    const b = document.createElement("button");
    b.className = "opt" + (R.theme === nom ? " on" : "");
    b.textContent = nom.charAt(0).toUpperCase() + nom.slice(1);
    b.addEventListener("click", () => { garder("theme", nom); construireReglages(); });
    th.appendChild(b);
  }
  // Le voile
  const v = $("voiles"); v.innerHTML = "";
  for (const [nom, val] of [["Aucun",0],["Léger",.22],["Moyen",.42],["Fort",.62]]) {
    const b = document.createElement("button");
    b.className = "opt" + (Math.abs(R.voile - val) < .01 ? " on" : "");
    b.textContent = nom;
    b.addEventListener("click", () => { garder("voile", val); construireReglages(); });
    v.appendChild(b);
  }
  // L'ecole
  const ec = $("ecole"); ec.innerHTML = "";
  for (const [nom, url] of [["Ouvrir NeoSchool", NEO],
                            ["Son extension", NEO_EXT],
                            ["École Directe", "https://www.ecoledirecte.com"]]) {
    const b = document.createElement("button");
    b.className = "opt"; b.textContent = nom;
    b.addEventListener("click", () => window.open(url, "_blank", "noopener"));
    ec.appendChild(b);
  }
  // Les moteurs
  const m = $("moteurs"); m.innerHTML = "";
  for (const nom in MOTEURS) {
    const b = document.createElement("button");
    b.className = "opt" + (R.moteur === nom ? " on" : "");
    b.textContent = MOTEURS[nom].nom;
    b.addEventListener("click", () => { garder("moteur", nom); construireReglages(); });
    m.appendChild(b);
  }
  // Les bascules
  const bascules = [["tHeure","heure"],["tEsp","espaces"],["tHalo","halos"],
                    ["tMac","boutonMac"],["t24","format24"],["tCourt","court"],
                    ["tEcole","ecole"]];
  for (const [id, champ] of bascules) {
    const b = $(id);
    b.classList.toggle("on", !!R[champ]);
    b.onclick = () => { garder(champ, !R[champ]); b.classList.toggle("on", !!R[champ]); };
  }
  $("prenom").value = R.prenom || "";
  $("cle").value = R.cle || "";
  montrerEtatCle();
}

$("prenom").addEventListener("input", (e) => garder("prenom", e.target.value.trim().slice(0, 24)));

// Fond personnel : par fichier (garde ici, jamais envoye) ou par adresse.
$("fondPerso").addEventListener("click", () => {
  const f = document.createElement("input");
  f.type = "file"; f.accept = "image/*";
  f.addEventListener("change", () => {
    const fichier = f.files && f.files[0];
    if (!fichier) return;
    const lect = new FileReader();
    lect.onload = () => {
      // On redimensionne : une photo de 8 Mo ne rentre pas dans le rangement
      // du navigateur, et l'affichage n'y gagnerait rien.
      const img = new Image();
      img.onload = () => {
        const max = 2200;
        const e = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * e); c.height = Math.round(img.height * e);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        const url = c.toDataURL("image/jpeg", 0.82);
        R.fondImage = url;
        Rangement.ecrire({ fondImage: url });
        appliquer(); construireReglages();
      };
      img.src = lect.result;
    };
    lect.readAsDataURL(fichier);
  });
  f.click();
  $("fondURL").style.display = "block";
});
$("fondURL").addEventListener("change", (e) => {
  const u = e.target.value.trim();
  R.fondImage = u; Rangement.ecrire({ fondImage: u });
  appliquer(); construireReglages();
});

// La cle
function montrerEtatCle() {
  const e = $("etatCle");
  if (!R.cle) { e.textContent = "Aucune clé — Nexus répond en résultats ciblés."; e.className = ""; return; }
  const f = devinerFournisseur(R.cle);
  e.textContent = "Clé reconnue : " + f.nom + " · enregistrée dans ce navigateur.";
  e.className = "ok";
}
$("cle").addEventListener("change", (e) => {
  garder("cle", e.target.value.trim());
  montrerEtatCle();
});
$("voirCle").addEventListener("click", () => {
  const c = $("cle");
  c.type = c.type === "password" ? "text" : "password";
});
$("viderCle").addEventListener("click", () => {
  garder("cle", ""); $("cle").value = ""; montrerEtatCle();
});
$("testerCle").addEventListener("click", async () => {
  const e = $("etatCle");
  garder("cle", $("cle").value.trim());
  if (!R.cle) { montrerEtatCle(); return; }
  e.textContent = "Essai en cours…"; e.className = "";
  try {
    const r = await demanderALIA("Réponds juste : ok", true);
    e.textContent = r ? "La clé fonctionne ✓" : "Réponse vide.";
    e.className = r ? "ok" : "ko";
  } catch (err) {
    e.textContent = "Refusée : " + err.message; e.className = "ko";
  }
});

// -- Demarrage ---------------------------------------------------------------
(async function () {
  const v = await Rangement.lire(Object.keys(PAR_DEFAUT));
  R = { ...PAR_DEFAUT, ...v };
  appliquer();
  construireReglages();
  $("q").focus();
})();
`;

      const lisezMoi = `EXTENSION NEXUS 2.2 — installation gratuite, 4 clics

SI TU AVAIS DEJA UNE VERSION DE NEXUS : supprime-la d'abord.
Sur chrome://extensions, sur la carte « Nexus », clique « Supprimer ».
Recharger par-dessus ne remplace pas les anciens fichiers.

1. Decompresse ce fichier : tu obtiens un dossier « nexus-extension ».
2. Ouvre ton navigateur sur  chrome://extensions
3. Active « Mode developpeur » (interrupteur en haut a droite).
4. Clique « Charger l'extension non empaquetee » et choisis le dossier.

LA PAGE D'ACCUEIL (chaque nouvel onglet)

  · L'heure, la date, et une seule barre au centre.
      - Entree             -> cherche sur le web (ou ouvre l'adresse tapee).
      - bouton Nexus       -> la barre monte et se deplie en reponses.
      - Cmd/Ctrl + Entree  -> pareil, sans lacher le clavier.
      - « / »              -> remet le curseur dans la barre.
      - Echap              -> referme les reponses.

  · Les raccourcis en dessous ouvrent l'espace demande EN GRAND sur le site,
    pas seulement la page d'accueil.

  · La roue en bas a droite ouvre les reglages, en panneau lateral :
      - 12 fonds d'ecran, ou ta propre image (fichier ou adresse) ;
      - 7 ambiances de couleur ;
      - assombrissement du fond ;
      - ce qu'on affiche : horloge, raccourcis, halos, bouton macOS, 24 h ;
      - moteur de recherche : Google, DuckDuckGo, Bing, Ecosia, Qwant ;
      - ton prenom ;
      - ta cle d'intelligence artificielle ;
      - « reponses courtes », pour menager ton credit.

  · En bas a gauche, un bouton discret telecharge Nexus pour macOS.

AVEC OU SANS CLE

  Sans cle, Nexus ne fait pas semblant de rediger : il vise. Il lit ta
  question et propose les sources les plus DIRECTES — Larousse pour un mot,
  DeepL pour une traduction, YouTube et Wikipedia pour une notion de cours,
  Maps pour une adresse, Scholar pour une source. Il calcule aussi.

  Avec une cle, il rédige la réponse, puis affiche quand meme ces sources.
  Sont reconnues toutes seules : Google Gemini, OpenAI, Anthropic, Groq,
  Mistral, OpenRouter. La cle reste dans CE navigateur.

  L'extension ne demande AUCUNE autorisation de site a l'installation.
  Google Gemini et Anthropic repondent directement au navigateur. Si tu
  ajoutes une cle OpenAI, Groq, Mistral ou OpenRouter, Chrome te demandera
  l'autorisation a ce moment-la, et pour ce site-la uniquement.

LE BOUTON DANS LA BARRE D'OUTILS

  Une note ou une tache en deux secondes. « Cette page » enregistre le titre
  et l'adresse. Clic droit sur du texte selectionne n'importe ou sur le web :
  « Enregistrer dans Nexus » ou « Ajouter aux taches Nexus ».

  Ce que tu ecris est enregistre dans Nexus sur ce navigateur. Pour le
  retrouver sur ton Mac et tes autres appareils, connecte-toi au site : le
  bouton « Compte », en bas de la petite fenetre, y mene directement.

NOUVEAU EN 2.2 — reglages complets en panneau lateral, fonds et ambiances,
recherche ciblee avec ou sans cle, ouverture des espaces en grand, bouton
macOS, et un pied de fenetre qui dit la verite sur ton compte.

Marche aussi sur Edge, Brave, Opera et Vivaldi (meme procedure).
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

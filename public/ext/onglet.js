// ============================================================================
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
/// Les réglages d'avant. « format24 » et « aiguilles » étaient deux bascules
/// qui pouvaient se contredire ; c'est maintenant un seul choix. On traduit les
/// anciens plutôt que de remettre Aharon en 24 h sans prévenir.
function reprendreLesAnciens(r) {
  if (!r || r.format) return r;
  if (r.aiguilles) r.format = "aiguilles";
  else if (r.format24 === false) r.format = "12h";
  else r.format = "24h";
  delete r.aiguilles; delete r.format24;
  return r;
}

const PAR_DEFAUT = {
  fond: "nuit", fondImage: "", theme: "indigo", voile: 0,
  heure: true, espaces: true, halos: true, boutonMac: true,
  // L'heure : un FORMAT, pas trois bascules qui se contredisent. « Format 24 h »
  // et « Horloge à aiguilles » pouvaient être cochés tous les deux, et l'un des
  // deux ne servait alors à rien — sans que rien ne le dise.
  format: "24h",            // "24h" · "12h" · "aiguilles"
  tailleHeure: "moyen",     // "petit" · "moyen" · "grand"
  secondes: false, chiffresCadran: false, dateSousHeure: true,
  moteur: "google", prenom: "", cle: "", court: true, ecole: true,
  vignettes: true,
  // Quelques raccourcis pour demarrer. Il les change comme il veut.
  raccourcis: [
    { nom: "École Directe", url: "https://www.ecoledirecte.com" },
    { nom: "YouTube", url: "https://www.youtube.com" },
    { nom: "Gmail", url: "https://mail.google.com" },
  ],
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
    f.style.backgroundImage = `url("${R.fondImage}")`;
    f.style.background = `#07070b url("${R.fondImage}") center/cover no-repeat`;
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
  // Cette variable est une COULEUR. Elle s'appelait « --doux », le meme nom que
  // la courbe de fondu du vocabulaire de mouvement : elle l'ecrasait, et les
  // six transitions qui s'en servaient tombaient a plat sans que rien ne le
  // dise. La couleur s'appelle desormais « --texte-doux ».
  s.setProperty("--texte-doux", clair ? "#4a4a56" : "#a5a5b2");
  s.setProperty("--faible", clair ? "#6c6c78" : "#6e6e78");
  s.setProperty("--bord", clair ? "rgba(0,0,0,.12)" : "rgba(255,255,255,.13)");
  s.setProperty("--verre", clair ? "rgba(255,255,255,.55)" : "rgba(255,255,255,.07)");
  s.setProperty("--verre2", clair ? "rgba(255,255,255,.75)" : "rgba(255,255,255,.1)");

  $("tete").style.display = R.heure ? "" : "none";
  $("esp").style.display = R.espaces ? "" : "none";
  $("mac").style.display = R.boutonMac ? "" : "none";

  document.body.classList.toggle("calme", !R.halos);
  // Le panneau, la roue et les cartes doivent s'eclaircir avec le fond.
  document.body.classList.toggle("clair", clair);
  $("lueur").style.display = R.halos && !R.fondImage ? "" : "none";
  battre();
  dessinerRaccourcis();
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
// Les douze graduations du cadran, posées par le script : douze lignes écrites
// en dur, ce seraient douze occasions de se tromper d'un degré.
function dessinerGraduations() {
  const g = document.getElementById("grad");
  if (!g || g.childElementCount) return;
  for (let i = 0; i < 12; i++) {
    const a = (i * 30) * Math.PI / 180;
    const r1 = i % 3 === 0 ? 36 : 39.5, r2 = 43;
    const l = document.createElementNS("http://www.w3.org/2000/svg", "line");
    l.setAttribute("x1", (50 + r1 * Math.sin(a)).toFixed(2));
    l.setAttribute("y1", (50 - r1 * Math.cos(a)).toFixed(2));
    l.setAttribute("x2", (50 + r2 * Math.sin(a)).toFixed(2));
    l.setAttribute("y2", (50 - r2 * Math.cos(a)).toFixed(2));
    l.setAttribute("stroke", i % 3 === 0 ? "rgba(255,255,255,.55)" : "rgba(255,255,255,.22)");
    l.setAttribute("stroke-width", i % 3 === 0 ? "2.2" : "1.4");
    l.setAttribute("stroke-linecap", "round");
    g.appendChild(l);
  }
}

/// Les chiffres du cadran, quand on les veut. Douze textes places au compas :
/// les ecrire en dur, ce seraient douze occasions de se tromper d'un degre.
function dessinerChiffres() {
  const g = document.getElementById("chiffres");
  if (!g) return;
  g.innerHTML = "";
  if (!R.chiffresCadran) return;
  for (let i = 1; i <= 12; i++) {
    const a = (i * 30 - 90) * Math.PI / 180;
    const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
    t.setAttribute("class", "chiffre");
    t.setAttribute("x", (50 + 31 * Math.cos(a)).toFixed(2));
    t.setAttribute("y", (50 + 31 * Math.sin(a)).toFixed(2));
    t.textContent = String(i);
    g.appendChild(t);
  }
}

const TAILLES = { petit: "96px", moyen: "132px", grand: "176px" };

function appliquerHorloge() {
  const aig = R.format === "aiguilles";
  document.body.classList.toggle("aiguilles", aig);
  document.documentElement.style.setProperty("--cadran",
    TAILLES[R.tailleHeure] || TAILLES.moyen);
  // Les chiffres suivent la même taille : à 96 px, l'heure écrite doit rétrécir
  // aussi, sinon elle déborde de la boîte de recherche.
  const h = document.getElementById("heure");
  if (h) h.style.fontSize = R.tailleHeure === "petit" ? "52px"
    : R.tailleHeure === "grand" ? "104px" : "78px";
  const s = document.getElementById("aigS");
  if (s) s.style.display = R.secondes ? "" : "none";
  if (aig) { dessinerGraduations(); dessinerChiffres(); }
}

function battre() {
  const d = new Date();
  const hh = d.getHours(), mm = d.getMinutes(), ss = d.getSeconds();

  if (R.format === "aiguilles") {
    const tourner = (id, deg) => {
      const e = document.getElementById(id);
      if (!e) return;
      // À midi pile, l'aiguille repasse de 354° à 0° : sans ce détour elle
      // ferait un tour complet à l'envers sous les yeux. On laisse alors filer
      // au-delà de 360 plutôt que de revenir en arrière.
      const av = parseFloat(e.dataset.deg || "0");
      let d2 = deg;
      while (d2 < av - 180) d2 += 360;
      e.dataset.deg = String(d2);
      e.style.transform = "rotate(" + d2.toFixed(2) + "deg)";
    };
    tourner("aigH", ((hh % 12) + mm / 60) * 30);
    tourner("aigM", (mm + ss / 60) * 6);
    if (R.secondes) tourner("aigS", ss * 6);
  } else {
    const base = R.format === "12h"
      ? d.toLocaleTimeString("fr-FR", { hour: "numeric", minute: "2-digit", hour12: true })
      : deux(hh) + ":" + deux(mm);
    $("heure").textContent = R.secondes ? base + ":" + deux(ss) : base;
  }

  $("bonjour").textContent = salut(hh) + (R.prenom ? " " + R.prenom : "")
    + (R.dateSousHeure
        ? " · " + JOURS[d.getDay()] + " " + d.getDate() + " " + MOIS[d.getMonth()]
        : "");
}
appliquerHorloge();
setInterval(battre, 1000);

// -- Les raccourcis ----------------------------------------------------------
// Comme la page d'accueil d'un navigateur : des tuiles vers des sites.
// Les deux premieres sont FIXES et ne s'effacent pas — Nexus et NeoSchool sont
// chez nous. Les suivantes appartiennent a Aharon.
//
// Avant, ces boutons ouvraient « le site avec telle application » : ils se
// ressemblaient tous et donnaient l'impression de ne rien faire. Un raccourci
// doit mener quelque part, franchement.
const FIXES = [
  // Nos deux maisons : on leur donne NOS icones, pas la vignette generique
  // qu'un service tiers rend pour un site qu'il ne connait pas.
  { nom: "Nexus", url: SITE + "/", icone: "icones/48.png" },
  { nom: "NeoSchool", url: NEO, glyphe: "🎓" },
];

/// La vignette d'un site. On tente celle du site lui-meme ; si elle ne vient
/// pas, on dessine une pastille avec son initiale. Rien ne casse jamais.
function vignette(url, nom, r) {
  const p = document.createElement("span");
  p.className = "p";
  // Une icone a nous : on s'arrete la.
  if (r && r.icone) {
    const i = new Image(); i.width = 30; i.height = 30; i.alt = "";
    i.src = r.icone; p.appendChild(i); return p;
  }
  if (r && r.glyphe) {
    const g = document.createElement("span");
    g.textContent = r.glyphe; g.style.fontSize = "24px";
    p.style.background = "linear-gradient(150deg,#5b8def,#3457a8)";
    p.appendChild(g); return p;
  }
  let hote = "";
  try { hote = new URL(url).hostname; } catch (_) {}
  const lettre = document.createElement("span");
  lettre.textContent = (nom || hote || "?").trim().charAt(0).toUpperCase();
  // Une couleur stable, tiree du nom : deux sites differents ne se ressemblent
  // jamais, et la meme tuile garde toujours la meme couleur.
  let h = 0;
  for (const c of (hote || nom || "?")) h = (h * 31 + c.charCodeAt(0)) % 360;
  p.style.background = `linear-gradient(150deg,hsl(${h} 62% 52%),hsl(${(h + 38) % 360} 58% 38%))`;
  p.appendChild(lettre);
  // On passe l'ADRESSE COMPLETE : Chrome retrouve l'icone d'une page precise,
  // pas seulement celle d'un domaine.
  if (hote && R.vignettes) poserLaVignette(p, hote, url);
  return p;
}

// ── Trouver la BONNE icone d'un site ────────────────────────────────────────
// On demandait tout a « google.com/s2/favicons ». Ce service RETOMBE sur le
// domaine principal des qu'il s'agit d'un sous-domaine : Google Classroom
// recevait le logo de la recherche Google, Drive et Gmail aussi. Verifie le
// 1er septembre 2026 — et le service de DuckDuckGo fait exactement pareil
// (meme fichier au octet pres pour classroom, drive et mail).
//
// Le favicon du site LUI-MEME, lui, ne peut pas se tromper d'adresse. On le
// demande donc en premier, et l'on ne retombe sur Google qu'en dernier.
const ICONES_CONNUES = {
  // Les rares qui ne servent aucun favicon a leur propre adresse. Ecrit a la
  // main, verifie a la main — pas devine.
  "classroom.google.com": "https://ssl.gstatic.com/classroom/favicon.png",
};

function poserLaVignette(p, hote, adresse) {
  const sources = [];
  // 1. CHROME LUI-MEME. Il connait deja l'icone de chaque site : c'est celle
  //    qu'il affiche dans tes onglets et tes favoris. Elle ne peut pas se
  //    tromper, elle marche pour les sous-domaines, et elle n'a besoin
  //    d'aucune liste ecrite a la main. Il faut la permission « favicon ».
  //    C'etait la bonne reponse depuis le debut ; je passais a cote.
  try {
    if (chrome.runtime && chrome.runtime.getURL) {
      sources.push(chrome.runtime.getURL(
        "/_favicon/?pageUrl=" + encodeURIComponent(adresse || ("https://" + hote + "/")) + "&size=64"));
    }
  } catch (e) {}
  // 2. Une exception ecrite a la main, pour les rares qui n'en servent aucune.
  if (ICONES_CONNUES[hote]) sources.push(ICONES_CONNUES[hote]);
  // 3. Le site lui-meme.
  sources.push("https://" + hote + "/apple-touch-icon.png");
  sources.push("https://" + hote + "/favicon.ico");
  // 4. En TOUT DERNIER, le service de Google — celui qui RETOMBE sur le domaine
  //    principal et donnait le logo de la recherche pour Classroom, Drive et
  //    Gmail. On ne l'utilise que si tout le reste a echoue.
  sources.push("https://www.google.com/s2/favicons?domain=" + encodeURIComponent(hote) + "&sz=64");

  let n = 0;
  const essayer = () => {
    if (n >= sources.length) return;            // on garde la lettre coloree
    const img = new Image();
    img.width = 28; img.height = 28; img.alt = "";
    img.referrerPolicy = "no-referrer";
    img.onload = () => {
      // Une image d'un pixel est une image d'erreur deguisee.
      if (img.naturalWidth < 8) { n++; essayer(); return; }
      p.style.background = "";
      p.replaceChildren(img);
    };
    img.onerror = () => { n++; essayer(); };
    img.src = sources[n];
  };
  essayer();
}

function tuile(r, i) {
  const { nom, url, fixe } = r;
  const b = document.createElement("button");
  b.className = "tuile" + (fixe ? " fixe" : "");
  b.title = url;
  b.style.animationDelay = (0.03 + i * 0.03).toFixed(2) + "s";
  b.appendChild(vignette(url, nom, r));
  const e = document.createElement("em");
  e.textContent = nom;
  b.appendChild(e);
  b.addEventListener("click", (ev) => {
    if (ev.target.closest(".x")) return;
    window.location.href = url;
  });
  if (!fixe) {
    const x = document.createElement("button");
    x.className = "x"; x.textContent = "×"; x.title = "Retirer ce raccourci";
    x.addEventListener("click", (ev) => {
      ev.stopPropagation();
      R.raccourcis = R.raccourcis.filter((r) => r.url !== url);
      Rangement.ecrire({ raccourcis: R.raccourcis });
      dessinerRaccourcis();
    });
    b.appendChild(x);
  }
  return b;
}

function dessinerRaccourcis() {
  const esp = $("esp");
  if (!esp) return;
  esp.replaceChildren();
  const liste = [...FIXES.map((f) => ({ ...f, fixe: true })), ...(R.raccourcis || [])];
  liste.forEach((r, i) => esp.appendChild(tuile(r, i)));

  // La tuile « + » : on ajoute un site a soi.
  const plus = document.createElement("button");
  plus.className = "tuile plus";
  plus.style.animationDelay = (0.03 + liste.length * 0.03).toFixed(2) + "s";
  const p = document.createElement("span");
  p.className = "p";
  const s = document.createElement("span"); s.textContent = "+";
  p.appendChild(s); plus.appendChild(p);
  const e = document.createElement("em"); e.textContent = "Ajouter";
  plus.appendChild(e);
  plus.addEventListener("click", ajouterRaccourci);
  esp.appendChild(plus);
}

function ajouterRaccourci() {
  const brut = window.prompt("Adresse du site (ex. ecoledirecte.com)");
  if (!brut) return;
  let url = brut.trim();
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  let hote = "";
  try { hote = new URL(url).hostname.replace(/^www\./, ""); }
  catch (_) { return; }
  const nom = (window.prompt("Nom du raccourci", hote) || hote).trim().slice(0, 18);
  R.raccourcis = [...(R.raccourcis || []).filter((r) => r.url !== url), { nom, url }];
  Rangement.ecrire({ raccourcis: R.raccourcis });
  dessinerRaccourcis();
}

// -- Recherche ---------------------------------------------------------------
function estUneAdresse(t) {
  if (/\s/.test(t)) return false;
  if (/^https?:\/\//i.test(t)) return true;
  return /^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(t);
}
function chercher(t) {
  if (estUneAdresse(t)) {
    window.location.href = /^https?:\/\//i.test(t) ? t : "https://" + t;
    return;
  }
  const m = MOTEURS[R.moteur] || MOTEURS.google;
  window.location.href = m.url(encodeURIComponent(t));
}

// -- L'intelligence sans intelligence ---------------------------------------
// Sans cle, on ne rédige pas : on vise juste. Le but est qu'un lycéen tombe en
// UN clic sur la bonne source, au lieu d'une page de résultats à trier.
function calculer(t) {
  const propre = t.replace(/[^0-9+\-*/().,%^ ]/g, "").replace(/,/g, ".").trim();
  if (!propre || !/[0-9]/.test(propre) || !/[+\-*/^%]/.test(propre)) return null;
  if (propre.length > 80) return null;
  try {
    const v = Function('"use strict";return (' + propre.replace(/\^/g, "**") + ")")();
    if (typeof v !== "number" || !isFinite(v)) return null;
    return { calcul: propre, valeur: Math.round(v * 1e10) / 1e10 };
  } catch (_) { return null; }
}

function cibler(q) {
  const e = encodeURIComponent(q);
  const bas = q.toLowerCase();
  const mots = q.trim().split(/\s+/).length;
  const L = [];
  const A = (icone, titre, sous, url) => L.push({ icone, titre, sous, url });

  const trad = bas.match(/^(?:traduis|traduire|traduction de)\s+(.+)$/);
  if (trad) {
    const x = encodeURIComponent(trad[1]);
    A("🌍", "DeepL", "La meilleure traduction", "https://www.deepl.com/translator#fr/en/" + x);
    A("🔤", "Google Traduction", "Rapide, 100 langues",
      "https://translate.google.com/?sl=auto&tl=en&text=" + x);
  }
  if (/^(definition|définition|sens|que veut dire|c'est quoi)\b/.test(bas) || mots === 1) {
    A("📖", "Larousse", "Définition en français",
      "https://www.larousse.fr/dictionnaires/francais/" + e);
    A("📚", "Wiktionnaire", "Étymologie et emplois",
      "https://fr.wiktionary.org/wiki/" + e);
  }
  if (/\b(cours|exercice|revision|révision|bac|brevet|dissertation|theoreme|théorème|formule|demonstration|démonstration)\b/.test(bas)
      || /^(explique|comment marche|pourquoi)\b/.test(bas)) {
    A("🎓", "NeoSchool", "Tes notes et tes devoirs", NEO);
    A("📓", "Nexus École", "Tes cours et tes fiches", SITE + "/?app=learn");
    A("▶️", "YouTube", "Explications en vidéo",
      "https://www.youtube.com/results?search_query=" + e);
    A("🧮", "Wikipédia", "L'article de fond", "https://fr.wikipedia.org/w/index.php?search=" + e);
  }
  if (/^(comment|tuto|apprendre a|apprendre à)\b/.test(bas)) {
    A("▶️", "YouTube", "Le geste en vidéo",
      "https://www.youtube.com/results?search_query=" + e);
  }
  if (/\b(meteo|météo|temperature|température|pluie|demain)\b/.test(bas)) {
    A("🌤", "Météo-France", "Prévisions officielles",
      "https://meteofrance.com/recherche/resultats?query=" + e);
  }
  if (/\b(acheter|prix|pas cher|promo|avis)\b/.test(bas)) {
    A("🛒", "Google Shopping", "Comparer les prix",
      "https://www.google.com/search?tbm=shop&q=" + e);
  }
  if (/\b(itineraire|itinéraire|adresse|ou est|où est|restaurant|gare|horaires)\b/.test(bas)) {
    A("📍", "Google Maps", "Sur la carte", "https://www.google.com/maps/search/" + e);
  }
  if (/\b(article|etude|étude|recherche scientifique|these|thèse|source)\b/.test(bas)) {
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

// Refermer, c'est le MEME geste a l'envers : la reponse se replie, la boite
// retrecit, ses coins s'arrondissent, la loupe revient et le retour s'efface.
// Tout est deja decrit en CSS — il suffit d'enlever la classe.
function fermerPanneau() {
  if (!document.body.classList.contains("ouvert")) return false;
  document.body.classList.remove("ouvert");
  // On vide la reponse APRES le repli : la vider tout de suite ferait
  // disparaitre le texte d'un coup au lieu de le laisser se replier.
  setTimeout(function () {
    if (!document.body.classList.contains("ouvert")) {
      var r = document.getElementById("res");
      if (r) r.innerHTML = "";
    }
  }, 620);
  var q = document.getElementById("q");
  if (q) q.focus();
  return true;
}
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
  if (/^AIza|^AQ\./.test(c)) return { nom: "Google Gemini", genre: "google" };
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
  const motif = f.base.replace(/^(https:\/\/[^/]+).*$/, "$1") + "/*";
  try {
    if (!chrome?.permissions) return true;
    const deja = await new Promise((r) =>
      chrome.permissions.contains({ origins: [motif] }, r));
    if (deja) return true;
    return await new Promise((r) => chrome.permissions.request({ origins: [motif] }, r));
  } catch (_) { return true; }
}

// ── L'IA QUI TOURNE CHEZ TOI (Ollama) ───────────────────────────────────────
// La meme cascade que sur le site : la cle d'abord si elle existe, sinon le
// modele installe sur cette machine, gratuit et hors ligne. Aharon voulait les
// trois surfaces — le site, l'application Mac et l'extension — capables de
// repondre sans cle.
//
// Une extension Chrome a un avantage sur un site : elle n'est pas soumise aux
// memes regles d'origine, elle peut donc parler a Ollama directement, sans que
// tu aies rien a regler.
const OLLAMA = "http://127.0.0.1:11434";
let ollamaConnu = null;                       // null = pas encore regarde

async function ollamaModele() {
  if (ollamaConnu !== null) return ollamaConnu;
  // Une extension doit DEMANDER le droit de parler a une adresse. On le fait
  // ici, sans fenetre modale : `contains` ne derange personne, et `request`
  // n'est tente que si l'on a le droit de le faire (une frappe compte comme
  // un geste de l'utilisateur).
  try {
    const regle = { origins: ["http://127.0.0.1:11434/*"] };
    const dejaLa = await new Promise(r => chrome.permissions.contains(regle, r));
    if (!dejaLa) {
      const donne = await new Promise(r => chrome.permissions.request(regle, r));
      if (!donne) { ollamaConnu = false; return false; }
    }
  } catch (e) { /* pas d'API des permissions : on tente quand meme */ }
  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 1500);
    const r = await fetch(OLLAMA + "/api/tags", { signal: c.signal });
    clearTimeout(t);
    if (!r.ok) { ollamaConnu = false; return false; }
    const d = await r.json();
    const noms = (d.models || []).map(m => m.name).filter(Boolean);
    const prefs = ["llama3.2","llama3.1","llama3","qwen2.5","mistral","gemma2","gemma3","phi3"];
    ollamaConnu = noms.find(n => prefs.some(p => n.startsWith(p))) || noms[0] || false;
  } catch (e) { ollamaConnu = false; }
  return ollamaConnu;
}

async function demanderALocal(question, court) {
  const m = await ollamaModele();
  if (!m) return null;
  try {
    const r = await fetch(OLLAMA + "/api/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: m, stream: false, messages: [
        { role: "system", content: "Tu es Nexus. Réponds en français, avec justesse"
          + (court ? ", en trois phrases au plus." : ", sans bavardage.") },
        { role: "user", content: question }] }),
    });
    if (!r.ok) return null;
    const d = await r.json();
    const t = d && d.message && d.message.content;
    return (typeof t === "string" && t.trim()) ? { texte: t, modele: m } : null;
  } catch (e) { return null; }
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
    // Avant de renoncer : le modele de CETTE machine, s'il y en a un. Gratuit,
    // hors ligne, et rien de ce qui est ecrit ne sort d'ici.
    const local = await demanderALocal(t, R.court);
    if (local) {
      const d = document.createElement("div");
      d.className = "rep";
      d.innerHTML = '<div class="sig">✦ ' + ech(local.modele) + ' · sur ta machine</div>';
      d.appendChild(document.createTextNode(local.texte));
      res.appendChild(d); res.scrollTop = res.scrollHeight;
      return;
    }
    // Sans cle ni modele local : on ne rédige pas, on vise. Et on dit ou
    // trouver mieux.
    poserLiens(cibler(t));
    const d = document.createElement("div");
    d.className = "rep";
    d.innerHTML = '<div class="sig">✦ Nexus</div>Voilà les sources les plus '
      + 'directes pour ça.<br><br>Pour une vraie réponse rédigée, au choix :<br>'
      + '· une clé, dans les réglages (la roue, en bas à droite) ;<br>'
      + '· ou <b>gratuitement, sur ta machine</b> : installe Ollama depuis '
      + 'ollama.com, puis colle dans le Terminal <code>ollama pull llama3.2</code>. '
      + 'Nexus le trouvera tout seul.';
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
  if (e.key === "Escape") { if (!fermerPanneau()) $("q").value = ""; }
});
$("retour").addEventListener("click", fermerPanneau);
document.addEventListener("keydown", (e) => {
  // Echap rend la main OU QUE SOIT le curseur : avant, il ne marchait que si
  // l'on n'avait pas quitte le champ de recherche.
  if (e.key === "Escape" && document.activeElement !== $("q")) fermerPanneau();
  if (e.key === "/" && document.activeElement !== $("q")) { e.preventDefault(); $("q").focus(); }
});
// Cliquer a cote referme aussi — comme on repose un objet.
document.addEventListener("mousedown", (e) => {
  if (!document.body.classList.contains("ouvert")) return;
  if (document.body.classList.contains("reglages")) return;
  if (!e.target.closest("#boite")) fermerPanneau();
});

// -- Les coins ---------------------------------------------------------------
// « Nexus pour macOS » TELECHARGE l'application. Avant, on ouvrait un onglet
// sur le fichier : selon la reponse du serveur, Chrome affichait le site au
// lieu de telecharger, et l'on se retrouvait sur la page d'accueil sans
// comprendre. `chrome.downloads` ne laisse aucune place au doute — le fichier
// apparait dans la barre de telechargements, avec sa progression.
$("mac").addEventListener("click", () => {
  const url = SITE + "/Nexus-macOS.zip";
  const etat = document.getElementById("mac");
  const direBref = (t) => {
    const avant = etat.textContent;
    etat.textContent = t;
    setTimeout(() => { etat.textContent = avant; }, 2600);
  };
  if (chrome.downloads && chrome.downloads.download) {
    chrome.downloads.download({ url, filename: "Nexus-macOS.zip" }, (id) => {
      if (chrome.runtime.lastError || id === undefined) {
        window.open(url, "_blank", "noopener");
        return;
      }
      direBref("Téléchargement…");
    });
    return;
  }
  window.open(url, "_blank", "noopener");
});

// -- Le panneau de reglages --------------------------------------------------
// Le panneau deborde largement : sans rien, il est tranche net contre son
// bord et l'on ne voit pas qu'il defile — on voit un reglage coupe en deux.
// Le contenu s'efface donc sur les derniers pixels, et le voile disparait des
// qu'on est arrive au bout. Meme geste que la palette du site.
const corpsReglages = () => document.getElementById("corps");
function mesurerDefilement() {
  const el = corpsReglages();
  if (!el) return;
  const reste = el.scrollHeight - el.scrollTop - el.clientHeight > 4;
  el.classList.toggle("reste-en-bas", reste);
}
const ouvrirReglages = () => {
  document.body.classList.add("reglages");
  // Apres l'ouverture : tant que le panneau est a l'echelle 0,055 ses mesures
  // ne veulent rien dire.
  setTimeout(mesurerDefilement, 640);
};
const fermerReglages = () => document.body.classList.remove("reglages");
// Le script est charge en fin de page : l'element existe deja et
// « DOMContentLoaded » peut etre passe. On branche tout de suite si on peut.
(function brancherDefilement() {
  const el = corpsReglages();
  if (el) { el.addEventListener("scroll", mesurerDefilement, { passive: true }); return; }
  document.addEventListener("DOMContentLoaded", brancherDefilement, { once: true });
})();
window.addEventListener("resize", mesurerDefilement);
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
  // Le format de l'heure, et sa taille : des choix, pas des bascules qui se
  // contredisent.
  const rangee = (id, choix, champ, apres) => {
    const r = document.getElementById(id);
    if (!r) return;
    r.innerHTML = "";
    for (const [val, nom] of choix) {
      const b = document.createElement("button");
      b.className = "opt" + (R[champ] === val ? " on" : "");
      b.textContent = nom;
      b.addEventListener("click", () => {
        garder(champ, val);
        construireReglages();
        appliquerHorloge();
        battre();
        if (apres) apres();
      });
      r.appendChild(b);
    }
  };
  rangee("formats", [["24h", "14:05"], ["12h", "2:05 PM"], ["aiguilles", "Aiguilles"]], "format");
  rangee("taillesHeure", [["petit", "Petit"], ["moyen", "Moyen"], ["grand", "Grand"]], "tailleHeure");

  // Les bascules
  const bascules = [["tHeure","heure"],["tEsp","espaces"],["tHalo","halos"],
                    ["tMac","boutonMac"],["tCourt","court"],
                    ["tVign","vignettes"],["tSec","secondes"],
                    ["tChiffres","chiffresCadran"],["tDate","dateSousHeure"]];
  for (const [id, champ] of bascules) {
    const b = $(id);
    b.classList.toggle("on", !!R[champ]);
    b.onclick = () => {
      garder(champ, !R[champ]);
      b.classList.toggle("on", !!R[champ]);
      if (champ === "vignettes") dessinerRaccourcis();
      // Ces trois-là changent l'heure : on la redessine tout de suite, sinon on
      // coche et il ne se passe rien pendant une seconde entière.
      if (champ === "secondes" || champ === "chiffresCadran"
          || champ === "dateSousHeure") { appliquerHorloge(); battre(); }
    };
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
  R = reprendreLesAnciens({ ...PAR_DEFAUT, ...v });
  appliquer();
  dessinerRaccourcis();
  construireReglages();
  $("q").focus();
})();

#!/usr/bin/env node
// ============================================================================
//  « Vérifie sur le site que je vais publier que TOUS LES TÉLÉCHARGEMENTS
//    mènent à la dernière version. »  — Aharon
//
//  Il a raison d'insister : il s'est déjà retrouvé avec deux dossiers
//  d'apparence identique dont un périmé, et le 3 septembre 2026 le zip de
//  l'application contenait encore l'ANCIEN jeu, parce que l'application avait
//  été construite avant le site.
//
//  Ce script regarde ce que le site VA VRAIMENT SERVIR, pas ce qu'on croit.
// ============================================================================
const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const RACINE = path.join(__dirname, "..");
const DIST = path.join(RACINE, "dist");
const EXT = path.join(RACINE, "public", "ext");

let soucis = [];
const bon = (t) => console.log("  ✓ " + t);
const mal = (t) => { console.log("  ✗ " + t); soucis.push(t); };

console.log("Ce que le site va servir");
console.log("-".repeat(64));

// ── 1. Le site lui-même est-il à jour ? ─────────────────────────────────────
if (!fs.existsSync(path.join(DIST, "index.html"))) {
  mal("dist/index.html manque : le site n'a pas été construit");
} else {
  const t = fs.statSync(path.join(DIST, "index.html")).mtimeMs;
  const plusRecent = [];
  const parcourir = (d) => {
    for (const n of fs.readdirSync(d)) {
      if (n === "node_modules" || n.startsWith(".")) continue;
      // Le zip de l'application n'est pas construit par le site : c'est
      // `construire.sh` qui l'ecrit dans public/ ET dans dist/ d'un meme
      // geste. Il est donc toujours « plus recent » sans rien signifier.
      if (n === "Nexus-macOS.zip") continue;
      const p = path.join(d, n);
      const s = fs.statSync(p);
      if (s.isDirectory()) parcourir(p);
      else if (s.mtimeMs > t + 1000) plusRecent.push(path.relative(RACINE, p));
    }
  };
  parcourir(path.join(RACINE, "src"));
  parcourir(path.join(RACINE, "public"));
  if (plusRecent.length) {
    mal(`le site est PÉRIMÉ : ${plusRecent.length} fichier(s) plus récents `
      + `que dist/ (${plusRecent.slice(0, 3).join(", ")}…) — lance « npm run build »`);
  } else bon("le site construit est à jour");
}

// ── 2. L'application macOS ──────────────────────────────────────────────────
const zip = path.join(DIST, "Nexus-macOS.zip");
if (!fs.existsSync(zip)) {
  mal("dist/Nexus-macOS.zip manque : le bouton « Nexus pour macOS » ne donnera rien");
} else {
  const mo = fs.statSync(zip).size / 1024 / 1024;
  // Le zip s'était mis à contenir l'application PRÉCÉDENTE, puis celle
  // d'avant : 1,4 Mo, puis 77 Mo, puis tout casse.
  if (mo > 40) mal(`Nexus-macOS.zip pèse ${mo.toFixed(0)} Mo — il se contient probablement lui-même`);
  else bon(`Nexus-macOS.zip : ${mo.toFixed(1)} Mo`);

  const tmp = fs.mkdtempSync(path.join(require("os").tmpdir(), "nexus-verif-"));
  try {
    cp.execSync(`ditto -x -k ${JSON.stringify(zip)} ${JSON.stringify(tmp)}`);
    const app = path.join(tmp, "Nexus.app");
    const plist = path.join(app, "Contents", "Info.plist");
    // `defaults read` rend les accents echappes (« \340 » pour « à »).
    const lire = (c) => cp.execSync(`defaults read ${JSON.stringify(plist)} ${c}`,
      { encoding: "utf8" }).trim().replace(/\\3[0-7][0-7]/g, "à");
    const v = lire("CFBundleShortVersionString");
    bon(`l'application proposée est la version ${v} (construite le ${lire("NexusConstruction")})`);

    // Le piège du 3 septembre : l'application embarque une COPIE du site, et
    // cette copie peut être plus vieille que le site qu'on publie.
    const dedans = path.join(app, "Contents", "Resources", "site");
    if (!fs.existsSync(path.join(dedans, "index.html"))) {
      mal("l'application ne contient pas le site : le menu « Nexus en ligne » sera vide");
    } else {
      let ecarts = 0;
      const comparer = (rel) => {
        const a = path.join(DIST, rel), b = path.join(dedans, rel);
        if (!fs.existsSync(a) || !fs.existsSync(b)) { ecarts++; return; }
        if (fs.readFileSync(a).compare(fs.readFileSync(b)) !== 0) ecarts++;
      };
      // Les pages que l'application sert telles quelles.
      for (const f of ["neon-arena.html", "arcade.html", "cerveau.html",
                       "ext/onglet.js", "ext/maths.js", "ext/modele-pont.js"]) comparer(f);
      if (ecarts) mal(`${ecarts} fichier(s) du site embarqué diffèrent du site publié `
                    + "— l'application a été construite avant le site");
      else bon("le site embarqué dans l'application est le même que celui publié");
    }
    // Et le jeu servi directement par l'application.
    const jeu = path.join(app, "Contents", "Resources", "neon-arena.html");
    if (fs.existsSync(jeu)
        && fs.readFileSync(jeu).compare(fs.readFileSync(path.join(DIST, "neon-arena.html"))) !== 0) {
      mal("le jeu de l'application n'est pas celui du site");
    } else bon("le jeu de l'application est celui du site");
  } catch (e) {
    mal("impossible d'ouvrir le zip : " + e.message);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

// ── 3. L'extension Chrome ───────────────────────────────────────────────────
// Le site la fabrique en LISANT `/ext/`. Si un fichier manque de dist/, le zip
// téléchargé est incomplet et l'extension refuse de se charger.
const mac = fs.readFileSync(path.join(RACINE, "src", "apps", "MacIntegration.tsx"), "utf8");
const demandes = [...mac.matchAll(/lire\("([^"]+)"\)/g)].map((m) => m[1])
  .concat([...mac.matchAll(/fichierDistant\("\/ext\/([^"]+)"\)/g)].map((m) => m[1]));
let manquants = [];
for (const f of demandes) {
  if (!fs.existsSync(path.join(DIST, "ext", f))) manquants.push(f);
}
if (manquants.length) {
  mal(`le zip de l'extension réclame ${manquants.length} fichier(s) absents de dist/ext : `
    + manquants.join(", "));
} else bon(`le zip de l'extension trouve ses ${demandes.length} fichiers`);

// Le manifeste doit nommer exactement ce qu'on livre.
const man = JSON.parse(fs.readFileSync(path.join(EXT, "manifest.json"), "utf8"));
const cites = new Set();
const ramasser = (o) => {
  if (typeof o === "string") { if (/\.(js|html|png)$/.test(o)) cites.add(o); }
  else if (Array.isArray(o)) o.forEach(ramasser);
  else if (o && typeof o === "object") Object.values(o).forEach(ramasser);
};
ramasser(man);
const absents = [...cites].filter((f) => {
  const direct = path.join(EXT, f);
  const aplat = path.join(EXT, f.replace(/^icones\/(\d+)\.png$/, "icone-$1.png"));
  return !fs.existsSync(direct) && !fs.existsSync(aplat);
});
if (absents.length) mal("le manifeste nomme des fichiers absents : " + absents.join(", "));
else bon(`le manifeste de l'extension ${man.version} nomme ${cites.size} fichiers, tous présents`);

// Les scripts que les pages chargent doivent exister aussi.
for (const page of ["onglet.html", "loupe.html", "popup.html"]) {
  const h = fs.readFileSync(path.join(EXT, page), "utf8");
  for (const m of h.matchAll(/<script src="([^"]+)"/g)) {
    if (!fs.existsSync(path.join(EXT, m[1]))) mal(`${page} charge « ${m[1] } » qui n'existe pas`);
  }
}

// ── 4. Le modèle EN LIGNE part-il avec le site ? ────────────────────────────
//
// C'est le piège qui a coûté le plus cher : le site était publié sans son
// serveur, donc il réclamait une clé à chaque visiteur alors qu'Aharon voulait
// que personne n'ait jamais rien à faire.
const toml = path.join(RACINE, "netlify.toml");
if (!fs.existsSync(toml)) {
  mal("netlify.toml manque : le modèle ne partira pas avec le site");
} else {
  const t = fs.readFileSync(toml, "utf8");
  if (!/functions\s*=\s*"netlify\/functions"/.test(t)) {
    mal("netlify.toml ne déclare pas le dossier des fonctions");
  } else bon("netlify.toml déclare les fonctions");
}
for (const f of ["ia.mjs", "sante.mjs"]) {
  if (!fs.existsSync(path.join(RACINE, "netlify", "functions", f))) {
    mal(`netlify/functions/${f} manque`);
  }
}
// L'ORDRE des renvois. « /* → index.html » placé avant « /api/… » rendait la
// page d'accueil à la place du modèle, et le site en concluait qu'il n'y avait
// pas de serveur.
const red = fs.readFileSync(path.join(RACINE, "public", "_redirects"), "utf8");
const lignes = red.split("\n").filter((l) => l.trim() && !l.startsWith("#"));
const iApi = lignes.findIndex((l) => l.startsWith("/api/"));
const iTout = lignes.findIndex((l) => l.startsWith("/*"));
if (iApi === -1) mal("_redirects n'envoie pas /api vers les fonctions");
else if (iTout !== -1 && iTout < iApi) {
  mal("_redirects : « /* » passe AVANT « /api » — le modèle sera injoignable");
} else bon("les adresses du modèle passent avant le renvoi vers index.html");
// Et dans le site construit, pas seulement dans les sources.
if (!fs.existsSync(path.join(DIST, "_redirects"))) {
  mal("dist/_redirects manque : les renvois ne seront pas publiés");
} else bon("dist/_redirects est publié");

// ── 5. AUCUNE CLÉ NE DOIT PARTIR AVEC LE SITE ───────────────────────────────
//
// Aharon : « j'ai pas envie que ma clé API soit open source ». C'est la chose
// à ne jamais rater : une clé publiée est une clé perdue, et on ne s'en aperçoit
// qu'à la facture. On regarde donc, à chaque fois, TOUT ce qui va être publié.
const MOTIFS = [
  { nom: "clé Google/Gemini", re: /AIza[0-9A-Za-z_\-]{30,}/g },
  { nom: "clé OpenAI", re: /\bsk-[A-Za-z0-9_\-]{20,}/g },
  { nom: "clé Groq", re: /\bgsk_[A-Za-z0-9]{20,}/g },
  { nom: "clé Anthropic", re: /\bsk-ant-[A-Za-z0-9_\-]{20,}/g },
  { nom: "jeton GitHub", re: /\bgh[pousr]_[A-Za-z0-9]{30,}/g },
  { nom: "clé de service Google", re: /"private_key"\s*:\s*"-----BEGIN/g },
];
function fouiller(dossier, trouvés, base) {
  for (const n of fs.readdirSync(dossier)) {
    if (n === "node_modules" || n === ".git") continue;
    const p = path.join(dossier, n);
    const st = fs.statSync(p);
    if (st.isDirectory()) { fouiller(p, trouvés, base); continue; }
    // Les images et les archives ne contiennent pas de clé lisible, et
    // « modele.js » pèse six mégaoctets de bibliothèque : on ne le relit pas.
    if (/\.(png|jpg|jpeg|webp|ico|zip|woff2?|ttf|svg|mp4)$/i.test(n)) continue;
    if (st.size > 3_000_000) continue;
    const t = fs.readFileSync(p, "utf8");
    for (const m of MOTIFS) {
      const trouvé = t.match(m.re);
      if (!trouvé) continue;
      // UNE CLÉ FIREBASE N'EST PAS UN SECRET.
      //
      // Elle identifie le projet, elle n'ouvre rien : Google la publie
      // volontairement dans le code des pages. Confondre les deux, c'est
      // crier au loup à chaque vérification — et le jour où une VRAIE clé
      // fuit, on ne regarde plus.
      // Elle mérite quand même une consigne : voir plus bas.
      const firebase = /firebase|messagingSenderId|authDomain/i.test(t);
      trouvés.push({ quoi: `${m.nom} dans ${path.relative(base, p)}`,
                     grave: !firebase, firebase });
    }
  }
}
const fuites = [];
fouiller(DIST, fuites, RACINE);
// Et dans le code envoyé sur GitHub, pas seulement dans le site construit.
for (const d of ["src", "netlify", "outils", "public"]) {
  const dd = path.join(RACINE, d);
  if (fs.existsSync(dd)) fouiller(dd, fuites, RACINE);
}
for (const f of [".env", ".env.local", ".env.production"]) {
  const p = path.join(RACINE, f);
  if (!fs.existsSync(p)) continue;
  const ignore = fs.existsSync(path.join(RACINE, ".gitignore"))
    && fs.readFileSync(path.join(RACINE, ".gitignore"), "utf8").includes(".env");
  if (!ignore) mal(`${f} existe et n'est PAS ignoré par git : il partirait sur GitHub`);
}
// On ne montre JAMAIS la clé elle-même, même dans un message d'erreur.
const graves = [...new Set(fuites.filter((f) => f.grave).map((f) => f.quoi))];
const firebases = [...new Set(fuites.filter((f) => f.firebase).map((f) => f.quoi))];
if (graves.length) {
  for (const f of graves) mal("UNE CLÉ EST DANS LE CODE PUBLIÉ : " + f);
} else {
  bon("aucune clé secrète dans ce qui va être publié");
}
if (firebases.length) {
  console.log("  · une clé Firebase est publiée (c'est NORMAL : elle identifie");
  console.log("    ton projet, elle n'ouvre rien). Une seule précaution, une fois :");
  console.log("    console.cloud.google.com → Identifiants → cette clé →");
  console.log("    « Restrictions d'application » : sites web, nexus-espace.netlify.app");
  console.log("    « Restrictions d'API » : coche Firebase, PAS Generative Language.");
  console.log("    Et n'utilise JAMAIS cette clé-là comme GEMINI_API_KEY.");
}

console.log("-".repeat(64));
if (soucis.length === 0) {
  console.log("Tous les téléchargements mènent à la dernière version.");
  process.exit(0);
}
console.log(`${soucis.length} problème(s) — NE PAS PUBLIER en l'état.`);
process.exit(1);

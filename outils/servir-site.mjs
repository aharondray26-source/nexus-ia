// ============================================================================
//  Le site EN ENTIER sur ta machine, exactement comme Netlify le servira :
//  les fichiers visuels ET le modèle en ligne, aux mêmes adresses.
//
//      node outils/servir-site.mjs        (puis http://127.0.0.1:4199)
//
//  Sans ça on essaie le site sans son serveur, on voit « il faut une clé »,
//  et l'on croit que le modèle est cassé alors qu'il n'a simplement jamais
//  été branché. C'est exactement ce qui s'est passé en ligne.
// ============================================================================
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ICI = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ICI, "..", "dist");
const PORT = Number(process.argv[2] || 4199);

// Les mêmes renvois que « public/_redirects », dans le même ordre.
const ROUTES = {
  "/api/gemini/chat": "ia", "/api/ai/chat": "ia", "/api/ai/generate": "ia",
  "/api/health": "sante",
};
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".ico": "image/x-icon", ".zip": "application/zip",
  ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8",
};

const fonctions = {};
for (const nom of ["ia", "sante"]) {
  fonctions[nom] = (await import(
    path.join(ICI, "..", "netlify", "functions", nom + ".mjs"))).default;
}

http.createServer(async (req, rep) => {
  const url = new URL(req.url, "http://127.0.0.1");
  const nom = ROUTES[url.pathname];

  if (nom) {
    // On rejoue la requête telle que Netlify la donnerait à la fonction.
    const morceaux = [];
    for await (const m of req) morceaux.push(m);
    const requete = new Request("http://127.0.0.1" + req.url, {
      method: req.method,
      headers: req.headers,
      body: ["GET", "HEAD"].includes(req.method) ? undefined : Buffer.concat(morceaux),
    });
    try {
      const r = await fonctions[nom](requete, {});
      const corps = Buffer.from(await r.arrayBuffer());
      rep.writeHead(r.status, Object.fromEntries(r.headers));
      rep.end(corps);
    } catch (e) {
      rep.writeHead(500, { "Content-Type": "application/json" });
      rep.end(JSON.stringify({ error: "la fonction a levé : " + e.message }));
    }
    return;
  }

  // Le reste : les fichiers, et sinon index.html (le site est une seule page).
  let f = path.join(DIST, decodeURIComponent(url.pathname));
  if (!f.startsWith(DIST)) { rep.writeHead(403); rep.end(); return; }
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(DIST, "index.html");
  if (!fs.existsSync(f)) {
    rep.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    rep.end("Le site n'est pas construit : lance « npm run build ».");
    return;
  }
  rep.writeHead(200, {
    "Content-Type": TYPES[path.extname(f)] || "application/octet-stream",
    "Cache-Control": "no-store",
  });
  fs.createReadStream(f).pipe(rep);
}).listen(PORT, "127.0.0.1", () => {
  console.log(`Nexus, site + modèle, sur http://127.0.0.1:${PORT}`);
  console.log(process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY
    ? "  · une clé est présente : le modèle répondra EN LIGNE"
    : "  · aucune clé ici : le site basculera sur le modèle du navigateur");
});

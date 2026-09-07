// ============================================================================
//  QUI A LE DROIT D'APPELER LE MODÈLE
//
//  Aharon : « j'ai pas envie que ma clé soit utilisée par tout le monde, elle
//  va être épuisée. » Une autorisation trop large la vide ; une autorisation
//  trop étroite prive les applications de bureau d'intelligence — et c'était
//  le cas jusqu'ici, sans le moindre message d'erreur.
//
//  On vérifie donc les deux côtés : ce qui doit passer, et ce qui doit être
//  refusé. Le second est le plus important.
//
//  À lancer : node outils/origines.mjs
// ============================================================================

import { origineAcceptee } from "../netlify/lib/modele.mjs";

let reussis = 0, total = 0;
function verifier(quoi, ok, detail = "") {
  total++;
  if (ok) reussis++;
  console.log(`  ${ok ? "✅" : "❌"} ${quoi}${detail ? `  — ${detail}` : ""}`);
}

console.log("\n✅ CE QUI DOIT PASSER");
for (const o of [
  "https://nexus-espace.netlify.app",
  "tauri://localhost",                 // l'application (macOS)
  "http://tauri.localhost",            // l'application (Windows)
  "http://localhost:4199",             // le développement
  "http://127.0.0.1:8765",             // l'application macOS, serveur local
  "https://deploy-preview-12--nexus-espace.netlify.app",
]) {
  verifier(o, origineAcceptee(o) === o);
}

console.log("\n🚫 CE QUI DOIT ÊTRE REFUSÉ");
for (const o of [
  "https://siteinconnu.fr",
  "https://nexus-espace.netlify.app.pirate.fr",   // le nom du site AU DÉBUT d'un autre
  "https://evil-nexus-espace.netlify.app",        // sans le double tiret
  "http://localhost.pirate.fr",
  "https://nexus-espace.netlify.app/",            // avec une barre : ce n'est pas une origine
  "null",
  "",
]) {
  verifier(`« ${o} »`, origineAcceptee(o) === null, String(origineAcceptee(o)));
}

console.log("\n📭 SANS ORIGINE (ce n'est pas un navigateur)");
verifier("pas d'en-tête Origin", origineAcceptee(undefined) === null);
verifier("Origin vide", origineAcceptee(null) === null);

console.log(`\n${reussis}/${total} vérifications passées.`);
process.exit(reussis === total ? 0 : 1);

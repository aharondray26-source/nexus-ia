// ============================================================================
//  OÙ NEXUS CHERCHE SON SERVEUR
//
//  Trois situations, et il faut que les trois marchent :
//    · sur le site → le serveur est juste à côté ;
//    · dans l'application → il n'y a rien à côté, il faut aller sur le site ;
//    · sur un hébergement sans serveur → pareil.
//
//  LE PIÈGE, trouvé en essayant pour de vrai : un site d'une seule page rend
//  sa PAGE D'ACCUEIL pour toute adresse inconnue, avec un 200. Sans vérifier
//  que c'est bien du JSON, Nexus croit avoir trouvé son serveur et reçoit du
//  HTML. Aucune erreur, juste des réponses absurdes.
//
//  À lancer : npx tsx outils/adresse-api.mts
// ============================================================================

import { appelerApi, ouEstLeServeur, oublierLeServeur, SITE_PUBLIC } from "../src/lib/adresseApi";

let reussis = 0, total = 0;
function verifier(quoi: string, ok: boolean, detail = "") {
  total++;
  if (ok) reussis++;
  console.log(`  ${ok ? "✅" : "❌"} ${quoi}${detail ? `  — ${detail}` : ""}`);
}

const vrai = globalThis.fetch;
type Faux = (adresse: string) => { status: number; type: string; corps?: string };

function faireSemblant(repondre: Faux) {
  (globalThis as { fetch: unknown }).fetch = async (entree: unknown) => {
    const adresse = String(entree);
    const r = repondre(adresse);
    if (r.status === 0) throw new TypeError("Failed to fetch");
    return new Response(r.corps ?? "{}", {
      status: r.status,
      headers: { "content-type": r.type },
    });
  };
}

console.log("\n🌐 SUR LE SITE — le serveur est à côté");
oublierLeServeur();
faireSemblant((a) => a.startsWith("/api")
  ? { status: 200, type: "application/json", corps: '{"ok":true}' }
  : { status: 0, type: "" });
{
  const r = await appelerApi("/api/health");
  verifier("il répond", r.status === 200);
  verifier("Nexus retient « à côté »", ouEstLeServeur() === "a-cote", String(ouEstLeServeur()));
}

console.log("\n💻 DANS L'APPLICATION — rien à côté, il faut aller sur le site");
oublierLeServeur();
{
  const vues: string[] = [];
  faireSemblant((a) => {
    vues.push(a);
    if (a.startsWith(SITE_PUBLIC)) return { status: 200, type: "application/json", corps: '{"ok":true}' };
    return { status: 404, type: "text/plain" };   // il n'y a pas de serveur ici
  });
  const r = await appelerApi("/api/health");
  verifier("il finit par répondre", r.status === 200);
  verifier("Nexus retient « le site »", ouEstLeServeur() === "loin", String(ouEstLeServeur()));
  verifier("il a bien essayé à côté d'abord", vues[0] === "/api/health", vues.join(" puis "));
  verifier("puis le vrai site", (vues[1] || "").startsWith(SITE_PUBLIC));
}

console.log("\n🪤 LE PIÈGE : une page d'accueil renvoyée avec un 200");
oublierLeServeur();
{
  faireSemblant((a) => a.startsWith(SITE_PUBLIC)
    ? { status: 200, type: "application/json", corps: '{"ok":true}' }
    // à côté : un 200… mais du HTML. C'est la page d'accueil, pas le serveur.
    : { status: 200, type: "text/html", corps: "<!DOCTYPE html><html>…" });
  const r = await appelerApi("/api/health");
  verifier("Nexus ne se laisse pas avoir", ouEstLeServeur() === "loin", String(ouEstLeServeur()));
  verifier("et il obtient du vrai JSON",
           (r.headers.get("content-type") || "").includes("json"));
}

console.log("\n🚫 QUAND IL N'Y A VRAIMENT RIEN");
oublierLeServeur();
{
  faireSemblant(() => ({ status: 0, type: "" }));
  let leve = false;
  try { await appelerApi("/api/health"); } catch { leve = true; }
  verifier("il le dit au lieu de faire semblant", leve);
  verifier("et il ne retient rien de faux", ouEstLeServeur() === null, String(ouEstLeServeur()));
}

console.log("\n⚡ IL NE REFAIT PAS LE CHEMIN DEUX FOIS");
oublierLeServeur();
{
  let appels = 0;
  faireSemblant((a) => {
    appels++;
    return a.startsWith(SITE_PUBLIC)
      ? { status: 200, type: "application/json", corps: "{}" }
      : { status: 404, type: "text/plain" };
  });
  await appelerApi("/api/health");
  const apresLePremier = appels;
  await appelerApi("/api/health");
  await appelerApi("/api/health");
  verifier("deux essais la première fois, un seul ensuite",
           apresLePremier === 2 && appels === 4, `${apresLePremier} puis ${appels} en tout`);
}

(globalThis as { fetch: unknown }).fetch = vrai;
console.log(`\n${reussis}/${total} vérifications passées.`);
process.exit(reussis === total ? 0 : 1);

// ============================================================================
//  CE QUE LA MASCOTTE COMPREND SUR WINDOWS — MIS À L'ÉPREUVE
//
//  Un routeur d'intentions se casse toujours de la même façon : il attrape
//  trop. « c'est quoi VLC ? » devient une installation, « ouvre le document
//  que je t'ai envoyé » lance une application qui n'existe pas. Ce n'est pas
//  visible en écrivant le code — c'est visible à l'usage, et c'est là que ça
//  fait perdre confiance.
//
//  On liste donc les deux colonnes, et la seconde est la plus importante :
//  ce qui doit déclencher, et ce qui ne doit SURTOUT PAS déclencher.
//
//  À lancer : npx tsx outils/intentions.mts
// ============================================================================

import { comprendrePC, consigneAutomatisation } from "../src/lib/intentionsPC";

let reussis = 0, total = 0;
function verifier(quoi: string, ok: boolean, detail = "") {
  total++;
  if (ok) reussis++;
  console.log(`  ${ok ? "✅" : "❌"} ${quoi}${detail ? `  — ${detail}` : ""}`);
}

console.log("\n🎯 CE QUI DOIT DÉCLENCHER");
const doit: [string, string, string?][] = [
  ["ouvre Word", "ouvrir_application", "Word"],
  ["lance Firefox", "ouvrir_application", "Firefox"],
  ["ouvre-moi le logiciel Discord s'il te plaît", "ouvrir_application", "Discord"],
  ["démarre Excel", "ouvrir_application", "Excel"],
  ["installe VLC", "installer_logiciel", "VLC"],
  ["installe-moi le logiciel Notion", "installer_logiciel", "Notion"],
  ["télécharge Spotify", "installer_logiciel", "Spotify"],
  ["trouve mon devoir de maths", "chercher_fichier", "devoir de maths"],
  ["retrouve le fichier exposé volcans", "chercher_fichier", "exposé volcans"],
  ["cherche dans mes documents la photosynthèse", "chercher_contenu", "photosynthèse"],
  ["trouve le document qui parle de la Révolution", "chercher_contenu", "Révolution"],
  ["mode concentration 25 minutes", "concentration"],
  ["je veux me concentrer une heure", "concentration"],
  ["travailler 90 minutes", "concentration"],
  ["fais une automatisation qui range mon bureau", "automatisation", "range mon bureau"],
  ["crée un script pour sauvegarder mes cours", "automatisation", "sauvegarder mes cours"],
  // LE PIÈGE DES ACCENTS : « écris » n'a pas de limite de mot devant lui pour
  // JavaScript. Sans nos propres délimiteurs, cette phrase n'est pas reconnue.
  ["écris-moi une automatisation qui vide la corbeille", "automatisation", "vide la corbeille"],
];
for (const [phrase, quoi, dedans] of doit) {
  const r = comprendrePC(phrase);
  const bon = !!r && r.quoi === quoi
    && (!dedans || JSON.stringify(r).toLowerCase().includes(dedans.toLowerCase()));
  verifier(`« ${phrase} »`, bon, r ? `${r.quoi} · ${JSON.stringify(r)}` : "PAS RECONNU");
}

console.log("\n🚫 CE QUI NE DOIT SURTOUT PAS DÉCLENCHER");
const doitPas = [
  "c'est quoi VLC ?",
  "comment on installe un logiciel sur Windows ?",
  "pourquoi Word ne s'ouvre pas ?",
  "explique-moi ce qu'est une automatisation",
  "qu'est-ce que le mode concentration ?",
  "combien de temps faut-il pour installer Windows",
  "merci",
  "salut",
  "quel est le meilleur navigateur",
  "peux-tu m'expliquer comment lancer un script",
  // Une phrase entière derrière « ouvre » n'est pas un nom d'application.
  "ouvre le document que je t'ai envoyé",
  "ouvre ce que je viens de te donner",
  "lance la recherche sur ce que je t'ai dit hier",
  "trouve pourquoi mon ordinateur rame depuis ce matin quand je lance un jeu",
];
for (const phrase of doitPas) {
  const r = comprendrePC(phrase);
  verifier(`« ${phrase} »`, r === null, r ? `déclenché à tort → ${r.quoi}` : "");
}

console.log("\n⏱️  LA DURÉE EST BIEN LUE");
const durees: [string, number][] = [
  ["mode concentration 25 minutes", 25],
  ["concentration 2 heures", 120],
  ["je veux me concentrer 90 min", 90],
  ["mode concentration", 45],           // sans durée : la valeur par défaut
  ["concentration 900 minutes", 480],   // borné à huit heures
];
for (const [phrase, attendu] of durees) {
  const r = comprendrePC(phrase);
  verifier(`« ${phrase} » → ${attendu} min`,
           !!r && r.quoi === "concentration" && r.minutes === attendu,
           r && r.quoi === "concentration" ? `${r.minutes} min` : "PAS RECONNU");
}

console.log("\n📜 LA CONSIGNE D'AUTOMATISATION PRÉVIENT LE MODÈLE");
const c = consigneAutomatisation("ranger le bureau");
for (const interdit of ["Remove-Item -Recurse", "antivirus", "bcdedit",
                        "Invoke-WebRequest", "administrateur"]) {
  verifier(`elle interdit « ${interdit} »`, c.includes(interdit));
}
verifier("elle demande du code SEUL", c.includes("UNIQUEMENT le code"));
verifier("elle demande des commentaires en français", c.includes("commentaire en français"));

console.log(`\n${reussis}/${total} vérifications passées.`);
process.exit(reussis === total ? 0 : 1);

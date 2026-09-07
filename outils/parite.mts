// ============================================================================
//  LE BANC DE LA PARITÉ
//
//  Aharon : « il faut qu'il n'y ait AUCUNE capacité que la mascotte de notre
//  site ait tandis que la mascotte de l'application macOS ne l'a pas. »
//
//  Ce banc échoue si :
//    · une capacité existe côté site et pas côté Mac ;
//    · une capacité n'existe que d'un côté sans qu'on dise POURQUOI ;
//    · une case cochée dans le catalogue ne correspond à RIEN dans le code —
//      c'est le point important : sans ça, le tableau finirait par décrire un
//      Nexus qui n'existe plus.
//
//  Il vérifie aussi que la mascotte du site ne fabrique pas un document quand
//  on lui pose une question — le genre de faux positif qui fait dire « elle
//  fait n'importe quoi ».
//
//  À lancer : npx tsx outils/parite.mts
// ============================================================================

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import {
  CAPACITES, manquantAuMac, manquantAuSite, manquantAWindows, propreAWindows,
  communes, comprendreDocument, type Surface,
} from "../src/lib/capacites";

const RACINE: Record<Surface, string> = {
  site: resolve(import.meta.dirname, ".."),
  mac: resolve(import.meta.dirname, "../../nexus-mac"),
  // L'application Windows vit DANS le dépôt du site : c'est ce qui permet à
  // GitHub de fabriquer l'installateur tout seul, avec le site déjà construit.
  win: resolve(import.meta.dirname, ".."),
};

let reussis = 0, total = 0;
function verifier(quoi: string, ok: boolean, detail = "") {
  total++;
  if (ok) reussis++;
  console.log(`  ${ok ? "✅" : "❌"} ${quoi}${detail ? `  — ${detail}` : ""}`);
}

const cache = new Map<string, string>();
function contenu(chemin: string): string | null {
  if (cache.has(chemin)) return cache.get(chemin)!;
  if (!existsSync(chemin)) return null;
  const t = readFileSync(chemin, "utf8");
  cache.set(chemin, t);
  return t;
}

console.log("\n⚖️  LA PARITÉ DES DEUX MASCOTTES");
{
  const trous = manquantAuMac();
  verifier("aucune capacité du site ne manque au Mac", trous.length === 0,
           trous.map((c) => c.nom).join(", ") || "aucune");
  // « Fais l'application Windows complète, elle doit être LARGEMENT MEILLEURE
  //   au niveau des fonctions. » Ce n'est mesurable que comme ceci.
  const trousWin = manquantAWindows();
  verifier("aucune capacité du site ni du Mac ne manque à Windows",
           trousWin.length === 0, trousWin.map((c) => c.nom).join(", ") || "aucune");
  const plus = propreAWindows();
  verifier("Windows en a en plus, et pas qu'une",
           plus.length >= 5, `${plus.length} : ${plus.map((c) => c.nom).join(", ")}`);

  const autres = manquantAuSite();
  console.log(`     (${communes().length} capacités communes site+Mac, `
            + `${autres.length} propres au Mac, ${plus.length} propres à Windows, `
            + `${CAPACITES.length} en tout)`);
  for (const c of [...autres, ...plus]) {
    verifier(`« ${c.nom} » n'existe pas partout, et on dit pourquoi`,
             !!c.pourquoiPas && c.pourquoiPas.length > 25, c.pourquoiPas ?? "AUCUNE RAISON DONNÉE");
  }
}

console.log("\n🔍 CHAQUE CASE COCHÉE CORRESPOND-ELLE À DU VRAI CODE ?");
for (const c of CAPACITES) {
  for (const surface of c.ou) {
    const preuves = c.preuve[surface];
    if (!preuves || preuves.length === 0) {
      verifier(`${c.id} · ${surface}`, false, "aucune preuve déclarée");
      continue;
    }
    const manque: string[] = [];
    for (const [fichier, motif] of preuves) {
      const t = contenu(resolve(RACINE[surface], fichier));
      if (t === null) manque.push(`${fichier} introuvable`);
      else if (!t.includes(motif)) manque.push(`« ${motif} » absent de ${fichier}`);
    }
    verifier(`${c.id} · ${surface}`, manque.length === 0, manque.join(" ; "));
  }
}

console.log("\n📄 « FAIS-MOI UN DOCUMENT » — ce qui doit déclencher");
// Le TITRE compte autant que le format : c'est le nom du fichier qu'Aharon
// va retrouver dans ses téléchargements.
const doit: [string, string, string][] = [
  ["fais-moi un document sur la Révolution française", "pdf", "Révolution française"],
  ["écris-moi une lettre de motivation en PDF", "pdf", "lettre de motivation"],
  ["crée un exposé sur les volcans en Word", "docx", "volcans"],
  ["rédige un rapport sur le climat", "pdf", "climat"],
  ["génère une fiche de révision sur les dérivées", "pdf", "dérivées"],
  ["fais-moi un CV en docx", "docx", "CV"],
  ["prépare un compte rendu de la réunion en page web", "html", "réunion"],
];
for (const [phrase, format, dedans] of doit) {
  const d = comprendreDocument(phrase);
  verifier(`« ${phrase} »`, !!d && d.format === format
           && (!dedans || d.sujet.toLowerCase().includes(dedans.toLowerCase())),
           d ? `${d.format} · titre « ${d.titre} »` : "PAS RECONNU");
}

console.log("\n🚫 … et ce qui ne doit SURTOUT pas déclencher");
const doitPas = [
  "c'est quoi un PDF ?",
  "comment on convertit un Word en PDF ?",
  "résume ce document",
  "ouvre le document que je t'ai envoyé",
  "crée-moi une application minuteur",
  "fabrique un raccourci pour ranger mon bureau",
  "explique-moi les dérivées",
  "quelle heure est-il",
  "le PDF que tu m'as fait est très bien",
];
for (const phrase of doitPas) {
  const d = comprendreDocument(phrase);
  verifier(`« ${phrase} »`, d === null, d ? `déclenché à tort → ${d.format}` : "");
}

console.log(`\n${reussis}/${total} vérifications passées.`);
process.exit(reussis === total ? 0 : 1);

#!/usr/bin/env node
// Le banc du calcul CERTAIN de Nexus.
//
// Un modèle qui tourne dans un navigateur se trompe en calcul, et il se trompe
// avec aplomb : je l'ai vu répondre « x = -5 » à « 3x + 7 = 22 » en six étapes
// bien présentées. Aharon est en première ; une réponse fausse qui a l'air
// sûre est pire que pas de réponse — il la recopie.
//
// Chaque ligne ci-dessous est un cas qui a VRAIMENT été faux un jour, ou qui
// doit rester hors de portée. « null » veut dire : Nexus doit se taire et
// laisser le modèle parler, plutôt que d'affirmer.
const fs = require("fs");
const path = require("path");
const src = fs.readFileSync(
  path.join(__dirname, "..", "public", "ext", "maths.js"), "utf8");
const NexusMaths = eval(src + "; NexusMaths");

const CAS = [
  ["3x + 7 = 22", "x = 5"],
  ["2x - 5 = 11", "x = 8"],
  ["5 - x = 2", "x = 3"],
  ["7 = 2x + 1", "x = 3"],
  ["-3x+9=0", "x = 3"],
  ["x/2 + 3 = 7", "x = 8"],
  ["1,5x = 4,5", "x = 3"],
  ["4(x+1) = 20", "x = 4"],
  ["2(3x-1)+4 = 18", "x = 8/3"],
  ["12 * 8 + 4", "= 100"],
  ["2x + 1 = 2x + 1", "vraie pour tout"],
  ["2x = 2x + 3", "pas de solution"],
  // Une équation noyée dans une phrase : le cas normal d'un cahier.
  ["Résoudre l’équation 3x + 7 = 22.", "x = 5"],
  // Celui-ci donnait « x = 1/3 » : « Exercice 4 » se recollait au « 5x ».
  ["Exercice 4 : résous 5x - 3 = 12 puis vérifie.", "x = 3"],
  // Ceux-là doivent rester SANS réponse : mieux vaut se taire que se tromper.
  ["x² + 1 = 5", null],                      // le « ² » effacé donnait x = 4
  ["Bonne nuit · jeudi 3 septembre", null],  // donnait « 3 = 3 »
  ["Calcule 15% de 80", null],               // donnait « 15 80 = 1580 »
  ["a = 2 et b = 3", null],
  ["", null],
  ["Le cours de mathématiques", null],
];

let faux = 0;
for (const [entree, attendu] of CAS) {
  const r = NexusMaths.resoudre(entree);
  const t = r ? r.texte : null;
  const ok = attendu === null ? t === null : (t && t.includes(attendu));
  if (!ok) faux++;
  console.log((ok ? "  ✓ " : "  ✗ ") + JSON.stringify(entree).padEnd(50)
    + " → " + (t || "(Nexus se tait)"));
}
console.log(faux === 0
  ? "  → le calcul certain est juste sur " + CAS.length + " cas"
  : "  → " + faux + " cas FAUX");
process.exit(faux === 0 ? 0 : 1);

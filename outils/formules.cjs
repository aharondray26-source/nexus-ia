#!/usr/bin/env node
// Le banc des FORMULES — et de la copie.
//
// Le nettoyage LaTeX existe en DEUX exemplaires : « src/lib/formules.ts » pour
// le site, « public/ext/formules.js » pour l'extension, qui est livrée seule
// et ne peut rien importer du site. Deux copies, c'est une correction faite
// d'un côté qui manque de l'autre — sauf si quelque chose le dit. C'est ici.
const fs = require("fs");
const path = require("path");
const R = path.join(__dirname, "..");

const js = fs.readFileSync(path.join(R, "public", "ext", "formules.js"), "utf8");
const nettoyer = eval(js + "; nettoyerFormules");

const CAS = [
  ["Si \\( U_1 \\) et la raison \\( q \\), alors \\( U_1 \\times q^{(n-1)} \\)",
   "U₁ × q^((n-1))"],
  ["La somme vaut \\[ S_n = a \\frac{r^n - 1}{r - 1} \\]", "(r^n - 1)/(r - 1)"],
  ["On a $x^{2} + 1 = 0$ donc pas de solution", "x^(2)"],
  // Celui-ci a VRAIMENT été cassé : deux prix sur une ligne étaient pris pour
  // un délimiteur de formule, et les symboles disparaissaient.
  ["Le prix est de 12 $ et la remise de 3 $", "12 $ et la remise de 3 $"],
  ["Il faut 3 $ pour le bus", "3 $"],
  ["\\sqrt{16} = 4", "√(16)"],
  ["\\text{vitesse} = \\frac{d}{t}", "vitesse = (d)/(t)"],
  ["Rien à nettoyer ici.", "Rien à nettoyer ici."],
  ["", ""],
];

let faux = 0;
for (const [avant, attendu] of CAS) {
  const apres = nettoyer(avant);
  const ok = apres.includes(attendu);
  if (!ok) faux++;
  console.log(`  ${ok ? "✓" : "✗"} ${JSON.stringify(apres).slice(0, 78)}`
    + (ok ? "" : `\n      attendu : ${JSON.stringify(attendu)}`));
}

// LES DEUX COPIES DOIVENT SE RESSEMBLER. On compare ce qui compte : la liste
// des symboles et les règles. Si l'une dérive, on le dit ici plutôt que de le
// découvrir sur l'écran d'Aharon.
const ts = fs.readFileSync(path.join(R, "src", "lib", "formules.ts"), "utf8");
const regles = (t) => (t.match(/\.replace\(/g) || []).length;
const symboles = (t) => (t.match(/\[\/\\\\/g) || []).length;
if (regles(ts) !== regles(js) || symboles(ts) !== symboles(js)) {
  console.log(`  ✗ les deux copies ont DÉRIVÉ : site ${regles(ts)} règles / `
    + `${symboles(ts)} symboles, extension ${regles(js)} / ${symboles(js)}`);
  faux++;
} else {
  console.log(`  ✓ le site et l'extension ont le même nettoyage `
    + `(${regles(ts)} règles, ${symboles(ts)} symboles)`);
}

console.log(faux === 0 ? "  → les formules sont lisibles partout" : `  → ${faux} problème(s)`);
process.exit(faux === 0 ? 0 : 1);

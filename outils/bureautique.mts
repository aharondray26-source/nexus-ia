// ============================================================================
//  LE BANC DE LA BUREAUTIQUE DU SITE
//
//  Le jumeau de `nexus-mac/outils/bureau.sh`. Mêmes exigences : on ne se fie
//  pas à « ça n'a pas planté ». Chaque document est RELU — signature du
//  fichier, taille crédible, et le texte qu'on y retrouve vraiment.
//
//  À lancer : npx tsx outils/bureautique.mts
// ============================================================================

import { PDFDocument } from "pdf-lib";
import {
  lire, morceaux, nu, creer, versHtml, versTexte, texteDe, nomDeFichier,
  type Format,
} from "../src/lib/bureautique";

let reussis = 0, total = 0;
function verifier(quoi: string, ok: boolean, detail = "") {
  total++;
  if (ok) reussis++;
  console.log(`  ${ok ? "✅" : "❌"} ${quoi}${detail ? `  — ${detail}` : ""}`);
}

const markdown = `Ce document a été écrit par Nexus pour **vérifier** que la bureautique tient
debout. Il contient volontairement tout ce qui peut casser une mise en page.

## Un titre de deuxième niveau

Un paragraphe ordinaire, avec du *gras léger*, du **gras franc**, et du
\`code en ligne\` au milieu d'une phrase — trois choses qui se marchent dessus
si l'on applique les marqueurs dans le mauvais sens.

### Une liste à puces

- Premier point, court.
- Deuxième point, nettement plus long, pour forcer un retour à la ligne et
  vérifier que le retrait tient sur la deuxième ligne aussi.
- Troisième point avec du **gras** dedans.

### Une liste numérotée

1. Préparer le texte.
2. Le mettre en forme.
3. L'écrire dans le bon format.

> Une citation, en italique et en retrait, parce qu'un document sans respiration
> se lit mal.

---

### Un tableau

| Format | Ouvre avec | Écrit par |
|---|---|---|
| .docx | Word, Pages, Google Docs | la bibliothèque docx |
| .pdf | tout le monde | jsPDF |

### Du code

\`\`\`
let bonjour = "Nexus"
print(bonjour)
\`\`\`

Et un dernier paragraphe, pour finir proprement.`;

console.log("\n🧩 L'ANALYSE DU MARKDOWN");
{
  const b = lire(markdown);
  const compte = (s: string) => b.filter((x) => x.sorte === s).length;
  verifier("les titres sont vus", compte("titre") === 5, `${compte("titre")}`);
  verifier("les puces sont vues", compte("puce") === 3, `${compte("puce")}`);
  verifier("les numéros sont vus", compte("numero") === 3, `${compte("numero")}`);
  verifier("le filet est vu", compte("filet") === 1);
  verifier("le bloc de code est vu", compte("code") === 1);
  verifier("le tableau est vu", compte("tableau") === 1);
  // LE PIÈGE : une citation sur deux lignes doit faire UN bloc, pas deux.
  const cit = b.filter((x) => x.sorte === "citation");
  verifier("une citation de deux lignes reste UNE citation", cit.length === 1, `${cit.length} bloc(s)`);
  verifier("… et elle est entière",
           cit.length === 1 && (cit[0] as any).texte.includes("se lit mal"));
  const tab = b.find((x) => x.sorte === "tableau") as any;
  verifier("le tableau a ses 3 colonnes", tab?.entetes.length === 3);
  verifier("le tableau a ses 2 lignes", tab?.lignes.length === 2);
  const code = b.find((x) => x.sorte === "code") as any;
  verifier("le code garde ses lignes", code?.lignes.length === 2);
}

console.log("\n✒️  LE GRAS, L'ITALIQUE ET LE CODE");
{
  const m = morceaux("du *gras léger*, du **gras franc**, et du `code`.");
  verifier("le gras franc est reconnu", m.some((x) => x.gras && x.texte === "gras franc"));
  verifier("l'italique est reconnu", m.some((x) => x.italique && x.texte === "gras léger"));
  verifier("le code est reconnu", m.some((x) => x.code && x.texte === "code"));
  verifier("aucun marqueur ne reste dans le texte nu",
           !nu("**a** *b* `c`").includes("*") && !nu("**a** *b* `c`").includes("`"),
           nu("**a** *b* `c`"));
  // Le piège du décalage : trois marqueurs d'affilée doivent tous tomber juste.
  const t = morceaux("**un** puis **deux** puis **trois**").filter((x) => x.gras).map((x) => x.texte);
  verifier("trois gras d'affilée tombent juste", JSON.stringify(t) === '["un","deux","trois"]', t.join("|"));
}

console.log("\n📄 LES FICHIERS PRODUITS");
const formats: Format[] = ["pdf", "docx", "html", "txt", "md"];
const faits: Record<string, { blob: Blob; nom: string }> = {};
for (const f of formats) {
  const r = await creer("Banc Nexus", markdown, f);
  if ("erreur" in r) { verifier(`créer .${f}`, false, r.erreur); continue; }
  faits[f] = r;
  verifier(`créer .${f}`, r.blob.size > 300, `${r.blob.size} octets · ${r.nom}`);
}

console.log("\n🔎 SONT-CE VRAIMENT CES FORMATS ?");
async function debut(b: Blob, n: number) {
  return new TextDecoder().decode(new Uint8Array(await b.arrayBuffer()).slice(0, n));
}
if (faits.pdf)  verifier("le .pdf commence par %PDF", (await debut(faits.pdf.blob, 4)) === "%PDF");
if (faits.docx) verifier("le .docx est un ZIP (PK)", (await debut(faits.docx.blob, 2)) === "PK");
if (faits.html) verifier("le .html est du HTML", (await faits.html.blob.text()).toLowerCase().includes("<html"));

console.log("\n📖 LE PDF EST-IL COMPLET ?");
if (faits.pdf) {
  const doc = await PDFDocument.load(await faits.pdf.blob.arrayBuffer());
  verifier("le PDF a au moins une page", doc.getPageCount() >= 1, `${doc.getPageCount()} page(s)`);
  const p = doc.getPage(0);
  verifier("la page est bien en A4", Math.round(p.getWidth()) === 595 && Math.round(p.getHeight()) === 842,
           `${Math.round(p.getWidth())}×${Math.round(p.getHeight())}`);
}

console.log("\n📝 LE WORD CONTIENT-IL LE TEXTE ?");
if (faits.docx) {
  const t = await texteDe(faits.docx.blob, "x.docx");
  verifier("le titre est dans le .docx", t.includes("Banc Nexus"), "");
  verifier("le corps est dans le .docx", t.includes("bureautique tient"));
  verifier("la liste est dans le .docx", t.includes("Préparer le texte"));
  verifier("le tableau est dans le .docx", t.includes("Google Docs"));
  verifier("le code est dans le .docx", t.includes("let bonjour"));
  verifier("aucune étoile de Markdown ne traîne", !t.includes("**"));
}

console.log("\n🧾 LE HTML ET LE TEXTE");
{
  const h = versHtml("Banc Nexus", markdown);
  verifier("le HTML a un vrai tableau", h.includes("<table>") && h.includes("<th>"));
  verifier("le HTML a une citation", h.includes("<blockquote>"));
  verifier("le HTML a une liste numérotée", h.includes("<ol>"));
  verifier("le HTML échappe les chevrons", !versHtml("", "a < b & c").includes("a < b"));
  verifier("le HTML porte son style", h.includes("border-collapse"));
  const t = versTexte("Banc Nexus", markdown);
  verifier("le texte garde les puces", t.includes("• Premier point"));
  verifier("le texte aligne le tableau", /\.docx\s+Word, Pages/.test(t));
  verifier("le texte n'a plus de marqueur", !t.includes("**") && !t.includes("###"));
}

console.log("\n🏷️  LES NOMS DE FICHIERS");
verifier("un titre avec des accents est gardé", nomDeFichier("Exposé sur l'été", "pdf") === "Exposé sur l'été.pdf",
         nomDeFichier("Exposé sur l'été", "pdf"));
verifier("une barre oblique ne casse pas le chemin", !nomDeFichier("a/b", "pdf").includes("/"),
         nomDeFichier("a/b", "pdf"));
verifier("un titre vide a quand même un nom", nomDeFichier("   ", "docx") === "Document Nexus.docx",
         nomDeFichier("   ", "docx"));
verifier("un titre très long est coupé", nomDeFichier("x".repeat(200), "md").length <= 74);

console.log(`\n${reussis}/${total} vérifications passées.`);
process.exit(reussis === total ? 0 : 1);

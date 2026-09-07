// ============================================================================
//  LA BUREAUTIQUE DE NEXUS — CÔTÉ SITE
//
//  Aharon : « il faut qu'il n'y ait aucune capacité que la mascotte de notre
//  site ait tandis que la mascotte de l'application macOS ne l'a pas… et
//  essaie de rajouter toutes ces capacités au maximum dans celle du site, le
//  but est d'égaliser au maximum leurs capacités. »
//
//  Ce fichier est le JUMEAU de `nexus-mac/Sources/Bureautique.swift` : même
//  analyseur de Markdown, mêmes blocs, mêmes tailles de police, mêmes marges,
//  même pied de page. Un document demandé au site et le même document demandé
//  à l'application macOS doivent se ressembler — sinon ce ne sont pas deux
//  faces d'un même Nexus, ce sont deux produits.
//
//  Ce que le site sait faire, sans serveur et sans rien installer :
//    · un PDF paginé (jsPDF)
//    · un vrai fichier Word .docx (la bibliothèque « docx »)
//    · du .html, du .txt, du .md
//    · relire un PDF pour en ressortir le texte, et le reconvertir
//
//  Ce que macOS a en plus : .odt et .doc, écrits par `textutil`. Il n'existe
//  rien d'équivalent dans un navigateur ; c'est dit franchement à l'écran
//  plutôt que promis puis raté.
// ============================================================================

export type Format = "pdf" | "docx" | "html" | "txt" | "md";

export const FORMATS: { id: Format; nom: string; extension: string }[] = [
  { id: "pdf",  nom: "PDF",                 extension: "pdf" },
  { id: "docx", nom: "Word (.docx)",        extension: "docx" },
  { id: "html", nom: "Page web (.html)",    extension: "html" },
  { id: "txt",  nom: "Texte brut (.txt)",   extension: "txt" },
  { id: "md",   nom: "Markdown (.md)",      extension: "md" },
];

/// Reconnaître un format dans une phrase, comme le fait la version macOS.
export function formatDepuis(mot: string): Format | null {
  const n = (mot || "").toLowerCase().trim().replace(/^\./, "");
  if (["pdf"].includes(n)) return "pdf";
  if (["docx", "word", "doc", "document word"].includes(n)) return "docx";
  if (["html", "web", "page web"].includes(n)) return "html";
  if (["txt", "texte", "texte brut"].includes(n)) return "txt";
  if (["md", "markdown"].includes(n)) return "md";
  return null;
}

// =========================================================== LIRE LE MARKDOWN

export type Bloc =
  | { sorte: "titre"; niveau: number; texte: string }
  | { sorte: "paragraphe"; texte: string }
  | { sorte: "puce"; texte: string }
  | { sorte: "numero"; n: number; texte: string }
  | { sorte: "citation"; texte: string }
  | { sorte: "filet" }
  | { sorte: "code"; lignes: string[] }
  | { sorte: "tableau"; entetes: string[]; lignes: string[][] };

export function lire(markdown: string): Bloc[] {
  const blocs: Bloc[] = [];
  const lignes = (markdown || "").replace(/\r\n/g, "\n").split("\n");
  let i = 0;
  let paragraphe: string[] = [];

  const viderParagraphe = () => {
    const t = paragraphe.join(" ").trim();
    if (t) blocs.push({ sorte: "paragraphe", texte: t });
    paragraphe = [];
  };
  const cellules = (s: string) =>
    s.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());

  while (i < lignes.length) {
    const l = lignes[i].trim();

    // Un bloc de code : pris tel quel, rien n'y est interprété.
    if (l.startsWith("```")) {
      viderParagraphe();
      const dedans: string[] = [];
      i++;
      while (i < lignes.length && !lignes[i].trim().startsWith("```")) { dedans.push(lignes[i]); i++; }
      blocs.push({ sorte: "code", lignes: dedans });
      i++;
      continue;
    }

    // Un tableau : une ligne de « | », puis une ligne de tirets.
    if (l.startsWith("|") && i + 1 < lignes.length
        && lignes[i + 1].trim().startsWith("|") && lignes[i + 1].includes("-")) {
      viderParagraphe();
      const entetes = cellules(l);
      i += 2;
      const corps: string[][] = [];
      while (i < lignes.length && lignes[i].trim().startsWith("|")) { corps.push(cellules(lignes[i])); i++; }
      blocs.push({ sorte: "tableau", entetes, lignes: corps });
      continue;
    }

    if (!l) { viderParagraphe(); i++; continue; }

    if (l.startsWith("###")) { viderParagraphe(); blocs.push({ sorte: "titre", niveau: 3, texte: l.slice(3).trim() }); i++; continue; }
    if (l.startsWith("##"))  { viderParagraphe(); blocs.push({ sorte: "titre", niveau: 2, texte: l.slice(2).trim() }); i++; continue; }
    if (l.startsWith("#"))   { viderParagraphe(); blocs.push({ sorte: "titre", niveau: 1, texte: l.slice(1).trim() }); i++; continue; }
    if (l === "---" || l === "***" || l === "___") { viderParagraphe(); blocs.push({ sorte: "filet" }); i++; continue; }

    // Une citation écrite sur plusieurs lignes est UNE citation — sinon elle
    // se coupe en deux au milieu d'une phrase, avec un trou dedans.
    if (l.startsWith(">")) {
      viderParagraphe();
      const morceaux: string[] = [];
      while (i < lignes.length && lignes[i].trim().startsWith(">")) {
        morceaux.push(lignes[i].trim().slice(1).trim());
        i++;
      }
      blocs.push({ sorte: "citation", texte: morceaux.join(" ") });
      continue;
    }

    if (/^[-*•]\s+/.test(l)) { viderParagraphe(); blocs.push({ sorte: "puce", texte: l.replace(/^[-*•]\s+/, "") }); i++; continue; }
    const num = l.match(/^(\d+)[.)]\s+(.*)$/);
    if (num) { viderParagraphe(); blocs.push({ sorte: "numero", n: Number(num[1]), texte: num[2] }); i++; continue; }

    paragraphe.push(l);
    i++;
  }
  viderParagraphe();
  return blocs;
}

/// Les marqueurs de Markdown DANS une ligne, découpés en morceaux stylés.
/// On ne remplace pas dans la chaîne : on la découpe. Remplacer décale les
/// positions suivantes, et le gras finit sur les mauvais mots.
export type Morceau = { texte: string; gras?: boolean; italique?: boolean; code?: boolean };

export function morceaux(ligne: string): Morceau[] {
  const out: Morceau[] = [];
  const re = /\*\*([^*]+)\*\*|(?<!\*)\*([^*\n]+)\*(?!\*)|`([^`\n]+)`/g;
  let dernier = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(ligne))) {
    if (m.index > dernier) out.push({ texte: ligne.slice(dernier, m.index) });
    if (m[1] !== undefined) out.push({ texte: m[1], gras: true });
    else if (m[2] !== undefined) out.push({ texte: m[2], italique: true });
    else out.push({ texte: m[3], code: true });
    dernier = m.index + m[0].length;
  }
  if (dernier < ligne.length) out.push({ texte: ligne.slice(dernier) });
  return out.length ? out : [{ texte: ligne }];
}

/// Le texte sans ses marqueurs — pour le .txt et pour les mesures.
export function nu(ligne: string): string {
  return morceaux(ligne).map((m) => m.texte).join("");
}

// ================================================================ LE HTML

const echapper = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function enrichirHTML(s: string): string {
  return morceaux(s).map((m) => {
    const t = echapper(m.texte);
    if (m.gras) return `<strong>${t}</strong>`;
    if (m.italique) return `<em>${t}</em>`;
    if (m.code) return `<code>${t}</code>`;
    return t;
  }).join("");
}

export function versHtml(titre: string, markdown: string): string {
  let corps = "";
  let liste: string | null = null;
  const fermer = () => { if (liste) { corps += `</${liste}>\n`; liste = null; } };
  const ouvrir = (l: string) => { if (liste !== l) { fermer(); corps += `<${l}>\n`; liste = l; } };

  for (const b of lire(markdown)) {
    switch (b.sorte) {
      case "titre":      fermer(); { const n = Math.min(b.niveau + 1, 4); corps += `<h${n}>${enrichirHTML(b.texte)}</h${n}>\n`; } break;
      case "paragraphe": fermer(); corps += `<p>${enrichirHTML(b.texte)}</p>\n`; break;
      case "puce":       ouvrir("ul"); corps += `<li>${enrichirHTML(b.texte)}</li>\n`; break;
      case "numero":     ouvrir("ol"); corps += `<li>${enrichirHTML(b.texte)}</li>\n`; break;
      case "citation":   fermer(); corps += `<blockquote>${enrichirHTML(b.texte)}</blockquote>\n`; break;
      case "filet":      fermer(); corps += "<hr/>\n"; break;
      case "code":       fermer(); corps += `<pre><code>${echapper(b.lignes.join("\n"))}</code></pre>\n`; break;
      case "tableau":
        fermer();
        corps += "<table><thead><tr>" + b.entetes.map((e) => `<th>${enrichirHTML(e)}</th>`).join("") + "</tr></thead><tbody>";
        corps += b.lignes.map((l) => "<tr>" + l.map((c) => `<td>${enrichirHTML(c)}</td>`).join("") + "</tr>").join("");
        corps += "</tbody></table>\n";
        break;
    }
  }
  fermer();

  const date = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const entete = titre ? `<h1>${echapper(titre)}</h1>\n<p class="date">${date}</p>\n` : "";

  // Le style est écrit EN DUR : un fichier envoyé à quelqu'un d'autre ne peut
  // pas compter sur une feuille de style restée sur notre serveur.
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><title>${echapper(titre)}</title>
<style>
  body { font-family: -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif;
         font-size: 11.5pt; color: #1c1c1e; line-height: 1.5; margin: 2.2cm; }
  h1 { font-size: 26pt; font-weight: 700; margin: 0 0 4pt; letter-spacing: -0.4pt; }
  h2 { font-size: 19pt; font-weight: 700; margin: 22pt 0 6pt; }
  h3 { font-size: 15.5pt; font-weight: 600; margin: 16pt 0 5pt; color: #4c52dc; }
  h4 { font-size: 13pt; font-weight: 600; margin: 14pt 0 4pt; color: #4c52dc; }
  p  { margin: 0 0 9pt; }
  p.date { color: #5c5c66; font-size: 10pt; margin-bottom: 18pt; }
  ul, ol { margin: 0 0 10pt 18pt; padding: 0; }
  li { margin: 0 0 4pt; }
  blockquote { margin: 8pt 0 10pt 16pt; padding-left: 12pt;
               border-left: 2.5pt solid #c9cbf5; color: #5c5c66; font-style: italic; }
  hr { border: none; border-top: 1pt solid #dcdce2; margin: 14pt 0; }
  pre { background: #f4f4f7; padding: 9pt 11pt; border-radius: 5pt; overflow-x: auto; }
  code { font-family: "SF Mono", Menlo, Consolas, monospace; font-size: 10.5pt; color: #4c52dc; }
  pre code { color: #1c1c1e; }
  table { border-collapse: collapse; margin: 10pt 0 14pt; width: 100%; }
  th, td { border: 0.75pt solid #d4d4dc; padding: 5pt 8pt; text-align: left; font-size: 10.5pt; }
  th { background: #f1f1f6; font-weight: 600; }
</style></head><body>
${entete}${corps}</body></html>`;
}

// ================================================================= LE TEXTE

export function versTexte(titre: string, markdown: string): string {
  const out: string[] = [];
  if (titre) { out.push(titre.toUpperCase(), "=".repeat(Math.min(titre.length, 70)), ""); }
  for (const b of lire(markdown)) {
    switch (b.sorte) {
      case "titre":      out.push("", nu(b.texte).toUpperCase(), ""); break;
      case "paragraphe": out.push(nu(b.texte), ""); break;
      case "puce":       out.push("  • " + nu(b.texte)); break;
      case "numero":     out.push(`  ${b.n}. ` + nu(b.texte)); break;
      case "citation":   out.push("  « " + nu(b.texte) + " »", ""); break;
      case "filet":      out.push("", "─".repeat(60), ""); break;
      case "code":       out.push(...b.lignes.map((l) => "    " + l), ""); break;
      case "tableau": {
        const toutes = [b.entetes, ...b.lignes];
        const larg = b.entetes.map((_, j) => Math.max(...toutes.map((r) => (r[j] || "").length)));
        for (const r of toutes) out.push("  " + r.map((c, j) => c.padEnd(larg[j] || 0)).join("   "));
        out.push("");
        break;
      }
    }
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

// =================================================================== LE PDF
//
//  Les mêmes chiffres que la version macOS : A4, marge de 56 points, corps à
//  11,5, titre à 26, pied de page avec le titre courant et le numéro.

const A4 = { l: 595.28, h: 841.89 };
const MARGE = 56;
const ENCRE: [number, number, number] = [28, 28, 30];
const DOUCE: [number, number, number] = [92, 92, 102];
const ACCENT: [number, number, number] = [76, 82, 220];

export async function versPdf(titre: string, markdown: string): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
  const large = A4.l - MARGE * 2;
  let y = MARGE + 18;
  let page = 1;

  const piedDePage = () => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(140, 140, 148);
    doc.text(`${titre || "Nexus"}     ·     page ${page}`, MARGE, A4.h - MARGE + 14);
  };
  const nouvellePage = () => {
    piedDePage();
    doc.addPage();
    page++;
    y = MARGE + 18;
  };
  /// Descendre de `h`, en changeant de page s'il n'y a plus la place. Sans
  /// cette vérification AVANT d'écrire, la dernière ligne d'une page part
  /// dans la marge et disparaît — sans erreur, sans rien.
  const place = (h: number) => { if (y + h > A4.h - MARGE - 8) nouvellePage(); };

  /// Écrire une ligne enrichie, morceau par morceau, en repliant à la marge.
  const ecrire = (
    ligne: string,
    taille: number,
    style: "normal" | "bold" | "italic",
    couleur: [number, number, number],
    retrait = 0,
    interligne = 1.35,
  ) => {
    const dispo = large - retrait;
    let x = MARGE + retrait;
    const hauteur = taille * interligne;
    place(hauteur);
    for (const m of morceaux(ligne)) {
      const police = m.code ? "courier" : "helvetica";
      const gras = m.gras ? "bold" : m.italique ? "italic" : style;
      doc.setFont(police, m.code ? "normal" : gras);
      doc.setFontSize(m.code ? taille * 0.94 : taille);
      doc.setTextColor(...(m.code ? ACCENT : couleur));
      // On coupe aux espaces : un mot ne doit jamais sortir de la page.
      //
      // ATTENTION — chaque morceau garde SON espace de fin. jsPDF supprime les
      // blancs qu'on lui donne seuls : dessiner « " " » n'écrit rien et
      // n'avance pas, et deux mots se collent (« Transformemon »). On mesure
      // donc « mot + espace » pour avancer, et l'on ne dessine que le mot.
      const jetons = m.texte.match(/\S+\s*|\s+/g) || [];
      for (const jeton of jetons) {
        const mot = jeton.trimEnd();
        const w = doc.getTextWidth(jeton);
        if (!mot) { x += w; continue; }          // un blanc seul : on avance
        if (x + doc.getTextWidth(mot) > MARGE + retrait + dispo && x > MARGE + retrait) {
          y += hauteur;
          place(hauteur);
          x = MARGE + retrait;
        }
        doc.text(mot, x, y);
        x += w;
      }
    }
    y += hauteur;
  };

  if (titre) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(26);
    doc.setTextColor(...ENCRE);
    doc.text(titre, MARGE, y);
    y += 30;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...DOUCE);
    doc.text(new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
             MARGE, y);
    y += 26;
  }

  for (const b of lire(markdown)) {
    switch (b.sorte) {
      case "titre": {
        const tailles = [0, 19, 15.5, 13];
        const t = tailles[Math.min(b.niveau, 3)];
        y += b.niveau === 1 ? 14 : 11;
        ecrire(b.texte, t, "bold", b.niveau === 1 ? ENCRE : ACCENT, 0, 1.2);
        y += 3;
        break;
      }
      case "paragraphe": ecrire(b.texte, 11.5, "normal", ENCRE); y += 6; break;
      case "puce":       ecrire("•   " + b.texte, 11.5, "normal", ENCRE, 16, 1.3); y += 3; break;
      case "numero":     ecrire(`${b.n}.   ` + b.texte, 11.5, "normal", ENCRE, 16, 1.3); y += 3; break;
      case "citation": {
        y += 8;
        const depart = y;
        ecrire(b.texte, 11.5, "italic", DOUCE, 24, 1.35);
        doc.setDrawColor(201, 203, 245);
        doc.setLineWidth(2.5);
        doc.line(MARGE + 14, depart - 9, MARGE + 14, y - 8);
        y += 12;
        break;
      }
      case "filet":
        place(16);
        doc.setDrawColor(220, 220, 226);
        doc.setLineWidth(1);
        doc.line(MARGE, y, A4.l - MARGE, y);
        y += 16;
        break;
      case "code": {
        const h = b.lignes.length * 13 + 14;
        place(h);
        doc.setFillColor(244, 244, 247);
        doc.roundedRect(MARGE, y - 10, large, h, 4, 4, "F");
        doc.setFont("courier", "normal");
        doc.setFontSize(10.5);
        doc.setTextColor(...ENCRE);
        for (const l of b.lignes) { doc.text(l, MARGE + 10, y + 2); y += 13; }
        y += 16;
        break;
      }
      case "tableau": {
        const cols = b.entetes.length || 1;
        const w = large / cols;
        const hTexte = 13;
        doc.setFontSize(10.5);
        doc.setDrawColor(212, 212, 220);
        doc.setLineWidth(0.75);

        // LA HAUTEUR D'UNE LIGNE SE CALCULE, elle ne se décrète pas.
        // À 20 points fixes, une cellule un peu longue se repliait sur deux
        // lignes et la seconde passait PAR-DESSUS la ligne suivante — le
        // tableau devenait illisible sans qu'aucune erreur ne le signale.
        const replie = (cs: string[]) =>
          cs.map((c) => doc.splitTextToSize(nu(c), w - 12) as string[]);
        const hauteurDe = (parts: string[][]) =>
          Math.max(...parts.map((p) => p.length), 1) * hTexte + 8;

        const rangee = (cs: string[], tete: boolean) => {
          const parts = replie(cs);
          const h = hauteurDe(parts);
          place(h);
          if (tete) { doc.setFillColor(241, 241, 246); doc.rect(MARGE, y - 11, large, h, "FD"); }
          else doc.rect(MARGE, y - 11, large, h, "D");
          doc.setFont("helvetica", tete ? "bold" : "normal");
          doc.setTextColor(...ENCRE);
          parts.forEach((p, j) => p.forEach((ligne, k) =>
            doc.text(ligne, MARGE + j * w + 6, y + 2 + k * hTexte)));
          y += h;
        };

        rangee(b.entetes, true);
        for (const l of b.lignes) rangee(l, false);
        y += 14;
        break;
      }
    }
  }
  piedDePage();
  return doc.output("blob");
}

// ================================================================== LE WORD

export async function versDocx(titre: string, markdown: string): Promise<Blob> {
  const D = await import("docx");
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
          Table, TableRow, TableCell, WidthType, BorderStyle } = D;

  const runs = (ligne: string, options: { taille?: number; couleur?: string; italique?: boolean } = {}) =>
    morceaux(ligne).map((m) => new TextRun({
      text: m.texte,
      bold: m.gras,
      italics: m.italique || options.italique,
      font: m.code ? "Menlo" : undefined,
      color: m.code ? "4C52DC" : options.couleur,
      size: (options.taille ?? 23),          // demi-points : 23 = 11,5 pt
    }));

  const enfants: any[] = [];

  if (titre) {
    enfants.push(new Paragraph({
      children: [new TextRun({ text: titre, bold: true, size: 52 })],
      spacing: { after: 60 },
    }));
    enfants.push(new Paragraph({
      children: [new TextRun({
        text: new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
        color: "5C5C66", size: 20,
      })],
      spacing: { after: 320 },
    }));
  }

  for (const b of lire(markdown)) {
    switch (b.sorte) {
      case "titre":
        enfants.push(new Paragraph({
          children: runs(b.texte, {
            taille: b.niveau === 1 ? 38 : b.niveau === 2 ? 31 : 26,
            couleur: b.niveau === 1 ? "1C1C1E" : "4C52DC",
          }).map((r) => { (r as any).options && ((r as any).options.bold = true); return r; }),
          heading: b.niveau === 1 ? HeadingLevel.HEADING_1
                 : b.niveau === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
          spacing: { before: b.niveau === 1 ? 360 : 280, after: 110 },
        }));
        break;
      case "paragraphe":
        enfants.push(new Paragraph({ children: runs(b.texte), spacing: { after: 160 } }));
        break;
      case "puce":
        enfants.push(new Paragraph({ children: runs(b.texte), bullet: { level: 0 }, spacing: { after: 70 } }));
        break;
      case "numero":
        enfants.push(new Paragraph({ children: runs(`${b.n}.   ${b.texte}`), indent: { left: 360 }, spacing: { after: 70 } }));
        break;
      case "citation":
        enfants.push(new Paragraph({
          children: runs(b.texte, { couleur: "5C5C66", italique: true }),
          indent: { left: 440 },
          border: { left: { style: BorderStyle.SINGLE, size: 12, color: "C9CBF5", space: 8 } },
          spacing: { before: 120, after: 180 },
        }));
        break;
      case "filet":
        enfants.push(new Paragraph({
          text: "",
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "DCDCE2", space: 1 } },
          spacing: { before: 200, after: 200 },
        }));
        break;
      case "code":
        for (const l of b.lignes) {
          enfants.push(new Paragraph({
            children: [new TextRun({ text: l, font: "Menlo", size: 21 })],
            shading: { fill: "F4F4F7" },
            spacing: { after: 0 },
          }));
        }
        enfants.push(new Paragraph({ text: "", spacing: { after: 160 } }));
        break;
      case "tableau": {
        const cellule = (t: string, tete: boolean) => new TableCell({
          children: [new Paragraph({
            children: runs(t, { taille: 21 }).map((r) => { if (tete) (r as any).options && ((r as any).options.bold = true); return r; }),
          })],
          shading: tete ? { fill: "F1F1F6" } : undefined,
          width: { size: Math.floor(100 / Math.max(b.entetes.length, 1)), type: WidthType.PERCENTAGE },
        });
        enfants.push(new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ children: b.entetes.map((e) => cellule(e, true)), tableHeader: true }),
            ...b.lignes.map((l) => new TableRow({ children: l.map((c) => cellule(c, false)) })),
          ],
        }));
        enfants.push(new Paragraph({ text: "", spacing: { after: 200 } }));
        break;
      }
    }
  }

  const doc = new Document({
    creator: "Nexus",
    title: titre || "Document Nexus",
    styles: {
      default: {
        document: { run: { font: "Helvetica", size: 23, color: "1C1C1E" } },
      },
    },
    sections: [{
      properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
      children: enfants.length ? enfants : [new Paragraph({ text: "" })],
    }],
  });
  void AlignmentType;
  return await Packer.toBlob(doc);
}

// ================================================================= CRÉER

export type Resultat = { blob: Blob; nom: string } | { erreur: string };

/// Un nom de fichier sûr, qui garde les accents mais perd ce qui casse un
/// chemin — la même règle que côté macOS.
export function nomDeFichier(titre: string, f: Format): string {
  let base = (titre || "").trim().replace(/[/\\:*?"<>|\n\t]/g, " ").replace(/\s{2,}/g, " ");
  if (!base) base = "Document Nexus";
  if (base.length > 70) base = base.slice(0, 70).trim();
  return `${base}.${f}`;
}

export async function creer(titre: string, markdown: string, format: Format): Promise<Resultat> {
  try {
    const nom = nomDeFichier(titre, format);
    switch (format) {
      case "pdf":  return { blob: await versPdf(titre, markdown), nom };
      case "docx": return { blob: await versDocx(titre, markdown), nom };
      case "html": return { blob: new Blob([versHtml(titre, markdown)], { type: "text/html;charset=utf-8" }), nom };
      case "txt":  return { blob: new Blob([versTexte(titre, markdown)], { type: "text/plain;charset=utf-8" }), nom };
      case "md":   return { blob: new Blob([(titre ? `# ${titre}\n\n` : "") + markdown], { type: "text/markdown;charset=utf-8" }), nom };
    }
  } catch (e) {
    return { erreur: e instanceof Error ? e.message : String(e) };
  }
}

/// Poser le fichier dans les téléchargements. Un document qu'on ne peut pas
/// récupérer n'existe pas.
export function telecharger(blob: Blob, nom: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // On ne libère qu'après : révoquer tout de suite annule le téléchargement
  // dans certains navigateurs, sans le moindre message.
  setTimeout(() => URL.revokeObjectURL(url), 20000);
}

// ============================================================== CONVERTIR

/// Sortir le texte d'un fichier, quel qu'il soit. C'est ce qui permet de
/// convertir : on ramène tout à du texte, puis on réécrit dans le format visé.
export async function texteDe(fichier: File | Blob, nom: string): Promise<string> {
  const ext = (nom.split(".").pop() || "").toLowerCase();

  if (ext === "pdf") {
    const pdfjs: any = await import("pdfjs-dist");
    // Le « worker » de pdf.js est un second fichier. S'il manque, pdf.js
    // reste muet et la promesse ne se résout jamais : on le pose nous-mêmes.
    try {
      // Le « worker » de pdf.js est un second fichier. Vite sait le fournir
      // avec `?url` ; si l'assemblage change, on continue sans lui plutôt que
      // de laisser la promesse ne jamais se résoudre.
      const w: any = await import(
        /* @vite-ignore */ "pdfjs-dist/build/pdf.worker.min.mjs?url");
      pdfjs.GlobalWorkerOptions.workerSrc = w.default;
    } catch { /* pdf.js se débrouillera en mode dégradé */ }
    const buf = await fichier.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: buf }).promise;
    let out = "";
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const c = await page.getTextContent();
      out += c.items.map((i: any) => i.str).join(" ") + "\n\n";
    }
    return out.trim();
  }

  if (ext === "docx") {
    // Un .docx est un ZIP ; le texte est dans word/document.xml. On le lit
    // sans bibliothèque : c'est du XML, et l'on ne garde que les <w:t>.
    const { lireZip, enTexte } = await import("./zip");
    const octets = new Uint8Array(await fichier.arrayBuffer());
    const pieces = await lireZip(octets, (n) => n === "word/document.xml");
    const contenu = pieces["word/document.xml"];
    if (!contenu) throw new Error("Ce .docx ne contient pas de texte lisible.");
    const xml = enTexte(contenu);
    return xml
      .replace(/<w:p[ >]/g, "\n<w:p ")
      .replace(/<[^>]+>/g, (t) => (t.startsWith("<w:t") || t.startsWith("</w:t") ? "" : " "))
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  return (await fichier.text()).trim();
}

export async function convertir(fichier: File, vers: Format): Promise<Resultat> {
  try {
    const titre = fichier.name.replace(/\.[^.]+$/, "");
    const texte = await texteDe(fichier, fichier.name);
    if (!texte) {
      return { erreur: "Ce fichier ne contient pas de texte à convertir — "
                     + "s'il s'agit d'un PDF, il est peut-être fait d'images." };
    }
    return await creer(titre, texte, vers);
  } catch (e) {
    return { erreur: e instanceof Error ? e.message : String(e) };
  }
}

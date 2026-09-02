// ============================================================================
//  CE QUE NEXUS SAIT AVEC CERTITUDE.
//
//  Un modèle de un milliard de paramètres qui tourne dans un navigateur se
//  trompe en calcul, et il se trompe AVEC APLOMB. Je l'ai vu répondre
//  « x = -5 » à « 3x + 7 = 22 », en six étapes bien présentées, en parlant
//  d'une « méthode des substitutions » qui n'existe pas ici.
//
//  Aharon est en première. Une réponse fausse qui a l'air sûre est pire que
//  pas de réponse du tout : il la recopie.
//
//  Alors ce qui peut être calculé EXACTEMENT l'est ici, en code, sans modèle.
//  Le modèle explique ; l'arithmétique, elle, ne se discute pas.
// ============================================================================
const NexusMaths = (() => {

  /// Un polynôme du premier degré : a·x + b. C'est tout ce qu'on accepte —
  /// dès qu'apparaît un x², on rend la main plutôt que de deviner.
  const P = (a, b) => ({ a, b });
  const CONST = (b) => P(0, b);

  function lire(src) {
    // Les tournures d'un cahier : « 2x », « 3 × 4 », « 10 ÷ 2 », la virgule
    // décimale française, et l'espace insécable des milliers.
    const s = src
      .replace(/[  ]/g, "")
      .replace(/[×✕·]/g, "*").replace(/[÷]/g, "/")
      .replace(/(\d),(\d)/g, "$1.$2")
      .replace(/\s+/g, "");
    let i = 0;
    const fin = () => i >= s.length;
    const vu = () => s[i];

    function nombre() {
      const d = i;
      while (!fin() && /[\d.]/.test(vu())) i++;
      if (i === d) return null;
      const v = parseFloat(s.slice(d, i));
      return Number.isFinite(v) ? v : null;
    }

    function facteur() {
      if (vu() === "+") { i++; return facteur(); }
      if (vu() === "-") { i++; const f = facteur(); return f && P(-f.a, -f.b); }
      if (vu() === "(") {
        i++; const e = somme();
        if (vu() !== ")") return null;
        i++; return e;
      }
      const n = nombre();
      if (n !== null) {
        // « 3x » : un nombre collé à l'inconnue.
        if (!fin() && /[a-z]/i.test(vu()) && estLInconnue(vu())) { i++; return P(n, 0); }
        // « 4(x+1) » : la multiplication qu'on n'écrit pas au tableau.
        if (!fin() && vu() === "(") {
          const d = facteur();
          if (!d) return null;
          return P(d.a * n, d.b * n);
        }
        return CONST(n);
      }
      if (!fin() && estLInconnue(vu())) { i++; return P(1, 0); }
      return null;
    }

    function produit() {
      let g = facteur();
      if (!g) return null;
      while (!fin() && (vu() === "*" || vu() === "/")) {
        const op = s[i++];
        const d = facteur();
        if (!d) return null;
        if (op === "*") {
          // x fois x : ce n'est plus du premier degré. On abandonne
          // honnêtement au lieu de rendre un résultat faux.
          if (g.a !== 0 && d.a !== 0) return null;
          g = g.a !== 0 ? P(g.a * d.b, g.b * d.b) : P(d.a * g.b, d.b * g.b);
        } else {
          if (d.a !== 0 || d.b === 0) return null;   // diviser PAR une inconnue
          g = P(g.a / d.b, g.b / d.b);
        }
      }
      return g;
    }

    function somme() {
      let g = produit();
      if (!g) return null;
      while (!fin() && (vu() === "+" || vu() === "-")) {
        const op = s[i++];
        const d = produit();
        if (!d) return null;
        g = op === "+" ? P(g.a + d.a, g.b + d.b) : P(g.a - d.a, g.b - d.b);
      }
      return g;
    }

    let inconnue = null;
    function estLInconnue(c) {
      if (!/[a-z]/i.test(c)) return false;
      // Une seule lettre dans tout le calcul : deux inconnues, on renonce.
      if (inconnue === null) { inconnue = c.toLowerCase(); return true; }
      return c.toLowerCase() === inconnue;
    }

    const e = somme();
    if (!e || !fin()) return null;
    return { e, inconnue };
  }

  /// Écrire un nombre comme on l'écrit en cours : entier si c'est un entier,
  /// fraction réduite si elle est jolie, sinon décimal.
  function joli(v) {
    if (!Number.isFinite(v)) return null;
    if (Math.abs(v - Math.round(v)) < 1e-9) return String(Math.round(v));
    for (let d = 2; d <= 64; d++) {
      const n = v * d;
      if (Math.abs(n - Math.round(n)) < 1e-9) {
        const pgcd = (a, b) => (b ? pgcd(b, a % b) : Math.abs(a));
        const g = pgcd(Math.round(n), d);
        return `${Math.round(n) / g}/${d / g}`;
      }
    }
    return String(Math.round(v * 1e6) / 1e6).replace(".", ",");
  }

  /// Dégager le calcul des mots qui l'entourent.
  ///
  /// Mes propres essais m'ont montré quatre réponses FAUSSES avant d'écrire
  /// ceci, toutes nées du même geste : effacer un mot laisse ses voisins se
  /// recoller. « Exercice 4 : résous 5x - 3 = 12 » devenait « 45x - 3 = 12 »,
  /// et Nexus répondait x = 1/3 avec assurance.
  /// Alors un mot effacé laisse une CASSURE, et l'on ne garde qu'un seul
  /// morceau — celui qui porte le « = ».
  function degager(ligne) {
    // Une puissance, une racine : ce n'est plus du premier degré, et retirer
    // le « ² » transformerait x² en x. On rend la main tout de suite.
    if (/[²³⁴⁵√^]/.test(ligne)) return null;
    const morceaux = ligne
      .replace(/[’']/g, "'")
      .replace(/\b[a-zA-ZÀ-ÿ]'/g, "|")            // l', d', n'…
      .replace(/[a-zA-ZÀ-ÿ]{2,}/g, "|")            // les mots
      .replace(/[^0-9a-zA-Z+\-*\/×÷().,=| ]/g, "|")
      .split("|")
      .map((m) => m.replace(/\s+/g, " ").trim()
                   .replace(/^[*\/=.,]+/, "").replace(/[.,]+$/, "").trim())
      .filter(Boolean);
    if (!morceaux.length) return null;
    // Le morceau qui porte l'égalité ; sinon le plus long qui contient une
    // vraie opération. Deux nombres posés côte à côte ne sont pas un calcul.
    const avecEgal = morceaux.filter((m) => m.includes("="));
    if (avecEgal.length === 1) return avecEgal[0];
    if (avecEgal.length > 1) return null;           // deux égalités : on renonce
    const calculs = morceaux.filter((m) => /[+\-*\/×÷]/.test(m) && /\d/.test(m));
    if (calculs.length !== 1) return null;
    return calculs[0];
  }

  /// La seule fonction publique : « est-ce que je SAIS répondre à ça ? »
  /// Rend null dès qu'il y a le moindre doute — mieux vaut laisser parler le
  /// modèle que de se tromper avec autorité.
  function resoudre(texte) {
    if (!texte) return null;
    // On ne garde que ce qui ressemble à un calcul : une ligne avec des
    // chiffres et un « = », ou un calcul pur. Une équation arrive presque
    // toujours DANS une phrase — « Résoudre l'équation 3x + 7 = 22. » — et il
    // faut la dégager des mots sans avaler le « l' » comme une inconnue.
    const ligne = degager((texte.match(/[^\n]*=[^\n]*/) || [texte])[0]);
    if (!ligne || !/\d/.test(ligne)) return null;

    if (ligne.includes("=")) {
      const cotes = ligne.split("=");
      if (cotes.length !== 2) return null;
      const g = lire(cotes[0]), d = lire(cotes[1]);
      if (!g || !d) return null;
      const a = g.e.a - d.e.a, b = d.e.b - g.e.b;
      const x = g.inconnue || d.inconnue;
      if (!x) return null;
      if (Math.abs(a) < 1e-12) {
        return Math.abs(b) < 1e-12
          ? { genre: "toujours", texte: "Cette égalité est vraie pour tout " + x + "." }
          : { genre: "jamais", texte: "Cette égalité n'a pas de solution." };
      }
      const v = b / a;
      return {
        genre: "equation", inconnue: x, valeur: v,
        texte: `${x} = ${joli(v)}`,
        // Le chemin, écrit une fois pour toutes et donc juste à chaque fois.
        etapes: [
          `On met tous les ${x} d'un côté et les nombres de l'autre :`,
          `${joli(a)}${x} = ${joli(b)}`,
          `On divise les deux côtés par ${joli(a)} :`,
          `${x} = ${joli(b)} ÷ ${joli(a)} = ${joli(v)}`,
        ],
        verif: `Vérification : on remplace ${x} par ${joli(v)} — les deux côtés `
             + `donnent bien ${joli(g.e.a * v + g.e.b)}.`,
      };
    }

    // Un calcul sans inconnue : on le fait, exactement. Mais il faut une vraie
    // OPÉRATION — « 3 » tout seul n'est pas un calcul, et Nexus répondait
    // « 3 = 3 » à « jeudi 3 septembre ».
    if (!/[+\-*\/×÷]/.test(ligne)) return null;
    const c = lire(ligne);
    if (!c || c.inconnue) return null;
    if (c.e.a !== 0) return null;
    return { genre: "calcul", valeur: c.e.b, texte: `${ligne} = ${joli(c.e.b)}` };
  }

  return { resoudre, joli };
})();

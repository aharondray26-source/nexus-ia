// ============================================================================
//  DU LATEX EN FRANÇAIS LISIBLE.
//
//  Les modèles écrivent les mathématiques en LaTeX : « \( U_n = a \times
//  q^{(n-1)} \) ». Nexus affiche du texte, pas des formules composées — alors
//  Aharon voit les antislashs, les accolades, et une bouillie.
//
//  On a essayé de le leur INTERDIRE dans la consigne. Essayé le 6 septembre
//  2026 avec Qwen2.5-3B : il en écrit quand même. Un petit modèle ne suit pas
//  fiablement une interdiction — surtout une interdiction sur une habitude
//  aussi ancrée.
//
//  Donc on ne demande plus : on nettoie. Ça marche avec TOUS les modèles, y
//  compris ceux qu'on n'a pas choisis.
// ============================================================================

/// Les symboles LaTeX les plus courants, en vrai français.
const SYMBOLES: [RegExp, string][] = [
  [/\\times/g, "×"], [/\\cdot/g, "·"], [/\\div/g, "÷"],
  [/\\pm/g, "±"], [/\\neq/g, "≠"], [/\\leq/g, "≤"], [/\\geq/g, "≥"],
  [/\\approx/g, "≈"], [/\\infty/g, "∞"], [/\\ldots|\\dots|\\cdots/g, "…"],
  [/\\alpha/g, "α"], [/\\beta/g, "β"], [/\\pi/g, "π"], [/\\theta/g, "θ"],
  [/\\lambda/g, "λ"], [/\\mu/g, "μ"], [/\\sigma/g, "σ"], [/\\Delta/g, "Δ"],
  [/\\sum/g, "Σ"], [/\\prod/g, "∏"], [/\\int/g, "∫"],
  [/\\in\b/g, "∈"], [/\\rightarrow|\\to\b/g, "→"], [/\\Rightarrow/g, "⇒"],
  [/\\left|\\right/g, ""], [/\\quad|\\qquad/g, "  "], [/\\,|\;|\\!/g, ""],
];

/// Les chiffres en indice : « U_1 » se lit mieux « U₁ ».
const INDICES: Record<string, string> = {
  "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄",
  "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉", n: "ₙ", i: "ᵢ", k: "ₖ",
};

export function nettoyerFormules(texte: string): string {
  if (!texte || !/[\\$]/.test(texte)) return texte;   // rien à faire, on ne touche pas
  let t = texte;

  // 1. Les délimiteurs : \( … \), \[ … \], $ … $, $$ … $$.
  t = t.replace(/\\\[([\s\S]*?)\\\]/g, (_, c) => `\n${c.trim()}\n`)
       .replace(/\\\(([\s\S]*?)\\\)/g, (_, c) => c.trim())
       .replace(/\$\$([\s\S]*?)\$\$/g, (_, c) => `\n${c.trim()}\n`)
       // UN « $ » N'EST PAS TOUJOURS UNE FORMULE.
       //
       // « Le prix est de 12 $ et la remise de 3 $ » : deux prix sur une ligne,
       // et ma première version y voyait un délimiteur — elle effaçait les
       // deux symboles et transformait des euros en rien. Vu à l'essai.
       // On n'y touche donc QUE si le contenu porte une vraie marque de LaTeX.
       .replace(/\$([^$\n]{1,120})\$/g,
                (t, c) => /[\\^_]|\\frac|\\times/.test(c) ? String(c).trim() : t);

  // 2. Les fractions, avant le reste : elles portent des accolades.
  //    Deux passages, pour les fractions dans des fractions.
  for (let i = 0; i < 2; i++) {
    t = t.replace(/\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, (_, a, b) => `(${a})/(${b})`);
  }
  t = t.replace(/\\sqrt\s*\{([^{}]*)\}/g, (_, a) => `√(${a})`);

  // 3. Les symboles.
  for (const [re, par] of SYMBOLES) t = t.replace(re, par);

  // 4. Les exposants et les indices.
  t = t.replace(/\^\s*\{([^{}]*)\}/g, (_, a) => `^(${a})`)
       .replace(/_\s*\{([^{}]*)\}/g, (_, a) =>
         [...String(a)].every((c) => INDICES[c]) ? [...String(a)].map((c) => INDICES[c]).join("")
                                                 : `_${a}`)
       .replace(/_([0-9nik])(?![a-zA-Z0-9])/g, (_, c) => INDICES[c] || `_${c}`);

  // 5. Ce qui reste : les accolades vides et les commandes qu'on ne connaît
  //    pas. On enlève la barre, on garde le mot — « \text{oui} » vaut mieux
  //    que rien, et « \oups » vaut mieux que « \oups ».
  t = t.replace(/\\(?:text|mathrm|mathbf|operatorname)\s*\{([^{}]*)\}/g, "$1")
       .replace(/\\begin\{[^}]*\}|\\end\{[^}]*\}/g, "")
       .replace(/\\\\/g, "\n")
       .replace(/\\([a-zA-Z]+)/g, "$1")
       .replace(/[ \t]{3,}/g, "  ");

  return t;
}

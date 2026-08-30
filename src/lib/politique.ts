// ============ CLASSEMENT POLITIQUE — DONNEES REELLES ============
// Le widget ne doit RIEN inventer. On s'appuie sur des placements factuels,
// largement documentes (auto-positionnement des partis, presse, politologie).
// Si un terme n'est pas politique, on le dit clairement au lieu de bricoler
// une reponse au hasard.

export interface Verdict {
  cote: "gauche" | "droite" | "centre" | "non-politique";
  libelle: string;      // ex. "Gauche radicale"
  detail: string;       // une phrase factuelle
  confiance: "sure" | "estimee";
}

// Placements etablis. Les cles incluent sigles ET noms complets.
const BASE: Record<string, Verdict> = {
  // --- Gauche ---
  "lfi": { cote: "gauche", libelle: "Gauche radicale", detail: "La France insoumise, fondée par Jean-Luc Mélenchon : planification écologique, VIe République, hausse du SMIC.", confiance: "sure" },
  "la france insoumise": { cote: "gauche", libelle: "Gauche radicale", detail: "Parti de gauche radicale fondé en 2016 par Jean-Luc Mélenchon.", confiance: "sure" },
  "melenchon": { cote: "gauche", libelle: "Gauche radicale", detail: "Fondateur de La France insoumise, candidat à la présidentielle en 2012, 2017 et 2022.", confiance: "sure" },
  "mélenchon": { cote: "gauche", libelle: "Gauche radicale", detail: "Fondateur de La France insoumise, candidat à la présidentielle en 2012, 2017 et 2022.", confiance: "sure" },
  "nfp": { cote: "gauche", libelle: "Union des gauches", detail: "Nouveau Front populaire : coalition LFI, PS, Écologistes et PCF formée en 2024.", confiance: "sure" },
  "nupes": { cote: "gauche", libelle: "Union des gauches", detail: "Coalition de gauche formée en 2022 (LFI, PS, EELV, PCF).", confiance: "sure" },
  "ps": { cote: "gauche", libelle: "Gauche sociale-démocrate", detail: "Parti socialiste : social-démocratie, membre du Parti socialiste européen.", confiance: "sure" },
  "parti socialiste": { cote: "gauche", libelle: "Gauche sociale-démocrate", detail: "Social-démocratie française, au pouvoir sous Mitterrand puis Hollande.", confiance: "sure" },
  "pcf": { cote: "gauche", libelle: "Gauche communiste", detail: "Parti communiste français, fondé en 1920.", confiance: "sure" },
  "eelv": { cote: "gauche", libelle: "Gauche écologiste", detail: "Les Écologistes (ex-EELV) : écologie politique, siège avec la gauche.", confiance: "sure" },
  "les ecologistes": { cote: "gauche", libelle: "Gauche écologiste", detail: "Écologie politique, allié des gauches au Parlement.", confiance: "sure" },
  "npa": { cote: "gauche", libelle: "Extrême gauche", detail: "Nouveau Parti anticapitaliste, trotskiste.", confiance: "sure" },
  "lo": { cote: "gauche", libelle: "Extrême gauche", detail: "Lutte ouvrière, parti trotskiste.", confiance: "sure" },
  "cgt": { cote: "gauche", libelle: "Syndicalisme de lutte", detail: "Confédération générale du travail, historiquement liée à la gauche.", confiance: "sure" },

  // --- Centre ---
  "renaissance": { cote: "centre", libelle: "Centre libéral", detail: "Parti d'Emmanuel Macron (ex-LREM) : libéralisme économique et progressisme sociétal.", confiance: "sure" },
  "lrem": { cote: "centre", libelle: "Centre libéral", detail: "La République en marche, devenue Renaissance en 2022.", confiance: "sure" },
  "macron": { cote: "centre", libelle: "Centre-droit libéral", detail: "Président depuis 2017 : réformes libérales (travail, retraites) et positionnement progressiste.", confiance: "sure" },
  "modem": { cote: "centre", libelle: "Centre", detail: "Mouvement démocrate de François Bayrou, centriste et pro-européen.", confiance: "sure" },
  "bayrou": { cote: "centre", libelle: "Centre", detail: "Fondateur du MoDem, figure historique du centrisme français.", confiance: "sure" },
  "horizons": { cote: "centre", libelle: "Centre-droit", detail: "Parti d'Édouard Philippe, allié de la majorité présidentielle.", confiance: "sure" },

  // --- Droite ---
  "lr": { cote: "droite", libelle: "Droite conservatrice", detail: "Les Républicains : héritiers du gaullisme, droite libérale-conservatrice.", confiance: "sure" },
  "les republicains": { cote: "droite", libelle: "Droite conservatrice", detail: "Droite de gouvernement, héritière de l'UMP et du RPR.", confiance: "sure" },
  "ump": { cote: "droite", libelle: "Droite conservatrice", detail: "Union pour un mouvement populaire, devenue Les Républicains en 2015.", confiance: "sure" },
  "rn": { cote: "droite", libelle: "Extrême droite", detail: "Rassemblement national (ex-Front national) : souverainisme, priorité nationale, immigration.", confiance: "sure" },
  "rassemblement national": { cote: "droite", libelle: "Extrême droite", detail: "Ex-Front national, dirigé par Jordan Bardella, figure principale Marine Le Pen.", confiance: "sure" },
  "front national": { cote: "droite", libelle: "Extrême droite", detail: "Fondé en 1972, renommé Rassemblement national en 2018.", confiance: "sure" },
  "le pen": { cote: "droite", libelle: "Extrême droite", detail: "Marine Le Pen, figure du Rassemblement national, finaliste en 2017 et 2022.", confiance: "sure" },
  "bardella": { cote: "droite", libelle: "Extrême droite", detail: "Président du Rassemblement national depuis 2022.", confiance: "sure" },
  "reconquete": { cote: "droite", libelle: "Extrême droite", detail: "Parti d'Éric Zemmour, fondé en 2021.", confiance: "sure" },
  "zemmour": { cote: "droite", libelle: "Extrême droite", detail: "Fondateur de Reconquête, candidat en 2022.", confiance: "sure" },
  "sarkozy": { cote: "droite", libelle: "Droite conservatrice", detail: "Président de 2007 à 2012, figure de l'UMP.", confiance: "sure" },
  "de gaulle": { cote: "droite", libelle: "Droite gaulliste", detail: "Fondateur de la Ve République, figure du gaullisme.", confiance: "sure" },
  "medef": { cote: "droite", libelle: "Patronat libéral", detail: "Organisation patronale, défend la liberté d'entreprendre.", confiance: "sure" },
};

// Marqueurs thematiques (utilises seulement si le terme n'est pas dans la base).
const G = ["impôt sur la fortune","isf","redistribution","service public","solidarité","smic","syndicat","grève","nationalisation","sécurité sociale","écologie","égalité","féminisme","antiracisme","logement social","salaire","retraite à 60"];
const D = ["baisse des impôts","libéralisme","entreprise","privatisation","frontière","immigration","sécurité","autorité","tradition","souveraineté","identité","famille","ordre","police","dette publique","flexibilité"];

const NON_POLITIQUE = /^(football|foot|clavier|ordinateur|pizza|chat|chien|voiture|musique|film|jeu|meteo|météo|maths?|physique)$/i;

export function classer(terme: string): Verdict {
  const t = terme.trim().toLowerCase();
  if (!t) return { cote: "non-politique", libelle: "—", detail: "Entre un mot, un parti ou une idée.", confiance: "sure" };

  // 1) Correspondance exacte ou partielle dans la base factuelle
  if (BASE[t]) return BASE[t];
  for (const [k, v] of Object.entries(BASE)) {
    if (t.includes(k) || k.includes(t)) return v;
  }

  // 2) Terme manifestement non politique : on le dit, on n'invente pas
  if (NON_POLITIQUE.test(t)) {
    return { cote: "non-politique", libelle: "Sujet non politique",
      detail: `« ${terme} » n'est pas un sujet politique : aucun classement gauche/droite ne serait honnête.`,
      confiance: "sure" };
  }

  // 3) Analyse par marqueurs thematiques (classement estime, annonce comme tel)
  const g = G.filter((w) => t.includes(w)).length;
  const d = D.filter((w) => t.includes(w)).length;
  if (g === 0 && d === 0) {
    return { cote: "non-politique", libelle: "Non reconnu",
      detail: `« ${terme} » n'est pas dans la base et ne contient aucun marqueur politique clair. Ouvre l'application pour une analyse complète.`,
      confiance: "sure" };
  }
  if (g > d) return { cote: "gauche", libelle: "Plutôt à gauche",
    detail: `Marqueurs relevés : ${G.filter((w) => t.includes(w)).join(", ")}.`, confiance: "estimee" };
  if (d > g) return { cote: "droite", libelle: "Plutôt à droite",
    detail: `Marqueurs relevés : ${D.filter((w) => t.includes(w)).join(", ")}.`, confiance: "estimee" };
  return { cote: "centre", libelle: "Position mixte",
    detail: "Le terme combine des marqueurs des deux bords.", confiance: "estimee" };
}

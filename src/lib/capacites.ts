// ============================================================================
//  LE CATALOGUE DES CAPACITÉS
//
//  Aharon : « il faut qu'il n'y ait aucune capacité que la mascotte de notre
//  site ait tandis que la mascotte de l'application macOS ne l'a pas… et
//  essaie de rajouter toutes ces capacités au maximum dans celle du site, le
//  but est d'égaliser au maximum leurs capacités. »
//
//  Le problème, avant : personne ne savait ce que chaque mascotte savait
//  faire. Les capacités du site étaient une longue suite de « si la phrase
//  contient tel mot » perdue au milieu d'un composant ; celles du Mac étaient
//  une liste d'outils dans un fichier Swift. Impossible de comparer, donc
//  impossible de mettre à parité — et impossible de savoir ce qui manque.
//
//  Ce fichier est LA LISTE, écrite une fois. Chaque capacité dit où elle
//  existe. Le banc `outils/parite.mts` s'en sert pour vérifier deux choses :
//    · aucune capacité du site n'est absente du Mac ;
//    · les capacités marquées des deux côtés existent VRAIMENT dans le code
//      des deux côtés — pas seulement dans ce tableau.
//
//  Une case cochée ici qui ne correspond à rien dans le code fait échouer le
//  banc. C'est le seul moyen pour que cette liste reste vraie.
//
//  DEPUIS L'APPLICATION WINDOWS, il y a une exigence de plus, et c'est celle
//  qu'Aharon a posée : « fais-la complète, elle doit être LARGEMENT MEILLEURE
//  au niveau des fonctions ». Le banc vérifie donc aussi qu'AUCUNE capacité du
//  site ni du Mac ne manque à Windows — et il compte celles que Windows a en
//  plus. Une promesse qu'on ne peut pas mesurer n'est pas une promesse.
// ============================================================================

export type Surface = "site" | "mac" | "win";

export type Capacite = {
  /// L'identifiant partagé. Côté Mac, c'est le nom de l'outil de l'IA.
  id: string;
  nom: string;
  quoi: string;
  /// Ce qu'on peut dire pour la déclencher — sert aussi à l'aide affichée.
  exemples: string[];
  ou: Surface[];
  /// Quand une capacité n'existe que d'un côté, on dit POURQUOI. Sans cette
  /// phrase, on ne sait pas si c'est un manque ou une impossibilité.
  pourquoiPas?: string;
  /// LA PREUVE. Un chemin de fichier et un texte qui doit s'y trouver, pour
  /// chaque surface où la capacité est annoncée. C'est ce qui empêche ce
  /// tableau de mentir : `outils/parite.mts` ouvre les fichiers et vérifie.
  /// Une case cochée sans preuve, ou avec une preuve introuvable, fait échouer
  /// le banc — donc `avant-de-publier.sh`.
  preuve: Partial<Record<Surface, [string, string][]>>;
};

export const CAPACITES: Capacite[] = [
  // ─────────────────────────────────────────── écrire et convertir
  {
    id: "creer_document",
    nom: "Écrire un document",
    quoi: "Rédige un vrai document et l'enregistre : PDF paginé, Word (.docx), "
        + "page web, texte brut ou Markdown.",
    exemples: ["fais-moi un document sur la Révolution française",
               "écris-moi une lettre de motivation en PDF",
               "un exposé sur les volcans en Word"],
    ou: ["site", "mac", "win"],
    preuve: { win: [["src/lib/bureautique.ts", "export async function creer("], ["src/os/NexusAssistant.tsx", "comprendreDocument(fullQuery)"]], site: [["src/lib/bureautique.ts", "export async function creer("], ["src/os/NexusAssistant.tsx", "comprendreDocument(fullQuery)"]], mac: [["Sources/Bureautique.swift", "static func creer(titre:"], ["Sources/IA.swift", '"name": "creer_document"']] },
  },
  {
    id: "convertir_document",
    nom: "Convertir un document",
    quoi: "Change un fichier de format, dans les deux sens — Word vers PDF, "
        + "PDF vers Word, et le reste.",
    exemples: ["convertis ce fichier en PDF", "transforme mon PDF en Word"],
    ou: ["site", "mac", "win"],
    preuve: { win: [["src/lib/bureautique.ts", "export async function convertir("]], site: [["src/lib/bureautique.ts", "export async function convertir("]], mac: [["Sources/Bureautique.swift", "static func convertir("], ["Sources/IA.swift", '"name": "convertir_document"']] },
  },
  // ─────────────────────────────────────────── fabriquer
  {
    id: "creer_application",
    nom: "Fabriquer une petite application",
    quoi: "Écrit une petite application qui s'ouvre dans Nexus et se range "
        + "dans le menu.",
    exemples: ["crée-moi une application minuteur", "fabrique un compteur de buts"],
    ou: ["site", "mac", "win"],
    preuve: { win: [["src/lib/fabriquer.ts", "CONSIGNE_FABRIQUE"]], site: [["src/lib/fabriquer.ts", "CONSIGNE_FABRIQUE"], ["src/lib/miniApps.ts", "ajouterMiniApp"]], mac: [["Sources/PetitesApps.swift", "static func ajouter("], ["Sources/IA.swift", '"name": "creer_application"']] },
  },
  {
    id: "creer_raccourci",
    nom: "Fabriquer un raccourci macOS",
    quoi: "Fabrique un vrai raccourci Apple qui exécute un script.",
    exemples: ["fais un raccourci pour ranger mon bureau"],
    ou: ["mac", "win"],
    pourquoiPas: "Un site ne peut pas installer un raccourci dans macOS : "
               + "c'est le système qui l'interdit, pas Nexus.",
    preuve: { win: [["windows/src-tauri/src/scripts.rs", "pub fn creer_script"], ["src/lib/pcWindows.ts", "creerScript:"]], mac: [["Sources/Pouvoirs.swift", "fabriquerRaccourci"], ["Sources/IA.swift", '"name": "creer_raccourci"']] },
  },
  // ─────────────────────────────────────────── organiser
  {
    id: "ajouter_tache",
    nom: "Créer une tâche ou un rappel",
    quoi: "Ajoute la tâche, avec son horaire si tu en donnes un.",
    exemples: ["rappelle-moi d'appeler papa à 18h", "ajoute une tâche : réviser"],
    ou: ["site", "mac", "win"],
    preuve: { win: [["src/os/NexusAssistant.tsx", "addNexusTask("]], site: [["src/os/NexusAssistant.tsx", "addNexusTask("]], mac: [["Sources/Local.swift", "tache"]] },
  },
  {
    id: "ajouter_evenement",
    nom: "Ajouter au calendrier",
    quoi: "Comprend « vendredi prochain à 14h » et crée l'évènement, "
        + "exportable vers n'importe quel agenda.",
    exemples: ["ajoute un contrôle de maths vendredi à 10h"],
    ou: ["site", "mac", "win"],
    preuve: { win: [["src/lib/agenda.ts", "export function comprendreQuand"]], site: [["src/lib/agenda.ts", "export function comprendreQuand"], ["src/lib/agenda.ts", "export function telechargerIcs"]], mac: [["Sources/Local.swift", "agenda"]] },
  },
  {
    id: "prendre_note",
    nom: "Prendre une note",
    quoi: "Écrit la note et l'ouvre.",
    exemples: ["note que le code du portail est 1234"],
    ou: ["site", "mac", "win"],
    preuve: { win: [["src/lib/miniApps.ts", "note"]], site: [["src/lib/miniApps.ts", "note"]], mac: [["Sources/Local.swift", "note"]] },
  },
  // ─────────────────────────────────────────── l'espace
  {
    id: "ouvrir_espace_nexus",
    nom: "Ouvrir un espace de Nexus",
    quoi: "Ouvre n'importe lequel des espaces : notes, tâches, calendrier, "
        + "fichiers, mail, cloud, calculatrice, météo, jeux, réglages…",
    exemples: ["ouvre la calculatrice", "montre-moi mes fichiers"],
    ou: ["site", "mac", "win"],
    preuve: { win: [["src/os/appsRegistry.tsx", "export"]], site: [["src/os/appsRegistry.tsx", "export"]], mac: [["Sources/IA.swift", '"name": "ouvrir_espace_nexus"']] },
  },
  {
    id: "regler_nexus",
    nom: "Régler Nexus",
    quoi: "Allume ou éteint les widgets, le dock, la mascotte, le fond vivant, "
        + "et change le thème et la couleur d'accent.",
    exemples: ["mets le thème en clair", "cache la mascotte", "accent en rouge"],
    ou: ["site", "mac", "win"],
    preuve: { win: [["src/os/useSettings.ts", "export"]], site: [["src/os/useSettings.ts", "export"]], mac: [["Sources/Pouvoirs.swift", "static func reglage("], ["Sources/IA.swift", '"name": "regler_nexus"']] },
  },
  {
    id: "changer_fond_ecran",
    nom: "Changer le fond",
    quoi: "Change le fond d'écran.",
    exemples: ["change le fond d'écran", "mets un fond bleu"],
    ou: ["site", "mac", "win"],
    preuve: { win: [["windows/src-tauri/src/systeme.rs", "pub fn changer_fond_ecran"], ["src/lib/pcWindows.ts", "changerFondEcran:"]], site: [["src/lib/fondsEcran.ts", "export"]], mac: [["Sources/Pouvoirs.swift", "static func fondDEcran("], ["Sources/IA.swift", '"name": "changer_fond_ecran"']] },
  },
  // ─────────────────────────────────────────── la machine
  {
    id: "chercher_fichiers",
    nom: "Retrouver un fichier",
    quoi: "Cherche par le nom.",
    exemples: ["retrouve mon devoir de maths"],
    ou: ["site", "mac", "win"],
    preuve: { win: [["windows/src-tauri/src/fichiers.rs", "pub fn chercher_fichiers"], ["src/lib/recherchePC.ts", "chercherSurLePC"]], site: [["src/lib/fileStore.ts", "export"]], mac: [["Sources/Recherche.swift", "static func parNom("], ["Sources/IA.swift", '"name": "chercher_fichiers"']] },
  },
  {
    id: "chercher_dans_contenu",
    nom: "Chercher dans le contenu",
    quoi: "Cherche un texte À L'INTÉRIEUR des documents.",
    exemples: ["quel fichier parle de la photosynthèse ?"],
    ou: ["mac", "win"],
    pourquoiPas: "Le site ne voit que les fichiers que tu lui donnes ; "
               + "il ne peut pas fouiller le disque tout seul.",
    preuve: { win: [["windows/src-tauri/src/fichiers.rs", "pub fn chercher_dans_contenu"], ["src/lib/pcWindows.ts", "chercherDansContenu:"]], mac: [["Sources/Recherche.swift", "static func parContenu("], ["Sources/IA.swift", '"name": "chercher_dans_contenu"']] },
  },
  {
    id: "montrer_fichier",
    nom: "Montrer un fichier",
    quoi: "Affiche le fichier dans le Finder.",
    exemples: ["montre-moi ce fichier"],
    ou: ["mac", "win"],
    pourquoiPas: "Un site n'a pas le droit d'ouvrir le Finder.",
    preuve: { win: [["windows/src-tauri/src/fichiers.rs", "pub fn montrer_fichier"]], mac: [["Sources/Recherche.swift", "static func montrer("], ["Sources/IA.swift", '"name": "montrer_fichier"']] },
  },
  {
    id: "ouvrir_application",
    nom: "Ouvrir une application du Mac",
    quoi: "Lance n'importe quelle application installée.",
    exemples: ["ouvre Safari", "lance Spotify"],
    ou: ["mac", "win"],
    pourquoiPas: "Un site ne peut pas lancer une application du système.",
    preuve: { win: [["windows/src-tauri/src/apps.rs", "pub fn ouvrir_application"]], mac: [["Sources/IA.swift", '"name": "ouvrir_application"']] },
  },
  {
    id: "lancer_raccourci",
    nom: "Lancer un raccourci",
    quoi: "Exécute un raccourci macOS déjà installé.",
    exemples: ["lance mon raccourci Ranger"],
    ou: ["mac", "win"],
    pourquoiPas: "Même raison que pour la fabrication de raccourcis.",
    preuve: { win: [["windows/src-tauri/src/scripts.rs", "pub fn lancer_script"]], mac: [["Sources/Pouvoirs.swift", "static func lancerRaccourci("], ["Sources/IA.swift", '"name": "lancer_raccourci"']] },
  },
  // ─────────────────────────────────────────── l'intelligence
  {
    id: "repondre",
    nom: "Répondre, expliquer, rédiger",
    quoi: "Le modèle hébergé avec le site, sans clé et sans installation ; "
        + "et un modèle qui tourne dans l'appareil quand il n'y a pas de réseau.",
    exemples: ["explique-moi les dérivées", "résume ce texte"],
    ou: ["site", "mac", "win"],
    preuve: { win: [["src/lib/nexusBrain.ts", "queryNexusAIObject"]], site: [["src/lib/nexusBrain.ts", "queryNexusAIObject"], ["src/lib/iaNavigateur.ts", "export"]], mac: [["Sources/EnLigne.swift", "demander"], ["Sources/Cerveau.swift", "func"]] },
  },
  {
    id: "lire_un_fichier",
    nom: "Lire un fichier qu'on lui donne",
    quoi: "On lui dépose un PDF, une image ou un document : elle le lit et "
        + "répond dessus.",
    exemples: ["(glisser un PDF sur la mascotte)"],
    ou: ["site", "mac", "win"],
    preuve: { win: [["src/os/NexusAssistant.tsx", "dataTransfer"]], site: [["src/os/NexusAssistant.tsx", "dataTransfer"]], mac: [["Sources/Fenetres.swift", "func"]] },
  },
  {
    id: "lire_l_ecran",
    nom: "Lire l'écran",
    quoi: "Capture une zone de l'écran et en extrait le texte.",
    exemples: ["lis ce qu'il y a à l'écran"],
    ou: ["mac", "win"],
    pourquoiPas: "Un site ne peut pas voir l'écran ; l'extension Nexus le "
               + "fait, elle, avec la Loupe.",
    preuve: { win: [["windows/src-tauri/src/ecran.rs", "pub fn capturer_ecran"], ["src/lib/pcWindows.ts", "capturerEcran:"]], mac: [["Sources/Capture.swift", "func"]] },
  },
  // ─────────────────────────────────── ce que Windows seul permet
  {
    id: "barre_globale",
    nom: "La barre, par-dessus tout",
    quoi: "Alt+Espace ouvre Nexus au-dessus de n'importe quelle application — "
        + "un jeu, un cours en visio — et on lui demande n'importe quoi : un "
        + "fichier, une application, une fenêtre déjà ouverte, une question.",
    exemples: ["Alt+Espace, puis « devoir de maths »", "Alt+Espace, puis « ouvre Word »"],
    ou: ["win"],
    pourquoiPas: "Le Mac a déjà Spotlight, et macOS ne laisse pas une "
               + "application non signée par Apple prendre un raccourci global "
               + "sans autorisation d'accessibilité. Windows, si — et Windows "
               + "n'a rien d'équivalent à Spotlight.",
    preuve: { win: [["windows/src-tauri/src/lib.rs", "brancher_raccourci"],
                    ["src/lib/recherchePC.ts", "chercherSurLePC"],
                    ["src/os/CommandPalette.tsx", "chercheurPC"]] },
  },
  {
    id: "menu_contextuel",
    nom: "« Analyser avec Nexus » au clic droit",
    quoi: "Apparaît dans l'Explorateur sur n'importe quel fichier et n'importe "
        + "quel dossier.",
    exemples: ["clic droit sur un PDF → Analyser avec Nexus"],
    ou: ["win"],
    pourquoiPas: "macOS n'ouvre le menu contextuel du Finder qu'à des "
               + "extensions système signées ; un site, lui, ne voit même pas "
               + "l'Explorateur.",
    preuve: { win: [["windows/src-tauri/src/integration.rs", "Analyser avec Nexus"]] },
  },
  {
    id: "demarrage_windows",
    nom: "Démarrer avec Windows",
    quoi: "Nexus se met près de l'horloge au démarrage de la session. C'est ce "
        + "qui rend Alt+Espace instantané : il est déjà là.",
    exemples: ["(un interrupteur dans « Sur ton PC »)"],
    ou: ["win"],
    pourquoiPas: "Sur macOS il faut un agent de lancement et une approbation "
               + "dans les Réglages Système.",
    preuve: { win: [["windows/src-tauri/src/integration.rs", "pub fn regler_demarrage"]] },
  },
  {
    id: "protocole_nexus",
    nom: "Les liens nexus://",
    quoi: "N'importe quel lien, dans un mail ou un document, ouvre l'application "
        + "sur la bonne page.",
    exemples: ["nexus://tasks"],
    ou: ["win"],
    pourquoiPas: "Possible sur macOS, mais seulement pour une application "
               + "signée et notariée par Apple.",
    preuve: { win: [["windows/src-tauri/src/integration.rs", "URL Protocol"]] },
  },
  {
    id: "fenetres_ouvertes",
    nom: "Passer d'une fenêtre à l'autre",
    quoi: "Liste ce qui est ouvert, y va, ou le ferme proprement.",
    exemples: ["Alt+Espace, puis le titre d'une fenêtre déjà ouverte"],
    ou: ["win"],
    pourquoiPas: "macOS exige l'autorisation « Accessibilité », accordée à la "
               + "main, application par application.",
    preuve: { win: [["windows/src-tauri/src/apps.rs", "pub fn activer_fenetre"],
                    ["src/lib/recherchePC.ts", "Déjà ouvert"]] },
  },
  {
    id: "installer_logiciel",
    nom: "Installer un logiciel",
    quoi: "Avec winget, l'outil d'installation livré avec Windows.",
    exemples: ["installe VLC"],
    ou: ["win"],
    pourquoiPas: "macOS n'a pas d'installateur intégré : il faudrait faire "
               + "installer Homebrew d'abord, ce qui n'est pas raisonnable.",
    preuve: { win: [["windows/src-tauri/src/systeme.rs", "pub fn installer_logiciel"]] },
  },
  {
    id: "concentration",
    nom: "Mode concentration",
    quoi: "Ferme ce qui distrait, coupe les notifications, et repasse toutes "
        + "les vingt secondes — parce que Discord revient toujours.",
    exemples: ["travailler 45 minutes"],
    ou: ["win"],
    pourquoiPas: "Fermer une autre application demande, sur macOS, "
               + "l'autorisation d'automatisation pour CHACUNE d'elles.",
    preuve: { win: [["windows/src-tauri/src/concentration.rs", "pub fn demarrer_concentration"],
                    ["src/apps/NexusPC.tsx", "Mode concentration"]] },
  },
  {
    id: "presse_papiers",
    nom: "Travailler sur ce qu'on vient de copier",
    quoi: "Lit et écrit le presse-papiers, pour reprendre un texte copié sans "
        + "avoir à le recoller quelque part.",
    exemples: ["résume ce que je viens de copier"],
    ou: ["win"],
    pourquoiPas: "Un site n'a le droit de lire le presse-papiers qu'après une "
               + "demande d'autorisation, à chaque fois.",
    preuve: { win: [["windows/src-tauri/src/systeme.rs", "pub fn lire_presse_papiers"]] },
  },
];

/// Ce que le site sait faire mais pas le Mac. Doit rester VIDE : c'est
/// exactement la demande d'Aharon.
export function manquantAuMac(): Capacite[] {
  return CAPACITES.filter((c) => c.ou.includes("site") && !c.ou.includes("mac"));
}

/// Ce que le site OU le Mac savent faire et pas Windows. Doit rester VIDE :
/// « elle doit être largement meilleure au niveau des fonctions ».
export function manquantAWindows(): Capacite[] {
  return CAPACITES.filter(
    (c) => (c.ou.includes("site") || c.ou.includes("mac")) && !c.ou.includes("win"),
  );
}

/// Ce que Windows a en plus de tout le monde. C'est le chiffre qui dit
/// « largement meilleure », et il se recompte tout seul.
export function propreAWindows(): Capacite[] {
  return CAPACITES.filter(
    (c) => c.ou.includes("win") && !c.ou.includes("mac") && !c.ou.includes("site"),
  );
}

/// Ce que le Mac sait faire et pas le site, avec la raison.
export function manquantAuSite(): Capacite[] {
  return CAPACITES.filter((c) => c.ou.includes("mac") && !c.ou.includes("site"));
}

export function communes(): Capacite[] {
  return CAPACITES.filter((c) => c.ou.includes("mac") && c.ou.includes("site"));
}

// ============================================================================
//  COMPRENDRE UNE DEMANDE DE DOCUMENT
//
//  Le modèle appelle l'outil quand il y en a un. Mais le site tourne aussi
//  sans modèle joignable, et une demande aussi nette que « fais-moi un PDF
//  sur les volcans » ne doit pas dépendre d'un serveur pour être comprise.
// ============================================================================

import { formatDepuis, type Format } from "./bureautique";

export type DemandeDocument = { titre: string; format: Format; sujet: string };

const MOTS_DOCUMENT = [
  "document", "doc", "pdf", "word", "docx", "rapport", "lettre", "exposé",
  "expose", "fiche", "compte rendu", "compte-rendu", "cv", "dissertation",
  "synthèse", "synthese", "mémoire", "memoire", "courrier",
];

/// Reconnaît « fais-moi un PDF sur les volcans » et en sort le format et le
/// sujet. Rend `null` quand ce n'est pas une demande de document — et il vaut
/// mieux rendre `null` une fois de trop que fabriquer un PDF à quelqu'un qui
/// posait une question.
export function comprendreDocument(phrase: string): DemandeDocument | null {
  const p = (phrase || "").trim();
  const bas = p.toLowerCase();

  // ATTENTION AUX ACCENTS.
  //
  // « \b » de JavaScript ne connaît que l'alphabet anglais : devant « écris »,
  // il n'y a AUCUNE limite de mot, parce que « é » n'est pas une lettre à ses
  // yeux. « écris-moi une lettre en PDF » n'était donc pas reconnu du tout —
  // et c'est exactement le même piège qui avait transformé « contrôle de
  // maths » en « contrô maths ». On pose donc nos propres délimiteurs, sur
  // les lettres de TOUTES les langues (\p{L}), pas sur l'ASCII.
  const AVANT = "(?:^|[^\\p{L}\\p{N}])";
  const APRES = "(?![\\p{L}\\p{N}])";
  const contient = (mots: string) =>
    new RegExp(AVANT + "(?:" + mots + ")" + APRES, "u").test(bas);

  // Il faut un VERBE de fabrication. Sans lui, « c'est quoi un PDF ? » ou
  // « résume ce document » deviendraient des demandes de fabrication.
  const VERBES = "fais|faire|cr[ée]e|cr[ée]er|[ée]cris|[ée]crire|r[ée]dige|"
               + "r[ée]diger|g[ée]n[èe]re|g[ée]n[ée]rer|pr[ée]pare|pr[ée]parer|"
               + "monte|produis|produire";
  if (!contient(VERBES)) return null;

  const DOCUMENTS = "documents?|docs?|pdfs?|words?|docx|rapports?|lettres?|"
                  + "expos[ée]s?|fiches?|compte[- ]rendus?|cv|dissertations?|"
                  + "synth[èe]ses?|m[ée]moires?|courriers?|devoirs?";
  if (!contient(DOCUMENTS)) return null;

  // « crée-moi une application » n'est pas un document, même si le mot « doc »
  // traîne quelque part.
  if (contient("applications?|applis?|widgets?|raccourcis?")) return null;

  // ── LE FORMAT ────────────────────────────────────────────────────────────
  // On repère AUSSI l'endroit où le format est écrit, pour pouvoir le retirer
  // du sujet : sans ça, le titre devient « Les volcans en Word ».
  let format: Format = "pdf";
  const FORMULES: [RegExp, Format][] = [
    [/\b(?:en|au format|format)\s+(?:un\s+)?(?:fichier\s+)?word\b|\bdocx\b|\.docx\b/iu, "docx"],
    [/\b(?:en|au format|format)\s+(?:une\s+)?page\s+web\b|\bhtml\b/iu, "html"],
    [/\b(?:en|au format|format)\s+markdown\b|\.md\b/iu, "md"],
    [/\b(?:en|au format|format)\s+texte(?:\s+brut)?\b|\.txt\b/iu, "txt"],
    [/\b(?:en|au format|format)\s+pdf\b|\bpdf\b/iu, "pdf"],
  ];
  let sansFormat = p;
  for (const [re, f] of FORMULES) {
    const m = p.match(re);
    if (m) {
      format = f;
      sansFormat = p.replace(re, " ");
      break;
    }
  }
  // « un exposé en Word » : le mot « word » seul, sans « en », compte aussi.
  if (format === "pdf" && contient("words?|docx")) { format = "docx"; }

  // ── LE SUJET ─────────────────────────────────────────────────────────────
  let sujet = "";
  const apres = sansFormat.match(
    /(?:^|[^\p{L}])(?:sur|à propos de|a propos de|concernant|au sujet de|parlant de|à propos du|du sujet)\s+(.+)$/iu);
  if (apres) {
    sujet = apres[1];
  } else {
    // Sinon on épluche le DÉBUT de la phrase, mot à mot, tant qu'on tombe sur
    // de l'intendance — et l'on s'arrête au premier vrai mot.
    //
    // Retirer ces mots PARTOUT semblait plus simple, mais « écris-moi une
    // lettre de motivation » devenait « lettre motivation » : le « de » du
    // milieu appartenait au sujet. Un mot d'intendance ne l'est qu'en tête.
    const INTENDANCE = new RegExp(
      "^(?:" + VERBES + "|moi|toi|nous|s'?il te pla[îi]t|stp|steuplait|please|"
      + "merci|un|une|le|la|les|des|du|de|au|aux|mon|ma|mes|ce|cette|ces|"
      + "documents?|docs?|pdfs?|words?|docx|html|markdown|fichiers?|format|"
      + "petits?|beaux?|belles?|joli(?:es?|s)?|vrais?)$", "iu");
    const jetons = sansFormat.split(/([\s\-–—'’,.;:!?«»"]+)/u);
    let i = 0;
    while (i < jetons.length) {
      const mot = jetons[i];
      if (!mot) { i++; continue; }
      if (/^[\s\-–—'’,.;:!?«»"]+$/u.test(mot)) { i++; continue; }
      if (!INTENDANCE.test(mot)) break;
      jetons[i] = "";
      i++;
    }
    sujet = jetons.join("");
  }
  // On nettoie ce qui reste : traits d'union orphelins, ponctuation de bord,
  // espaces doubles. « fais-moi un CV » laissait « - CV ».
  sujet = sujet
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s\-–—,.;:!?'"«»]+/u, "")
    .replace(/[\s\-–—,.;:!?'"«»]+$/u, "")
    // Un « en » ou un « au format » orphelin en fin de phrase : c'est le
    // reste du format qu'on vient de retirer. « CV en docx » laissait
    // « CV en ».
    .replace(/(?:^|\s)(?:en|au|à|a|du|de|d')(?:\s+format)?$/iu, "")
    .trim();
  if (sujet.length < 2) sujet = "Document Nexus";

  let titre = sujet.length > 70 ? sujet.slice(0, 70).trim() : sujet;
  titre = titre.charAt(0).toUpperCase() + titre.slice(1);

  return { titre, format, sujet };
}

/// La consigne donnée au modèle pour qu'il RÉDIGE, au lieu de proposer un plan.
export function consigneDocument(sujet: string, titre: string): string {
  return `Rédige un document complet et soigné sur : ${sujet}

Règles absolues :
- Rends UNIQUEMENT le document, en Markdown, sans un mot d'introduction et
  sans barrière de code.
- Ne remets pas le titre « ${titre} » en haut : il est déjà posé.
- Écris le document EN ENTIER, pas un plan ni un résumé : des paragraphes
  rédigés, entre 400 et 900 mots.
- Structure-le avec ## et ### , des listes quand c'est utile, un tableau si
  cela aide vraiment, et une citation en > si elle apporte quelque chose.
- Français correct, ton clair, niveau lycée. Pas de LaTeX, pas d'emoji.`;
}

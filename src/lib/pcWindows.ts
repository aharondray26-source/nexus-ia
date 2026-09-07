// ============================================================================
//  LE PONT AVEC L'APPLICATION WINDOWS
//
//  L'interface de Nexus est la même partout : le site, l'application macOS et
//  l'application Windows affichent le MÊME code. Ce fichier est le seul
//  endroit qui sait qu'on tourne peut-être dans la coquille Windows, et qui
//  sait lui parler.
//
//  DEUX RÈGLES QUI ÉVITENT LES PANNES MUETTES :
//
//  1. Chaque fonction dit ce qu'elle ne peut pas faire. Dans un navigateur,
//     « ouvre Word » ne doit pas échouer en silence : il doit répondre
//     « ça, seule l'application Windows sait le faire ».
//  2. Les noms des commandes sont écrits UNE fois, ici, dans `COMMANDES`.
//     Une faute de frappe entre le Rust et cette liste ne se voit pas en
//     compilant — elle se voit à l'usage, sur la machine d'Aharon, six
//     semaines plus tard. Le banc `outils/windows.mts` compare cette liste au
//     code Rust et refuse la moindre différence.
// ============================================================================

import { isTauri } from "./tauri";

/// Les noms exacts des commandes de la coquille Rust. Un seul endroit.
export const COMMANDES = [
  // les fichiers
  "chercher_fichiers", "chercher_dans_contenu", "montrer_fichier", "ouvrir_fichier",
  // les applications et les fenêtres
  "lister_applications", "ouvrir_application", "lister_fenetres",
  "activer_fenetre", "fermer_application",
  // les automatisations
  "creer_script", "lister_scripts", "lancer_script", "supprimer_script", "montrer_scripts",
  // la machine
  "etat_machine", "changer_fond_ecran", "lire_presse_papiers",
  "ecrire_presse_papiers", "installer_logiciel",
  // l'écran
  "capturer_ecran", "taille_ecran",
  // Windows lui-même
  "regler_demarrage", "regler_protocole", "regler_menu_contextuel",
  "etat_integrations", "tout_brancher", "tout_debrancher",
  // la concentration
  "demarrer_concentration", "arreter_concentration",
  "etat_concentration", "distractions_ouvertes",
  // la fenêtre
  "fenetre_cacher", "fenetre_quitter", "argument_de_lancement",
] as const;

export type Commande = (typeof COMMANDES)[number];

// ═══════════════════════════ LA DÉMONSTRATION ═══════════════════════════
//
//  « ?pc=demo » affiche le panneau Windows AVEC des données plausibles, depuis
//  n'importe quel navigateur.
//
//  Ce n'est pas un gadget. Aharon n'a pas de PC sous Windows : sans ça, il ne
//  pourrait pas voir ce que j'ai fait, ni me dire ce qu'il en pense — il
//  devrait me croire sur parole, et il a déjà eu raison de ne pas le faire.
//  Moi non plus je ne peux pas lancer Windows : c'est aussi comme ça que je
//  vérifie que le panneau est beau et qu'aucun texte ne déborde.
//
//  La démonstration ne touche à RIEN : elle ne fait qu'inventer des réponses.
export const DEMO = (() => {
  try { return new URLSearchParams(location.search).get("pc") === "demo"; }
  catch { return false; }
})();

/// Ce que répond la démonstration, commande par commande.
const REPONSES_DEMO: Partial<Record<Commande, unknown>> = {
  etat_machine: {
    nom: "PC-D-AHARON", windows: "Microsoft Windows 11 Famille 10.0.26100",
    processeur: "AMD Ryzen 5 5600H with Radeon Graphics",
    memoire_go: 16, memoire_libre_go: 6.4,
    disque_go: 476.9, disque_libre_go: 148.2,
    batterie: 72, sur_secteur: false, reseau: true,
  },
  etat_integrations: { demarrage: true, protocole: true, menu_contextuel: false },
  etat_concentration: { en_cours: false, secondes_restantes: 0, applications: [] },
  distractions_ouvertes: ["Discord", "Steam", "Spotify"],
  lister_scripts: [
    { nom: "Ranger mon bureau", chemin: "…", quoi: "Trie les fichiers du Bureau par type dans des dossiers", code: "" },
    { nom: "Sauvegarder mes cours", chemin: "…", quoi: "Copie Documents\\Cours vers le disque externe", code: "" },
  ],
  lister_applications: [
    { nom: "Word", chemin: "…" }, { nom: "Excel", chemin: "…" },
    { nom: "Firefox", chemin: "…" }, { nom: "Discord", chemin: "…" },
  ],
  lister_fenetres: [
    { titre: "Devoir de maths — Word", app: "WINWORD", pid: 4210 },
    { titre: "Nexus", app: "nexus", pid: 8123 },
  ],
  chercher_fichiers: [
    { nom: "Devoir de maths.docx", chemin: "C:\\Users\\aharon\\Documents\\Devoir de maths.docx",
      taille: 24_576, modifie: "2026-09-06T18:20:00", dossier: false },
    { nom: "Exposé volcans.pdf", chemin: "C:\\Users\\aharon\\Downloads\\Exposé volcans.pdf",
      taille: 1_842_000, modifie: "2026-09-05T09:12:00", dossier: false },
  ],
};

/// Sommes-nous dans l'application Windows ?
///
/// On ne se fie pas au nom du système annoncé par le navigateur : une coquille
/// peut se présenter autrement, et un site ouvert sur un PC répondrait « oui »
/// à tort. La seule preuve valable, c'est que la coquille Tauri est là.
export function surWindows(): boolean {
  if (DEMO) return true;
  if (!isTauri()) return false;
  try {
    const p = (navigator as unknown as { userAgentData?: { platform?: string } })
      .userAgentData?.platform;
    if (p) return /win/i.test(p);
    return /Windows|Win32|Win64/i.test(navigator.userAgent);
  } catch { return false; }
}

/// L'erreur qu'on rend quand on n'est pas dans l'application. Elle NOMME ce
/// qui manque et où le trouver, au lieu de dire « indisponible ».
function horsApplication(quoi: string): Error {
  return new Error(
    `« ${quoi} » n'existe que dans l'application Nexus pour Windows — `
    + `un site n'a pas le droit de toucher à ton ordinateur. `
    + `Tu peux l'installer depuis la page « Nexus sur ton PC ».`,
  );
}

/// Appeler une commande de la coquille. C'est le seul endroit du site qui
/// importe `@tauri-apps/api`.
export async function demander<T>(commande: Commande, args: Record<string, unknown> = {}): Promise<T> {
  if (DEMO) {
    // Un peu d'attente : sans elle, on ne verrait jamais les états « en
    // cours », et l'on croirait qu'ils ne marchent pas.
    await new Promise((r) => setTimeout(r, 140));
    if (commande in REPONSES_DEMO) return REPONSES_DEMO[commande] as T;
    if (commande === "capturer_ecran") {
      throw new Error(
        "La démonstration ne capture pas l'écran : ça, seule la vraie "
        + "application Windows peut le faire.",
      );
    }
    throw new Error(
      `« ${commande} » ne fonctionne que dans la vraie application Windows. `
      + `Ici, c'est une démonstration : elle sert à voir l'écran, pas à agir.`,
    );
  }
  if (!isTauri()) throw horsApplication(commande);
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(commande, args);
}

/// Écouter un signal venu de la coquille (le raccourci global, le clic droit
/// de l'Explorateur, l'icône de la barre des tâches).
export async function ecouter(
  signal: "nexus://palette" | "nexus://loupe" | "nexus://concentration"
        | "nexus://argument" | "nexus://raccourci-refuse",
  quoiFaire: (donnee: unknown) => void,
): Promise<() => void> {
  if (!isTauri()) return () => {};
  const { listen } = await import("@tauri-apps/api/event");
  const arreter = await listen(signal, (e) => quoiFaire(e.payload));
  return arreter;
}

// ═══════════════════════════════ LES TYPES ═══════════════════════════════

export type FichierPC = {
  nom: string; chemin: string; taille: number; modifie: string; dossier: boolean;
};
export type AppPC = { nom: string; chemin: string };
export type FenetrePC = { titre: string; app: string; pid: number };
export type ScriptPC = { nom: string; chemin: string; quoi: string; code: string };
export type MachinePC = {
  nom: string; windows: string; processeur: string;
  memoire_go: number; memoire_libre_go: number;
  disque_go: number; disque_libre_go: number;
  batterie: number | null; sur_secteur: boolean; reseau: boolean;
};
export type CapturePC = { png: string; largeur: number; hauteur: number; texte: string };
export type IntegrationsPC = { demarrage: boolean; protocole: boolean; menu_contextuel: boolean };
export type SeancePC = { en_cours: boolean; secondes_restantes: number; applications: string[] };

// ══════════════════════════ LES CAPACITÉS, UNE À UNE ══════════════════════

export const pc = {
  // ── les fichiers ────────────────────────────────────────────────────────
  /// Cherche sur TOUT le disque, par l'index de Windows — le même que celui
  /// du menu Démarrer. Instantané, et sans aucune autorisation à donner.
  chercherFichiers: (nom: string, dossier?: string) =>
    demander<FichierPC[]>("chercher_fichiers", { nom, dossier }),

  /// Cherche DANS les documents. C'est ce que le site ne peut pas faire, et ce
  /// que macOS n'accorde qu'après un « Accès complet au disque ».
  chercherDansContenu: (texte: string) =>
    demander<FichierPC[]>("chercher_dans_contenu", { texte }),

  montrerFichier: (chemin: string) => demander<string>("montrer_fichier", { chemin }),
  ouvrirFichier: (chemin: string) => demander<string>("ouvrir_fichier", { chemin }),

  // ── les applications ────────────────────────────────────────────────────
  listerApplications: () => demander<AppPC[]>("lister_applications"),
  ouvrirApplication: (nom: string) => demander<string>("ouvrir_application", { nom }),
  listerFenetres: () => demander<FenetrePC[]>("lister_fenetres"),
  activerFenetre: (pid: number) => demander<string>("activer_fenetre", { pid }),
  fermerApplication: (pid: number) => demander<string>("fermer_application", { pid }),

  // ── les automatisations ─────────────────────────────────────────────────
  creerScript: (nom: string, code: string, quoi?: string) =>
    demander<ScriptPC>("creer_script", { nom, code, quoi }),
  listerScripts: () => demander<ScriptPC[]>("lister_scripts"),
  lancerScript: (nom: string) => demander<string>("lancer_script", { nom }),
  supprimerScript: (nom: string) => demander<string>("supprimer_script", { nom }),
  montrerScripts: () => demander<string>("montrer_scripts"),

  // ── la machine ──────────────────────────────────────────────────────────
  etatMachine: () => demander<MachinePC>("etat_machine"),
  changerFondEcran: (chemin: string) => demander<string>("changer_fond_ecran", { chemin }),
  lirePressePapiers: () => demander<string>("lire_presse_papiers"),
  ecrirePressePapiers: (texte: string) => demander<string>("ecrire_presse_papiers", { texte }),
  installerLogiciel: (nom: string) => demander<string>("installer_logiciel", { nom }),

  // ── l'écran ─────────────────────────────────────────────────────────────
  /// Capture, et LIT le texte avec la reconnaissance de Windows — hors ligne,
  /// exacte, accents compris. Le modèle reçoit donc le vrai texte, pas une
  /// image qu'il devinerait.
  capturerEcran: (zone?: { x: number; y: number; largeur: number; hauteur: number }, lire = true) =>
    demander<CapturePC>("capturer_ecran", { ...(zone ?? {}), lire }),
  tailleEcran: () =>
    demander<{ x: number; y: number; largeur: number; hauteur: number }>("taille_ecran"),

  // ── Windows lui-même ────────────────────────────────────────────────────
  reglerDemarrage: (actif: boolean) => demander<boolean>("regler_demarrage", { actif }),
  reglerProtocole: (actif: boolean) => demander<boolean>("regler_protocole", { actif }),
  reglerMenuContextuel: (actif: boolean) => demander<boolean>("regler_menu_contextuel", { actif }),
  etatIntegrations: () => demander<IntegrationsPC>("etat_integrations"),
  toutBrancher: () => demander<IntegrationsPC>("tout_brancher"),
  toutDebrancher: () => demander<IntegrationsPC>("tout_debrancher"),

  // ── la concentration ────────────────────────────────────────────────────
  demarrerConcentration: (minutes: number, applications: string[], silence = true) =>
    demander<SeancePC>("demarrer_concentration", { minutes, applications, silence }),
  arreterConcentration: () => demander<SeancePC>("arreter_concentration"),
  etatConcentration: () => demander<SeancePC>("etat_concentration"),
  distractionsOuvertes: () => demander<string[]>("distractions_ouvertes"),

  // ── la fenêtre ──────────────────────────────────────────────────────────
  cacher: () => demander<void>("fenetre_cacher"),
  quitter: () => demander<void>("fenetre_quitter"),
  argumentDeLancement: () => demander<[string, string] | null>("argument_de_lancement"),
};

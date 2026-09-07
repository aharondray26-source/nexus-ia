// ============================================================================
//  CE QUE LA MASCOTTE COMPREND, SUR WINDOWS
//
//  Aharon veut que l'application Windows soit « largement meilleure au niveau
//  des fonctions ». Des fonctions qu'il faut aller chercher dans un panneau ne
//  sont pas des fonctions : ce sont des réglages. Elles ne comptent que si on
//  peut les DEMANDER.
//
//  Ce fichier lit une phrase et dit ce qu'elle veut. Rien d'autre — il n'agit
//  pas, il ne parle à personne. C'est ce qui permet de le mettre à l'épreuve
//  sur cinquante phrases, en une seconde, sans Windows (`outils/intentions.mts`).
//
//  LES DEUX PIÈGES DU FRANÇAIS, DÉJÀ PAYÉS AILLEURS DANS NEXUS :
//
//  1. « \b » de JavaScript ne connaît que l'alphabet anglais. Devant « écris »
//     ou « à », il n'y a AUCUNE limite de mot à ses yeux. C'est ce qui avait
//     fait de « contrôle de maths » un « contrô maths », et empêché
//     « écris-moi une lettre » d'être reconnu. On pose donc nos propres
//     délimiteurs sur \p{L} — les lettres de toutes les langues.
//  2. Un mot-clé sans verbe n'est pas une demande. « c'est quoi VLC ? »
//     contient « VLC » ; ce n'est pas « installe VLC ». Chaque intention
//     exige un VERBE, et refuse les tournures interrogatives.
// ============================================================================

export type IntentionPC =
  | { quoi: "ouvrir_application"; nom: string }
  | { quoi: "installer_logiciel"; nom: string }
  | { quoi: "chercher_fichier"; terme: string }
  | { quoi: "chercher_contenu"; terme: string }
  | { quoi: "concentration"; minutes: number }
  | { quoi: "automatisation"; sujet: string };

const AVANT = "(?:^|[^\\p{L}\\p{N}])";
const APRES = "(?![\\p{L}\\p{N}])";

function contient(phrase: string, motifs: string): boolean {
  return new RegExp(AVANT + "(?:" + motifs + ")" + APRES, "u").test(phrase);
}

/// Ce qui suit un verbe, nettoyé de l'intendance. « ouvre-moi le logiciel
/// Word s'il te plaît » → « Word ».
///
/// ON N'ÉPLUCHE QUE LE DÉBUT, et c'est tout le sujet. Retirer ces mots PARTOUT
/// paraissait plus simple, mais « trouve mon devoir DE maths » devenait
/// « devoir maths », et « range MON bureau » devenait « range bureau ». Un
/// petit mot n'est de l'intendance qu'EN TÊTE ; au milieu, il appartient à la
/// phrase. C'est exactement l'erreur que j'avais déjà faite en lisant les
/// demandes de documents — deux fois la même, dans deux fichiers différents.
const INTENDANCE = new RegExp(
  "^(?:le|la|les|l'|un|une|des|du|de|d'|mon|ma|mes|ce|cette|ces|" +
    "application|appli|logiciel|programme|fichier|document|" +
    "s'?il|te|pla[îi]t|stp|steuplait|merci)$",
  "iu",
);

function apresLeVerbe(phrase: string, verbes: string, motsAvant = 3): string {
  const re = new RegExp(
    AVANT + "(?:" + verbes + ")" + "(?:[-\\s]*(?:moi|nous))?\\s+(.+)$",
    "iu",
  );
  const m = phrase.match(re);
  if (!m) return "";

  // UN ORDRE COMMENCE PAR SON VERBE.
  //
  // « trouve pourquoi mon ordinateur rame depuis ce matin quand je LANCE un
  // jeu » contient « lance » — au onzième mot. Sans cette règle, Nexus y
  // entendait « ouvre l'application Jeu » et répondait à côté. Personne ne dit
  // « ouvre » au milieu d'une phrase pour demander d'ouvrir quelque chose.
  const avant = phrase.slice(0, phrase.length - m[0].length + 1);
  if (avant.split(/\s+/).filter(Boolean).length > motsAvant) return "";

  const jetons = m[1].split(/([\s\-–—'’,.;:!?«»"]+)/u);
  let i = 0;
  while (i < jetons.length) {
    const mot = jetons[i];
    if (!mot) { i++; continue; }
    if (/^[\s\-–—'’,.;:!?«»"]+$/u.test(mot)) { i++; continue; }
    if (!INTENDANCE.test(mot)) break;
    jetons[i] = "";
    i++;
  }
  return jetons
    .join("")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s\-–—,.;:!?'"«»]+/u, "")
    // « s'il te plaît » traîne en fin de phrase, et c'est là qu'il est vraiment
    // de l'intendance.
    .replace(new RegExp("(?:s'?il te pla[îi]t|stp|steuplait|merci)\\s*$", "iu"), "")
    .replace(/[\s\-–—,.;:!?'"«»]+$/u, "")
    .trim();
}

const OUVRIR = "ouvre|ouvrir|lance|lancer|d[ée]marre|d[ée]marrer|ex[ée]cute";
const INSTALLER = "installe|installer|t[ée]l[ée]charge|t[ée]l[ée]charger";
const CHERCHER = "trouve|trouver|cherche|chercher|retrouve|retrouver|localise|o[uù] est";
const FABRIQUER =
  "fais|faire|cr[ée]e|cr[ée]er|[ée]cris|[ée]crire|fabrique|fabriquer|" +
  "pr[ée]pare|pr[ée]parer|g[ée]n[èe]re|g[ée]n[ée]rer|programme";

/// Une question n'est pas un ordre. « comment on installe VLC ? » demande une
/// explication, pas une installation — et se tromper là-dessus est le genre
/// d'erreur qui fait désinstaller un logiciel.
function estUneQuestion(bas: string): boolean {
  if (/[?]\s*$/.test(bas)) return true;
  return new RegExp(
    "^(?:c'?est|qu'?est|comment|pourquoi|est-ce|combien|qui|quoi|quel|quelle|" +
      "peux-tu m'expliquer|explique)" + APRES,
    "u",
  ).test(bas.trim());
}

/// « ouvre le document que je t'ai envoyé » n'est pas une demande d'ouvrir une
/// application nommée « que je t'ai envoyé ».
///
/// Un nom d'application est COURT et ne contient ni pronom ni verbe conjugué.
/// Sans cette barrière, « ouvre » — le verbe le plus courant de tous — attrape
/// une phrase sur deux et Nexus répond « aucune application nommée ainsi » à
/// des questions parfaitement normales.
function estUnNomDApplication(nom: string): boolean {
  if (nom.length < 2 || nom.length > 50) return false;
  const mots = nom.split(/\s+/).filter(Boolean);
  if (mots.length > 4) return false;
  const bavard = new RegExp(
    AVANT + "(?:que|qui|quoi|dont|o[uù]|je|tu|il|elle|on|nous|vous|ils|elles|" +
    "me|te|se|lui|leur|ai|as|a|avons|avez|ont|suis|es|est|sommes|[êe]tes|sont|" +
    "viens|vient|dit|dis|donn[ée]|envoy[ée]|hier|demain|maintenant|apr[èe]s|avant)" +
    APRES, "iu");
  return !bavard.test(" " + nom.toLowerCase() + " ");
}

export function comprendrePC(phrase: string): IntentionPC | null {
  const p = (phrase || "").trim();
  if (p.length < 4) return null;
  const bas = p.toLowerCase();
  if (estUneQuestion(bas)) return null;

  // ── le mode concentration ────────────────────────────────────────────────
  if (
    contient(bas, "concentration|concentrer|concentre") ||
    /\b(?:travaille|travailler|bosse|bosser|r[ée]vise|r[ée]viser)\s+(?:pendant\s+)?\d+\s*(?:min|minutes?|h|heures?)/u.test(bas)
  ) {
    const m = bas.match(/(\d+)\s*(min|minutes?|h|heures?)/u);
    let minutes = 45;
    if (m) {
      const n = Number(m[1]);
      minutes = /^h/.test(m[2]) ? n * 60 : n;
    }
    return { quoi: "concentration", minutes: Math.max(1, Math.min(480, minutes)) };
  }

  // ── une automatisation ───────────────────────────────────────────────────
  if (
    contient(bas, FABRIQUER) &&
    contient(bas, "automatisations?|automatiser|automatique|script|raccourcis?|macro")
  ) {
    // « fais une automatisation QUI range mon bureau » : on retire le mot
    // « automatisation » et le « qui » qui l'introduit, mais uniquement en
    // tête — sinon « qui » disparaît aussi du milieu de la phrase.
    const sujet = apresLeVerbe(p, FABRIQUER)
      .replace(
        new RegExp("^(?:automatisations?|scripts?|raccourcis?|macro)\\s*(?:qui|pour|de|d')?\\s*", "iu"),
        "",
      )
      .replace(/\s{2,}/g, " ")
      .trim();
    return { quoi: "automatisation", sujet: sujet || p };
  }

  // ── installer un logiciel ────────────────────────────────────────────────
  if (contient(bas, INSTALLER)) {
    const nom = apresLeVerbe(p, INSTALLER);
    if (nom.length >= 2 && nom.length <= 60) return { quoi: "installer_logiciel", nom };
  }

  // ── chercher DANS les documents ──────────────────────────────────────────
  // « quel fichier parle de la photosynthèse » est une question, donc déjà
  // écartée plus haut. Ici on ne prend que la forme impérative.
  if (
    contient(bas, CHERCHER) &&
    contient(bas, "dans mes documents|dans les documents|qui parle de|qui contient|contenant|contient")
  ) {
    const m = p.match(/(?:qui parle de|qui contient|contenant|contient|dans mes documents|dans les documents)\s*(.*)$/iu);
    const terme = (m?.[1] || "").replace(/^[\s\-,.:]+/u, "").trim();
    if (terme.length >= 3) return { quoi: "chercher_contenu", terme };
  }

  // ── chercher un fichier ──────────────────────────────────────────────────
  if (contient(bas, CHERCHER)) {
    const terme = apresLeVerbe(p, CHERCHER);
    // Un nom de fichier tient en quelques mots. « trouve pourquoi mon
    // ordinateur rame depuis ce matin » est une question, pas une recherche.
    if (terme.length >= 2 && terme.length <= 80
        && terme.split(/\s+/).filter(Boolean).length <= 6
        && !/\b(pourquoi|comment|est-ce)\b/i.test(terme)) {
      return { quoi: "chercher_fichier", terme };
    }
  }

  // ── ouvrir une application ───────────────────────────────────────────────
  // EN DERNIER, exprès : « ouvre » est le verbe le plus courant de tous, et il
  // sert aussi pour les espaces de Nexus (« ouvre la calculatrice »). Les
  // intentions plus précises passent avant.
  if (contient(bas, OUVRIR)) {
    const nom = apresLeVerbe(p, OUVRIR);
    if (estUnNomDApplication(nom)) return { quoi: "ouvrir_application", nom };
  }

  return null;
}

/// La consigne donnée au modèle pour qu'il écrive une automatisation. Les
/// mêmes interdits que le vérificateur du côté Rust — dits une deuxième fois,
/// parce qu'un modèle prévenu écrit mieux qu'un modèle corrigé.
export function consigneAutomatisation(sujet: string): string {
  return `Écris un script PowerShell qui fait ceci, sur Windows : ${sujet}

Règles absolues :
- Rends UNIQUEMENT le code, sans un mot autour, sans barrière de code.
- Court et lisible : dix à trente lignes, avec un commentaire en français par
  étape importante.
- INTERDIT : effacer en cascade (Remove-Item -Recurse à la racine, sur C:\\,
  sur le dossier utilisateur), formater un disque, toucher à l'antivirus,
  à bcdedit, aux comptes utilisateurs, ou aller chercher du code sur internet
  (Invoke-WebRequest, DownloadString, Invoke-Expression).
- Ne demande jamais les droits administrateur.
- Si tu déplaces ou supprimes des fichiers, fais-le dans un dossier PRÉCIS
  nommé explicitement, jamais sur tout le disque.
- Écris un message à la fin qui dit ce qui a été fait.`;
}

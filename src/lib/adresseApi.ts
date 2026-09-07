// ============================================================================
//  OÙ EST LE SERVEUR DE NEXUS
//
//  LE BUG QUE CE FICHIER CORRIGE, et il est gros : dans l'application (Windows
//  comme macOS), l'interface est servie depuis la machine elle-même. Quand
//  elle demandait « /api/gemini/chat », elle le demandait donc À ELLE-MÊME —
//  et il n'y a évidemment aucun serveur là. Résultat : Nexus concluait « il
//  n'y a pas de modèle en ligne » et se rabattait sur autre chose, alors que
//  le modèle hébergé avec le site marchait parfaitement.
//
//  Aucun message d'erreur, aucune trace : juste une application moins
//  intelligente que le site, sans qu'on sache pourquoi.
//
//  LA RÈGLE, ET ELLE SE DÉBROUILLE SEULE :
//    1. on essaie d'abord à côté de soi — c'est le cas normal, sur le site ;
//    2. si personne ne répond, on essaie le vrai site, en clair ;
//    3. on RETIENT lequel a marché, et on n'y revient plus.
//
//  Ainsi le même code marche sur le site, dans l'application Windows, dans
//  l'application macOS, et même si le site est un jour hébergé ailleurs — il
//  n'y a aucune adresse écrite en dur à changer à la main.
// ============================================================================

/// Le site public. C'est la seule adresse écrite en dur de tout Nexus, et
/// c'est celle qui figure déjà partout dans les modes d'emploi.
export const SITE_PUBLIC = "https://nexus-espace.netlify.app";

/// « à côté » = le serveur qui sert cette page. « loin » = le site public.
type Ou = "a-cote" | "loin";

let choisi: Ou | null = null;

/// L'adresse complète d'une adresse de l'API, selon ce qu'on a appris.
export function adresseApi(chemin: string, ou: Ou | null = choisi): string {
  const c = chemin.startsWith("/") ? chemin : "/" + chemin;
  return ou === "loin" ? SITE_PUBLIC + c : c;
}

/// Appeler l'API sans avoir à savoir où elle est.
///
/// Un appel qui échoue « à côté » est réessayé « loin », UNE fois. Ensuite on
/// se souvient : on ne perd pas un aller-retour à chaque message.
export async function appelerApi(
  chemin: string,
  options: RequestInit = {},
): Promise<Response> {
  const essais: Ou[] = choisi ? [choisi] : ["a-cote", "loin"];
  let derniere: unknown = null;

  for (const ou of essais) {
    try {
      const r = await fetch(adresseApi(chemin, ou), options);

      // 404 et 405 veulent dire « il n'y a pas de serveur ici », pas « erreur
      // du serveur ». C'est le cas d'un hébergement statique, et celui d'une
      // application qui se sert elle-même.
      if (r.status === 404 || r.status === 405) {
        derniere = new Error(`aucun serveur à cette adresse (${r.status})`);
        continue;
      }

      // ET LE PIÈGE QUE J'AI FAILLI LAISSER PASSER — trouvé en essayant pour
      // de vrai, pas en relisant : un site fait d'une seule page renvoie sa
      // PAGE D'ACCUEIL pour toute adresse inconnue, avec un beau 200. On
      // croyait donc avoir trouvé le serveur, et l'on recevait du HTML là où
      // l'on attendait du JSON. Il n'y a pas d'erreur : il y a juste des
      // réponses qui n'ont aucun sens.
      const sorte = r.headers.get("content-type") || "";
      if (!sorte.includes("json")) {
        derniere = new Error(
          "cette adresse ne rend pas du JSON : ce n'est pas le serveur de Nexus",
        );
        continue;
      }
      choisi = ou;
      return r;
    } catch (e) {
      derniere = e;
    }
  }
  throw derniere instanceof Error
    ? derniere
    : new Error("Le serveur de Nexus est injoignable.");
}

/// Pour les bancs et les réglages : où en est-on ?
export function ouEstLeServeur(): Ou | null {
  return choisi;
}

/// À n'utiliser que dans les bancs.
export function oublierLeServeur() {
  choisi = null;
}

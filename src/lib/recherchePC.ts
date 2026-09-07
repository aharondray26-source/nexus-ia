// ============================================================================
//  CE QUE LA BARRE DE COMMANDE TROUVE SUR LE PC
//
//  C'est la raison d'être de l'application Windows.
//
//  Windows n'a pas d'équivalent de Spotlight. Le menu Démarrer cherche, mais
//  il met une seconde et demie, il propose du web qu'on n'a pas demandé, et il
//  ne répond à aucune question. Nexus s'ouvre sur ALT + ESPACE, par-dessus le
//  jeu ou le cours en visio, et il trouve : un fichier, une application, une
//  fenêtre déjà ouverte, une automatisation — et il répond aussi.
//
//  DEUX PRÉCAUTIONS QUI FONT TOUTE LA DIFFÉRENCE À L'USAGE :
//
//  1. ON N'INTERROGE PAS LE DISQUE À CHAQUE LETTRE. On attend que la frappe
//     s'arrête. Sinon « document » lance huit recherches, et c'est la
//     septième qui arrive en dernier — on voit alors les résultats de
//     « documen » s'afficher après ceux de « document ».
//  2. UNE RÉPONSE PÉRIMÉE EST JETÉE. Chaque recherche porte un numéro ; si
//     un numéro plus récent est parti, l'ancienne réponse est ignorée. Sans
//     ça, la liste clignote et montre n'importe quoi.
// ============================================================================

import { pc, surWindows, type FichierPC, type AppPC, type FenetrePC } from "./pcWindows";

export type ResultatPC = {
  sorte: "fichier" | "application" | "fenetre" | "automatisation";
  titre: string;
  detail: string;
  /// Ce qu'on fait quand on le choisit.
  agir: () => Promise<unknown>;
};

/// Le dossier d'un chemin Windows, pour l'afficher sous le nom du fichier.
/// « C:\Users\aharon\Documents\devoir.docx » → « Documents ».
function dossierDe(chemin: string): string {
  const morceaux = chemin.split(/[\\/]/).filter(Boolean);
  return morceaux.length >= 2 ? morceaux[morceaux.length - 2] : chemin;
}

function taille(octets: number): string {
  if (!octets) return "";
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} Ko`;
  if (octets < 1024 * 1024 * 1024) return `${(octets / 1048576).toFixed(1)} Mo`;
  return `${(octets / 1073741824).toFixed(1)} Go`;
}

/// Une recherche complète sur le PC. Rend une liste courte et déjà classée :
/// ce qui est DÉJÀ OUVERT d'abord (y aller coûte un clic), puis les
/// applications, puis les fichiers.
export async function chercherSurLePC(question: string): Promise<ResultatPC[]> {
  if (!surWindows()) return [];
  const q = question.trim();
  if (q.length < 2) return [];
  const bas = q.toLowerCase();

  // Les quatre sources en parallèle : la plus lente donne le rythme, pas la
  // somme des quatre. Et chacune peut échouer sans emporter les autres —
  // l'index de Windows peut être éteint, ce n'est pas une raison pour ne plus
  // proposer les applications.
  const [fenetres, applications, fichiers, automatisations] = await Promise.all([
    pc.listerFenetres().catch(() => [] as FenetrePC[]),
    pc.listerApplications().catch(() => [] as AppPC[]),
    pc.chercherFichiers(q).catch(() => [] as FichierPC[]),
    pc.listerScripts().catch(() => []),
  ]);

  const out: ResultatPC[] = [];

  for (const f of fenetres) {
    if (!`${f.titre} ${f.app}`.toLowerCase().includes(bas)) continue;
    out.push({
      sorte: "fenetre",
      titre: f.titre.length > 64 ? f.titre.slice(0, 64) + "…" : f.titre,
      detail: `Déjà ouvert · ${f.app}`,
      agir: () => pc.activerFenetre(f.pid),
    });
    if (out.length >= 4) break;
  }

  const apps = applications
    .filter((a) => a.nom.toLowerCase().includes(bas))
    // Le nom le plus court d'abord : « Word » avant « Word Mobile Companion ».
    .sort((a, b) => a.nom.length - b.nom.length)
    .slice(0, 5);
  for (const a of apps) {
    out.push({
      sorte: "application",
      titre: a.nom,
      detail: "Application installée",
      agir: () => pc.ouvrirApplication(a.nom),
    });
  }

  for (const s of automatisations) {
    if (!s.nom.toLowerCase().includes(bas)) continue;
    out.push({
      sorte: "automatisation",
      titre: s.nom,
      detail: s.quoi || "Automatisation Nexus",
      agir: () => pc.lancerScript(s.nom),
    });
  }

  for (const f of fichiers.slice(0, 8)) {
    out.push({
      sorte: "fichier",
      titre: f.nom,
      detail: [dossierDe(f.chemin), f.dossier ? "dossier" : taille(f.taille)]
        .filter(Boolean)
        .join(" · "),
      agir: () => (f.dossier ? pc.montrerFichier(f.chemin) : pc.ouvrirFichier(f.chemin)),
    });
  }

  return out;
}

/// La version qui se laisse taper dessus : on attend que la frappe s'arrête,
/// et l'on jette toute réponse dépassée.
export function chercheurPC() {
  let numero = 0;
  let minuterie: number | undefined;

  return {
    chercher(question: string, quand: (r: ResultatPC[]) => void, attente = 180) {
      window.clearTimeout(minuterie);
      const mien = ++numero;
      if (!surWindows() || question.trim().length < 2) {
        quand([]);
        return;
      }
      minuterie = window.setTimeout(async () => {
        try {
          const r = await chercherSurLePC(question);
          if (mien === numero) quand(r);
        } catch {
          if (mien === numero) quand([]);
        }
      }, attente);
    },
    /// À appeler quand la barre se ferme : une recherche en vol ne doit pas
    /// venir remplir une liste qui n'est plus à l'écran.
    oublier() {
      window.clearTimeout(minuterie);
      numero++;
    },
  };
}

// Ce que l'extension (ou un lien) demande en ouvrant le site.
//
// Ce module est lu au CHARGEMENT, avant que quoi que ce soit ne touche a
// l'adresse. C'est essentiel : main.tsx nettoie la barre d'adresse tout de
// suite apres avoir traite la demande, si bien que les ecrans montes ensuite
// ne voyaient plus rien. La carte de bienvenue se posait alors devant l'espace
// demande, et le bouton « Notes » de l'extension semblait ne rien faire.
function lire(): Record<string, string> {
  try {
    const p = new URLSearchParams(window.location.search);
    return {
      app: (p.get("app") || "").trim(),
      note: (p.get("note") || "").trim(),
      tache: (p.get("tache") || "").trim(),
      ia: (p.get("ia") || "").trim(),
    };
  } catch {
    return { app: "", note: "", tache: "", ia: "" };
  }
}

export const arrivee = lire();

/// Vrai si on arrive avec une demande precise, quelle qu'elle soit.
export const vientDUnLien = () =>
  !!(arrivee.app || arrivee.note || arrivee.tache || arrivee.ia);

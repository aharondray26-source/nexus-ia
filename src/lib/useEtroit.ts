import { useCallback, useEffect, useRef, useState } from "react";

// « Cette zone est-elle trop étroite pour montrer plusieurs colonnes ? »
//
// Plusieurs espaces posent leurs panneaux côte à côte : l'historique du chat,
// les dossiers du courrier. Dans une fenêtre étroite — un téléphone, ou un
// espace qu'Aharon a rétréci — les panneaux se servaient les premiers et le
// CONTENU se retrouvait à zéro pixel de large. Le chat devenait proprement
// inutilisable, sans le moindre message d'erreur.
//
// On mesure APRÈS CHAQUE RENDU. `ResizeObserver` serait plus élégant, mais il
// ne se déclenche pas partout : dans un onglet qui ne peint pas, il reste muet
// et les panneaux ne se replient jamais. On le garde en plus, pour suivre un
// redimensionnement en direct, mais on ne DÉPEND pas de lui.
export function useEtroit<T extends HTMLElement>(seuil = 560) {
  const ref = useRef<T>(null);
  const [etroit, setEtroit] = useState(false);

  const mesurer = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const large = el.getBoundingClientRect().width;
    // Une largeur de 0 veut dire que la page n'est pas encore disposée : on ne
    // conclut rien, plutôt que de tout replier à tort.
    if (large > 0) setEtroit(large < seuil);
  }, [seuil]);

  useEffect(mesurer);

  useEffect(() => {
    const el = ref.current;
    window.addEventListener("resize", mesurer);
    let o: ResizeObserver | undefined;
    if (el && typeof ResizeObserver !== "undefined") {
      o = new ResizeObserver(mesurer);
      o.observe(el);
    }
    return () => {
      window.removeEventListener("resize", mesurer);
      o?.disconnect();
    };
  }, [mesurer]);

  return { ref, etroit };
}

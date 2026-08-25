import { useEffect, type RefObject } from "react";

// Comportement UNIFORME pour tous les panneaux du site : ils se ferment
// quand on clique a cote, et quand on appuie sur Echap.
// Avant, seul le menu Compte le faisait : c'etait une incoherence
// (on devait recliquer sur le bouton pour refermer les autres).
export function useDismiss(
  ref: RefObject<HTMLElement | null>,
  open: boolean,
  close: () => void
) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const el = ref.current;
      if (el && !el.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [ref, open, close]);
}

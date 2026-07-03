// Detecte le systeme du visiteur pour afficher les bons raccourcis clavier.
// La majorite des visiteurs sont sous Windows : leur montrer "⌘" les perdrait.
export function isMac(): boolean {
  if (typeof navigator === "undefined") return true;
  return /Mac|iPhone|iPad/.test(navigator.platform ?? navigator.userAgent);
}

// Etiquette du raccourci de recherche : "⌘K" sur Mac, "Ctrl K" ailleurs.
export function searchShortcutLabel(): string {
  return isMac() ? "⌘K" : "Ctrl K";
}

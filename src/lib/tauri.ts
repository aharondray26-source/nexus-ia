// Couche d'abstraction autour de l'environnement d'execution.
// L'app tourne dans deux contextes : un navigateur (dev) ou l'app de bureau Tauri.
// Ce module masque cette distinction au reste de l'interface.

/** Vrai uniquement lorsque le code s'execute dans la coquille native Tauri. */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/**
 * Demande a la coquille native d'ouvrir une URL dans une fenetre/webview dediee.
 * Dans le navigateur (dev), on retombe sur un simple window.open.
 *
 * Cote Rust, la commande `open_ai_window` (voir src-tauri/src/lib.rs) cree
 * une WebviewWindow chargee sur l'URL demandee, ce qui contourne le blocage
 * X-Frame-Options qui empeche d'embarquer ces sites dans une iframe.
 */
export async function openAiWindow(label: string, url: string): Promise<void> {
  if (isTauri()) {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("open_ai_window", { label, url });
    return;
  }
  // `window.open` peut être REFUSÉ sans rien dire : bloqueur de fenêtres,
  // navigateur strict, vue web intégrée. Le bouton a alors l'air cassé — c'est
  // exactement ce qu'Aharon décrivait sur Mistral.
  // Un vrai lien cliqué est traité comme une navigation demandée par la
  // personne, et passe là où `window.open` échoue.
  const fenetre = window.open(url, "_blank", "noopener,noreferrer");
  if (fenetre) return;
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

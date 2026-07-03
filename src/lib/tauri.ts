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
  window.open(url, "_blank", "noopener,noreferrer");
}

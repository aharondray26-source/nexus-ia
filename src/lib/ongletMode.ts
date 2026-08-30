// Le mode « nouvel onglet » de l'extension du navigateur.
//
// Quand Nexus remplace la page d'accueil du navigateur, il ne doit pas
// ressembler a un systeme d'exploitation : pas de barre laterale, pas de
// fenetres. Juste l'accueil, ses raccourcis, et une barre de recherche qui se
// comporte comme celle d'un navigateur — on tape, on cherche sur le web.
const actif = (() => {
  try {
    const p = new URLSearchParams(window.location.search);
    return p.get("onglet") === "1" || window.location.hash === "#onglet";
  } catch {
    return false;
  }
})();

export const estModeOnglet = () => actif;

/// Cherche sur le web, dans un nouvel onglet — comme le ferait le navigateur.
export function chercherSurLeWeb(texte: string) {
  const t = texte.trim();
  if (!t) return;
  // Une adresse tapee telle quelle : on y va directement.
  const ressembleAUneAdresse = /^(https?:\/\/|www\.)/i.test(t) ||
    /^[\w-]+\.(fr|com|net|org|io|app|dev|edu|gouv\.fr)(\/|$)/i.test(t);
  const url = ressembleAUneAdresse
    ? (t.startsWith("http") ? t : "https://" + t)
    : "https://www.google.com/search?q=" + encodeURIComponent(t);
  window.open(url, "_blank", "noopener,noreferrer");
}

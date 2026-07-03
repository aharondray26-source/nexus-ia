import { useEffect, useState } from "react";
import { useWindows } from "./useWindows";
import { useSettings } from "./useSettings";
import Logo from "./Logo";
import { searchShortcutLabel } from "../lib/platform";

// Barre superieure : identite a gauche (clic = retour a l'accueil), recherche
// au centre, controle des fenetres et heure a droite. Le bouton "Tout fermer"
// n'apparait que lorsqu'il devient utile (2 fenetres ou plus).
export default function TopBar() {
  const [now, setNow] = useState(new Date());
  const togglePalette = useWindows((s) => s.togglePalette);
  const windows = useWindows((s) => s.windows);
  const closeAll = useWindows((s) => s.closeAll);
  const minimizeAll = useWindows((s) => s.minimizeAll);
  const openApp = useWindows((s) => s.openApp);
  const userName = useSettings((s) => s.userName);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const openCount = windows.filter((w) => !w.minimized).length;

  return (
    <header className="z-40 flex h-11 shrink-0 items-center justify-between border-b border-nexus-border bg-nexus-panel/60 px-4 backdrop-blur-[var(--glass-blur)]">
      <button
        onClick={minimizeAll}
        title="Revenir a l'accueil (rien n'est ferme)"
        className="flex max-w-[36vw] items-center gap-2 truncate text-sm font-medium tracking-tight text-nexus-text transition-opacity hover:opacity-80 sm:max-w-none"
      >
        <Logo size={18} />
        {userName ? `Bonjour, ${userName}` : "Nexus"}
      </button>

      <button
        onClick={togglePalette}
        className="flex items-center gap-2 rounded-lg border border-nexus-border px-3 py-1.5 text-xs text-nexus-muted transition-colors hover:text-nexus-text"
      >
        Rechercher un espace
        <kbd className="kbd-hint rounded border border-nexus-border px-1.5 py-0.5 text-[10px]">
          {searchShortcutLabel()}
        </kbd>
      </button>

      <div className="flex items-center gap-3">
        {openCount >= 2 && (
          <button
            onClick={closeAll}
            title="Fermer toutes les fenetres"
            className="nexus-fade-in rounded-md border border-nexus-border px-2.5 py-1 text-[11px] text-nexus-muted transition-colors hover:border-red-400/40 hover:text-red-400"
          >
            Tout fermer
          </button>
        )}
        <button
          onClick={() => openApp("clock", { width: 380, height: 440 })}
          title="Ouvrir l'horloge"
          className="text-xs tabular-nums text-nexus-muted transition-colors hover:text-nexus-text"
        >
          {now.toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </button>
      </div>
    </header>
  );
}

import { useEffect, useState } from "react";
import { Sun, Moon, Cloud, Mail, MessageSquare, Package } from "lucide-react";
import { useWindows } from "./useWindows";
import { useSettings } from "./useSettings";
import Logo from "./Logo";
import { searchShortcutLabel } from "../lib/platform";
import DynamicIsland from "./DynamicIsland";
import QuickCapture from "./QuickCapture";
import AccountMenu from "./AccountMenu";

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
  const theme = useSettings((s) => s.theme);
  const setTheme = useSettings((s) => s.setTheme);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const openCount = windows.filter((w) => !w.minimized).length;

  return (
    <header className="z-[999999] relative flex h-11 shrink-0 items-center justify-between overflow-visible border-b border-nexus-border bg-nexus-panel/80 px-2 sm:px-4 backdrop-blur-[var(--glass-blur)]">
      <button
        onClick={minimizeAll}
        title="Revenir à l'accueil (rien n'est fermé)"
        className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium tracking-tight text-nexus-text transition-opacity hover:opacity-80 shrink-0 pr-1"
      >
        <Logo size={18} />
        <span className="hidden sm:inline truncate max-w-[140px]">
          {userName ? `Bonjour, ${userName}` : "Nexus"}
        </span>
        <span className="sm:hidden font-bold text-xs text-cyan-300">Nexus</span>
      </button>

      {/* L'ilot fait partie de la rangee : il pousse les boutons au lieu de les couvrir. */}
      <div className="relative mx-2 flex min-w-0 flex-1 items-center justify-center overflow-visible">
        <DynamicIsland />
      </div>

      {/* Pas d'overflow ici : sinon les menus deroulants (Compte, capture rapide)
          se retrouvent COUPES par le bord de la barre. */}
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
        <button
          onClick={() => openApp("mail", { width: 840, height: 600 })}
          title="Ouvrir Boîte Mail & Gmail"
          className="nx-btn nx-btn-secondary flex items-center gap-1.5 text-xs"
        >
          <Mail size={14} className="text-amber-400" />
          <span className="hidden xl:inline text-[11px] font-semibold">Mail</span>
        </button>

        <button
          onClick={() => openApp("messages", { width: 820, height: 580 })}
          title="Ouvrir la Messagerie Instantanée"
          className="nx-btn nx-btn-secondary flex items-center gap-1.5 text-[11px]"
        >
          <MessageSquare size={14} className="text-cyan-400" />
          <span className="hidden xl:inline text-[11px]">Message</span>
        </button>

        <button
          onClick={() => openApp("cloud", { width: 780, height: 580 })}
          title="Ouvrir Nexus Cloud & Google Drive"
          className="nx-btn nx-btn-secondary flex items-center gap-1.5 text-[11px]"
        >
          <Cloud size={14} className="text-cyan-400" />
          <span className="hidden xl:inline text-[11px] font-semibold">Cloud</span>
        </button>

        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title={theme === "dark" ? "Passer en Mode Clair (Lumineux)" : "Passer en Mode Sombre (Nuit)"}
          className="nx-btn nx-btn-secondary flex items-center gap-1.5 text-[11px]"
        >
          {theme === "dark" ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Clair</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Sombre</span>
            </>
          )}
        </button>

        <a
          href="https://github.com/aharondray26-source/nexus-ia"
          target="_blank"
          rel="noopener noreferrer"
          className="nx-btn nx-btn-secondary flex items-center gap-1.5 text-[11px]"
          title="Voir le code source du projet (open source)"
        >
          <Package size={14} className="text-cyan-400" />
          <span className="hidden md:inline">Code source</span>
        </a>

        <AccountMenu />
        <QuickCapture />
        <button
          onClick={togglePalette}
          className="nx-btn nx-btn-secondary hidden md:flex items-center gap-2 text-xs"
        >
          <span className="opacity-70">Rechercher</span>
          <kbd className="kbd-hint rounded border border-nexus-border px-1.5 py-0.5 text-[10px]">
            {searchShortcutLabel()}
          </kbd>
        </button>
        {openCount >= 2 && (
          <button
            onClick={closeAll}
            title="Fermer toutes les fenetres"
            className="nx-btn nx-btn-danger sm:px-2.5 sm:py-1 text-[10px] sm:text-[11px]"
          >
            Fermer tout
          </button>
        )}
        <button
          onClick={() => openApp("clock", { width: 380, height: 440 })}
          title="Ouvrir l'horloge"
          className="text-[11px] sm:text-xs tabular-nums text-nexus-muted transition-colors hover:text-nexus-text px-1"
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

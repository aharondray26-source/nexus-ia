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
    <header className="z-[999999] relative flex h-11 shrink-0 items-center justify-between border-b border-nexus-border bg-nexus-panel/80 px-2 sm:px-4 backdrop-blur-[var(--glass-blur)]">
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

      <div className="absolute left-1/2 top-1.5 -translate-x-1/2 flex items-center justify-center z-[999999] pointer-events-auto">
        <DynamicIsland />
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2.5 ml-auto shrink-0">
        <button
          onClick={() => openApp("mail", { width: 840, height: 600 })}
          title="Ouvrir Boîte Mail & Gmail"
          className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-300 hover:bg-amber-500/20 transition-all"
        >
          <Mail size={14} className="text-amber-400" />
          <span className="hidden xl:inline text-[11px] font-semibold">Mail</span>
        </button>

        <button
          onClick={() => openApp("messages", { width: 820, height: 580 })}
          title="Ouvrir la Messagerie Instantanée"
          className="flex items-center gap-1.5 rounded-lg border border-cyan-500/25 bg-cyan-500/[0.08] px-2 py-1 text-[11px] text-cyan-300 transition-colors hover:bg-cyan-500/15"
        >
          <MessageSquare size={14} className="text-cyan-400" />
          <span className="hidden xl:inline text-[11px]">Message</span>
        </button>

        <button
          onClick={() => openApp("cloud", { width: 780, height: 580 })}
          title="Ouvrir Nexus Cloud & Google Drive"
          className="flex items-center gap-1.5 rounded-lg border border-cyan-500/25 bg-cyan-500/[0.08] px-2 py-1 text-[11px] text-cyan-300 transition-colors hover:bg-cyan-500/15"
        >
          <Cloud size={14} className="text-cyan-400" />
          <span className="hidden xl:inline text-[11px] font-semibold">Cloud</span>
        </button>

        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title={theme === "dark" ? "Passer en Mode Clair (Lumineux)" : "Passer en Mode Sombre (Nuit)"}
          className="flex items-center gap-1.5 rounded-lg border border-nexus-border bg-transparent px-2 py-1 text-[11px] text-nexus-muted transition-colors hover:border-white/20 hover:text-nexus-text"
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
          className="flex items-center gap-1.5 rounded-lg border border-nexus-border bg-transparent px-2 py-1 text-[11px] text-nexus-muted transition-colors hover:border-white/20 hover:text-nexus-text"
          title="Voir le code source du projet (open source)"
        >
          <Package size={14} className="text-cyan-400" />
          <span className="hidden md:inline">Code source</span>
        </a>

        <AccountMenu />
        <QuickCapture />
        <button
          onClick={togglePalette}
          className="hidden md:flex items-center gap-2 rounded-lg border border-nexus-border px-3 py-1 text-xs text-nexus-muted transition-colors hover:text-nexus-text"
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
            className="nexus-fade-in rounded-md border border-nexus-border px-1.5 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-[11px] text-nexus-muted transition-colors hover:border-red-400/40 hover:text-red-400"
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

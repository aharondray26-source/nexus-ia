import { useEffect, useState } from "react";
import { Sun, Moon, Cloud, Mail, MessageSquare, Package, X } from "lucide-react";
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
        {/* Les trois raccourcis vivent dans UN seul groupe segmente. En trois
            pastilles separees avec leur libelle, ils prenaient a eux seuls la
            moitie de la barre et noyaient le reste. */}
        <div className="flex items-center gap-0.5 rounded-xl border border-nexus-border bg-nexus-card/60 p-0.5">
          {([
            ["mail", Mail, "text-amber-400", "Boîte Mail & Gmail", { width: 840, height: 600 }],
            ["messages", MessageSquare, "text-cyan-400", "Messagerie instantanée", { width: 820, height: 580 }],
            ["cloud", Cloud, "text-sky-400", "Nexus Cloud & Google Drive", { width: 780, height: 580 }],
          ] as const).map(([id, Icone, couleur, titre, taille]) => (
            <button
              key={id}
              onClick={() => openApp(id, taille)}
              title={titre}
              aria-label={titre}
              className="flex h-7 w-7 items-center justify-center rounded-[9px] text-nexus-muted transition-colors hover:bg-nexus-panel hover:text-nexus-text"
            >
              <Icone size={14} className={couleur} />
            </button>
          ))}
        </div>

        <span className="h-4 w-px bg-nexus-border" aria-hidden="true" />

        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title={theme === "dark" ? "Passer en clair" : "Passer en sombre"}
          aria-label={theme === "dark" ? "Passer en clair" : "Passer en sombre"}
          className="flex h-7 w-7 items-center justify-center rounded-[9px] text-nexus-muted transition-colors hover:bg-nexus-card hover:text-nexus-text"
        >
          {theme === "dark"
            ? <Sun className="h-3.5 w-3.5 text-amber-400" />
            : <Moon className="h-3.5 w-3.5 text-indigo-400" />}
        </button>

        <a
          href="https://github.com/aharondray26-source/nexus-ia"
          target="_blank"
          rel="noopener noreferrer"
          title="Voir le code source du projet"
          aria-label="Voir le code source du projet"
          className="hidden h-7 w-7 items-center justify-center rounded-[9px] text-nexus-muted transition-colors hover:bg-nexus-card hover:text-nexus-text sm:flex"
        >
          <Package size={14} />
        </a>

        <span className="h-4 w-px bg-nexus-border" aria-hidden="true" />

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
            title="Fermer toutes les fenêtres"
            aria-label="Fermer toutes les fenêtres"
            className="nx-btn nx-btn-danger px-2 py-1 sm:px-2.5 text-[10px] sm:text-[11px]"
          >
            {/* Sur telephone, le libelle a lui seul faisait deborder la barre :
                « Fermer tout » se retrouvait tranche au bord de l'ecran. La
                croix dit la meme chose et tient. */}
            <X size={13} className="sm:hidden" />
            <span className="hidden sm:inline">Fermer tout</span>
          </button>
        )}
        <button
          onClick={() => openApp("clock", { width: 380, height: 440 })}
          title="Ouvrir l'horloge"
          // Un telephone affiche deja l'heure dans sa propre barre d'etat :
          // la redire ici ne servait qu'a faire deborder la notre.
          className="hidden sm:block text-[11px] sm:text-xs tabular-nums text-nexus-muted transition-colors hover:text-nexus-text px-1"
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

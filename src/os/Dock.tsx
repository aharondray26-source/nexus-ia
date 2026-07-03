import { APPS } from "./appsRegistry";
import { useWindows } from "./useWindows";
import Icon from "./Icons";
import Logo from "./Logo";
import { useSettings } from "./useSettings";

// La barre laterale : fine au repos, elle s'ouvre au survol pour reveler le nom
// de chaque espace (comportement familier, demande par l'utilisateur).
export default function Dock({ horizontal = false }: { horizontal?: boolean }) {
  const openApp = useWindows((s) => s.openApp);
  const windows = useWindows((s) => s.windows);
  const iconColors = useSettings((s) => s.iconColors);

  // Barre horizontale (haut/bas) : icones seules, defilement au doigt.
  if (horizontal) {
    return (
      <nav className="z-40 flex shrink-0 gap-1 overflow-x-auto border-t border-nexus-border bg-nexus-panel/80 px-2 py-1.5 backdrop-blur-[var(--glass-blur)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {APPS.filter((a) => !a.hidden).map((app) => {
          const isOpen = windows.some((w) => w.appId === app.id);
          return (
            <button
              key={app.id}
              onClick={() =>
                openApp(app.id, { width: app.width, height: app.height })
              }
              aria-label={app.title}
              style={
                isOpen ? { borderColor: "var(--accent)" } : undefined
              }
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
                isOpen ? "bg-white/[0.06]" : "border-transparent"
              }`}
            >
              <span
                className="text-nexus-muted"
                style={iconColors ? { color: app.hue, opacity: 0.9 } : undefined}
              >
                <Icon name={app.icon} size={22} />
              </span>
            </button>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="group/dock z-40 flex h-full w-16 shrink-0 flex-col gap-1 overflow-y-auto overflow-x-hidden border-r border-nexus-border bg-nexus-panel/60 py-4 backdrop-blur-[var(--glass-blur)] transition-[width] duration-300 ease-out [scrollbar-width:none] [&::-webkit-scrollbar]:hidden hover:w-52">
      <div className="mb-3 flex items-center gap-3 px-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center text-nexus-muted">
          <Logo size={24} />
        </div>
        <span className="whitespace-nowrap text-sm font-medium text-nexus-text opacity-0 transition-opacity duration-200 group-hover/dock:opacity-100">
          Nexus
        </span>
      </div>

      {APPS.filter((a) => !a.hidden).map((app) => {
        const isOpen = windows.some((w) => w.appId === app.id);
        return (
          <button
            key={app.id}
            onClick={() =>
              openApp(app.id, { width: app.width, height: app.height })
            }
            style={
              isOpen
                ? {
                    borderColor: "var(--accent)",
                    boxShadow: "0 0 12px -4px var(--accent)",
                  }
                : undefined
            }
            className={`mx-2 flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all duration-200 ${
              isOpen
                ? "bg-white/[0.06] text-nexus-text"
                : "border-transparent text-nexus-muted hover:bg-white/[0.03] hover:text-nexus-text"
            }`}
          >
            <span
              className="shrink-0 transition-opacity"
              style={
                iconColors
                  ? { color: app.hue, opacity: isOpen ? 1 : 0.8 }
                  : undefined
              }
            >
              <Icon name={app.icon} size={20} />
            </span>
            <span className="whitespace-nowrap text-sm opacity-0 transition-opacity duration-200 group-hover/dock:opacity-100">
              {app.title}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

import { useState } from "react";
import { APPS } from "./appsRegistry";
import { useWindows } from "./useWindows";
import Icon from "./Icons";
import Logo from "./Logo";
import { useSettings } from "./useSettings";

export default function Dock({ horizontal = false, pos = "left" }: { horizontal?: boolean; pos?: "left" | "right" | "top" | "bottom" }) {
  const openApp = useWindows((s) => s.openApp);
  const windows = useWindows((s) => s.windows);
  const iconColors = useSettings((s) => s.iconColors);
  const [isHovered, setIsHovered] = useState(false);

  // Horizontal bar for smaller mobile viewports
  if (horizontal) {
    return (
      <nav className={`nx-dock nx-dock-magnify ${pos === "top" ? "nx-dock-float-top" : "nx-dock-float-bottom"} z-40 flex shrink-0 items-center justify-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}>
        {APPS.filter((a) => !a.hidden).map((app) => {
          const isOpen = windows.some((w) => w.appId === app.id);
          return (
            <button
              key={app.id}
              onClick={() => openApp(app.id, { width: app.width, height: app.height })}
              aria-label={app.title}
              className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition-all active:scale-95 ${
                isOpen
                  ? "border-cyan-400/50 bg-cyan-500/15 shadow-lg shadow-cyan-500/10"
                  : "border-transparent hover:bg-nexus-card"
              }`}
            >
              <span style={iconColors ? { color: app.hue } : undefined} className="text-nexus-text">
                <Icon name={app.icon} size={22} />
              </span>
              {isOpen && (
                <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-sm" />
              )}
            </button>
          );
        })}
      </nav>
    );
  }

  // Vertical Apple Glass Floating Sidebar with smooth hover expansion
  return (
    <div className="relative z-40 flex h-full w-16 shrink-0 flex-col">
      <nav 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`nx-dock ${pos === "right" ? "nx-dock-float-right right-0" : "nx-dock-float-left left-0"} ${isHovered ? "" : "nx-dock-magnify"} absolute top-0 flex h-[calc(100%-20px)] flex-col gap-1.5 overflow-y-auto overflow-x-hidden py-3 transition-all duration-[320ms] [transition-timing-function:var(--ressort)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden z-50 ${isHovered ? 'w-60' : 'w-16'}`}
      >
        {/* OS Brand Header */}
        <div className={`mb-3 flex items-center ${isHovered ? "w-60 gap-3.5 px-3.5" : "w-full justify-center px-0"}`}>
          <div className={`flex shrink-0 items-center justify-center rounded-2xl border border-nexus-border bg-nexus-card shadow-inner ${isHovered ? "h-9 w-9" : "h-8 w-8"}`}>
            <Logo size={22} />
          </div>
          <div className={`flex-col whitespace-nowrap transition-opacity duration-[320ms] [transition-timing-function:var(--doux)] pointer-events-none ${isHovered ? 'flex opacity-100' : 'hidden'}`}>
            {/* « NEXUS PRO OS / Workspace Pro » : du jargon anglais au milieu
                d'un produit entierement en francais. On dit ce que c'est. */}
            <span className="text-xs font-bold text-nexus-text tracking-wide">Nexus</span>
            <span className="text-[10px] font-semibold" style={{ color: "var(--accent)" }}>
              Tes espaces
            </span>
          </div>
        </div>

        <div className="my-1.5 h-px w-full bg-nexus-border shrink-0" />

        {/* App List
            La liste etait un simple bloc : les boutons de 44 px se posaient a
            GAUCHE d'une barre de 64 px, avec vingt pixels de vide a droite. Ils
            avaient l'air de vouloir sortir de la barre. Une colonne centree
            quand elle est fermee, alignee a gauche quand elle s'ouvre. */}
        <div className={`flex-1 space-y-1 flex flex-col ${isHovered ? "items-start" : "items-center"}`}>
          {APPS.filter((a) => !a.hidden).map((app) => {
            const isOpen = windows.some((w) => w.appId === app.id);
            return (
              <button
                key={app.id}
                onClick={() => openApp(app.id, { width: app.width, height: app.height })}
                title={isHovered ? "" : app.title}
                className={`group/btn relative flex items-center rounded-2xl border transition-all duration-[220ms] [transition-timing-function:var(--appui)] active:scale-95 ${
                  isHovered
                    ? "w-52 shrink-0 gap-3.5 justify-start px-3 py-2.5 ml-2"
                    : "h-11 w-11 shrink-0 justify-center gap-0 px-0 py-0"
                } ${
                  isOpen
                    ? "border-cyan-400/50 bg-cyan-500/15 text-nexus-text shadow-lg shadow-cyan-500/10 font-semibold"
                    : "border-transparent text-nexus-muted hover:border-nexus-border hover:bg-nexus-card hover:text-nexus-text"
                }`}
              >
                {/* Le point qui dit « cet espace est ouvert ».
                    Il etait toujours a 6 px du bord GAUCHE, a l'interieur du
                    bouton. Barre fermee, le bouton fait 44 px et l'icone est au
                    milieu : le point tombait donc DESSUS. Il passe sous l'icone
                    quand la barre est fermee — comme le fait le Dock de macOS —
                    et redevient une barre a gauche quand elle s'ouvre, la ou il
                    y a la place. */}
                {isOpen && (
                  isHovered
                    ? <span className="absolute left-1.5 h-2.5 w-1 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400" />
                    : <span className="absolute bottom-[3px] left-1/2 -translate-x-1/2 h-1 w-1.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400" />
                )}

                <span
                  className="shrink-0 transition-transform duration-[260ms] [transition-timing-function:var(--appui)] group-hover/btn:scale-110 text-nexus-text"
                  style={iconColors ? { color: app.hue } : undefined}
                >
                  <Icon name={app.icon} size={20} />
                </span>

                <span className={`whitespace-nowrap text-xs font-medium transition-opacity duration-[320ms] [transition-timing-function:var(--doux)] truncate text-nexus-text ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                  {app.title}
                </span>

                {/* Floating Tooltip when Dock is collapsed */}
                {!isHovered && (
                  <div className="pointer-events-none absolute left-14 z-50 rounded-xl border border-nexus-border bg-nexus-panel px-2.5 py-1 text-[11px] font-semibold text-nexus-text shadow-2xl backdrop-blur-xl opacity-0 -translate-x-2 transition-all duration-[220ms] [transition-timing-function:var(--appui)] group-hover/btn:opacity-100 group-hover/btn:translate-x-0 whitespace-nowrap">
                    {app.title}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

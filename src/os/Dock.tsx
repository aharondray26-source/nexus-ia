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
      <nav className="z-40 flex shrink-0 gap-1.5 overflow-x-auto border-t border-nexus-border bg-nexus-panel px-3 py-2 backdrop-blur-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden shadow-2xl">
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
        className={`absolute top-0 ${pos === "right" ? "right-0" : "left-0"} flex h-full flex-col gap-1.5 overflow-y-auto overflow-x-hidden border-r border-nexus-border bg-nexus-panel py-4 backdrop-blur-3xl transition-all duration-300 ease-out [scrollbar-width:none] [&::-webkit-scrollbar]:hidden shadow-2xl z-50 ${isHovered ? 'w-60' : 'w-16'}`}
      >
        {/* OS Brand Header */}
        <div className="mb-3 flex items-center gap-3.5 px-3.5 w-60">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-nexus-card border border-nexus-border shadow-inner">
            <Logo size={22} />
          </div>
          <div className={`flex flex-col whitespace-nowrap transition-opacity duration-300 pointer-events-none ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
            <span className="text-xs font-bold text-nexus-text tracking-wider">NEXUS PRO OS</span>
            <span className="text-[10px] text-cyan-400 font-semibold">Workspace Pro</span>
          </div>
        </div>

        <div className="my-1.5 h-px w-full bg-nexus-border shrink-0" />

        {/* App List */}
        <div className="flex-1 space-y-1">
          {APPS.filter((a) => !a.hidden).map((app) => {
            const isOpen = windows.some((w) => w.appId === app.id);
            return (
              <button
                key={app.id}
                onClick={() => openApp(app.id, { width: app.width, height: app.height })}
                title={isHovered ? "" : app.title}
                className={`group/btn relative mx-2 flex w-52 items-center gap-3.5 rounded-2xl border px-3 py-2.5 transition-all duration-200 active:scale-95 ${
                  isOpen
                    ? "border-cyan-400/50 bg-cyan-500/15 text-nexus-text shadow-lg shadow-cyan-500/10 font-semibold"
                    : "border-transparent text-nexus-muted hover:border-nexus-border hover:bg-nexus-card hover:text-nexus-text"
                }`}
              >
                {/* Active Indicator */}
                {isOpen && (
                  <span className="absolute left-1.5 h-2.5 w-1 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400" />
                )}

                <span
                  className="shrink-0 transition-transform duration-200 group-hover/btn:scale-110 text-nexus-text"
                  style={iconColors ? { color: app.hue } : undefined}
                >
                  <Icon name={app.icon} size={20} />
                </span>

                <span className={`whitespace-nowrap text-xs font-medium transition-opacity duration-300 truncate text-nexus-text ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                  {app.title}
                </span>

                {/* Floating Tooltip when Dock is collapsed */}
                {!isHovered && (
                  <div className="pointer-events-none absolute left-14 z-50 rounded-xl border border-nexus-border bg-nexus-panel px-2.5 py-1 text-[11px] font-semibold text-nexus-text shadow-2xl backdrop-blur-xl opacity-0 -translate-x-2 transition-all duration-200 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 whitespace-nowrap">
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

import React, { useRef, useState, type ReactNode } from "react";
import { useWindows, type OpenWindow } from "./useWindows";
import { useIsMobile } from "../lib/useIsMobile";

interface WindowProps {
  key?: React.Key;
  win: OpenWindow;
  title: string;
  hue?: string;
  children: ReactNode;
}

type Dir = "e" | "s" | "se";

// Bouton de controle facon macOS : pastille de couleur toujours visible, symbole
// revele au survol du groupe. DEFINI AU NIVEAU DU MODULE (et non dans Window) :
// sinon React le recreerait a chaque rendu et le clic serait perdu.
function Control({
  color,
  symbol,
  onClick,
  label,
}: {
  color: string;
  symbol: string;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={label}
      className="flex h-4 w-4 sm:h-3.5 sm:w-3.5 items-center justify-center rounded-full text-[9px] sm:text-[8px] font-extrabold text-black/80 sm:text-black/60 transition-opacity active:scale-95"
      style={{ backgroundColor: color }}
    >
      <span className="opacity-100 sm:opacity-0 transition-opacity group-hover/ctrl:opacity-100">
        {symbol}
      </span>
    </button>
  );
}

// Une fenetre deplacable, redimensionnable par les bords, et qui peut passer
// en plein espace. Les boutons de controle sont toujours visibles.
export default function Window({ win, title, hue, children }: WindowProps) {
  const focusWindow = useWindows((s) => s.focusWindow);
  const closeWindow = useWindows((s) => s.closeWindow);
  const moveWindow = useWindows((s) => s.moveWindow);
  const resizeWindow = useWindows((s) => s.resizeWindow);
  const setBounds = useWindows((s) => s.setBounds);
  const toggleMinimize = useWindows((s) => s.toggleMinimize);
  const isAutoOrganized = useWindows((s) => s.isAutoOrganized);
  const toggleAutoOrganize = useWindows((s) => s.toggleAutoOrganize);

  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const resize = useRef<Dir | null>(null);
  const prev = useRef<{ x: number; y: number; width: number; height: number } | null>(
    null
  );
  const [maximized, setMaximized] = useState(false);
  const [closing, setClosing] = useState(false);
  const isMobile = useIsMobile();

  // Fermeture animee : contraction + fondu, puis retrait reel.
  function animatedClose() {
    setClosing(true);
    window.setTimeout(() => closeWindow(win.id), 260);
  }

  function onTitlePointerDown(e: React.PointerEvent) {
    if (maximized || isMobile) { focusWindow(win.id); return; }
    focusWindow(win.id);
    drag.current = { dx: e.clientX - win.x, dy: e.clientY - win.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onTitlePointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    // Bornes : la fenetre reste toujours attrapable (jamais perdue hors ecran).
    const maxX = window.innerWidth - 64 - 120;
    const maxY = window.innerHeight - 44 - 60;
    moveWindow(
      win.id,
      Math.min(maxX, Math.max(0, e.clientX - drag.current.dx)),
      Math.min(maxY, Math.max(0, e.clientY - drag.current.dy))
    );
  }

  function startResize(dir: Dir) {
    return (e: React.PointerEvent) => {
      e.stopPropagation();
      focusWindow(win.id);
      resize.current = dir;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };
  }
  function onResizeMove(e: React.PointerEvent) {
    if (!resize.current) return;
    const dir = resize.current;
    const w = dir === "s" ? win.width : e.clientX - win.x;
    const h = dir === "e" ? win.height : e.clientY - win.y;
    resizeWindow(win.id, w, h);
  }

  function endPointer(e: React.PointerEvent) {
    drag.current = null;
    resize.current = null;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }

  function toggleMaximize() {
    if (maximized && prev.current) {
      setBounds(win.id, prev.current.x, prev.current.y, prev.current.width, prev.current.height);
      setMaximized(false);
    } else {
      prev.current = { x: win.x, y: win.y, width: win.width, height: win.height };
      setBounds(win.id, 8, 8, window.innerWidth - 64 - 24, window.innerHeight - 44 - 24);
      setMaximized(true);
    }
    focusWindow(win.id);
  }

  const handleOrganizeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleAutoOrganize();
  };

  return (
    <div
      onMouseDown={() => focusWindow(win.id)}
      className="nexus-naissance absolute flex flex-col overflow-hidden rounded-2xl border border-nexus-border bg-nexus-panel/95 shadow-2xl backdrop-blur-[var(--glass-blur)] transition-all duration-[320ms] [transition-timing-function:var(--ressort)]"
      style={{
        left: isMobile ? 0 : win.x,
        top: isMobile ? 0 : win.y,
        width: isMobile ? "100%" : win.width,
        height: isMobile ? "100%" : win.height,
        // En se fermant, la fenetre fait le chemin INVERSE de sa naissance :
        // elle retrecit et ses coins s'arrondissent jusqu'a redevenir une
        // bulle. Avant, elle se contentait de retrecir : on ne lisait pas le
        // geste.
        borderRadius: isMobile ? 0 : closing ? 30 : undefined,
        zIndex: win.z,
        transformOrigin: closing ? "center" : "bottom left",
        transform: win.minimized
          ? "scale(0.12) translateY(1400px)"
          : closing
          ? "scale(0.86) translateY(8px)"
          : "none",
        opacity: win.minimized || closing ? 0 : 1,
        pointerEvents: win.minimized || closing ? "none" : "auto",
      }}
    >
      <div className="flex items-center gap-2 border-b border-nexus-border px-3 py-2">
        {/* Ilot de boutons (fermer, reduire, agrandir) sur le coté gauche */}
        <div className="group/ctrl flex items-center gap-1.5">
          <Control color="#f87171" symbol="✕" onClick={animatedClose} label="Fermer" />
          <Control color="#fbbf24" symbol="–" onClick={() => toggleMinimize(win.id)} label="Réduire" />
          {!isMobile && (
            <Control color="#34d399" symbol="◻" onClick={toggleMaximize} label="Agrandir" />
          )}
        </div>

        {/* Zone de deplacement : le centre de la barre. */}
        <div
          onPointerDown={onTitlePointerDown}
          onPointerMove={onTitlePointerMove}
          onPointerUp={endPointer}
          onDoubleClick={toggleMaximize}
          className="nx-drag flex flex-1 cursor-grab items-center justify-center self-stretch active:cursor-grabbing"
        >
          <span className="flex select-none items-center gap-1.5 text-xs font-medium text-nexus-muted">
            {hue && (
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: hue }}
              />
            )}
            {title}
          </span>
        </div>

        {/* Cote oppose (droit) : Bouton interrupteur ovale Nexus d'organisation automatique */}
        {!isMobile && (
          <button
            type="button"
            onClick={handleOrganizeClick}
            title={isAutoOrganized ? "Mode organisation intelligente actif (cliquer pour désactiver)" : "Activer l'organisation intelligente automatique des fenêtres"}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all duration-[320ms] [transition-timing-function:var(--ressort)] text-[10px] font-bold ${
              isAutoOrganized
                ? "bg-cyan-500/25 border-cyan-400 text-cyan-300 shadow-[0_0_14px_rgba(56,189,248,0.45)] ring-1 ring-cyan-400/30"
                : "bg-nexus-card border-nexus-border text-nexus-muted hover:border-cyan-500/50 hover:text-nexus-text"
            }`}
          >
            <span className={`text-[11px] transition-transform ${isAutoOrganized ? "text-cyan-300 animate-spin" : "text-cyan-400"}`}>✦</span>
            <span className="hidden sm:inline">Organisé</span>
            <div
              className={`w-5 h-3 rounded-full p-0.5 transition-colors duration-[200ms] [transition-timing-function:var(--doux)] ${
                isAutoOrganized ? "bg-cyan-400 shadow-inner" : "bg-slate-700/80"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full bg-white shadow-sm transition-transform duration-[260ms] [transition-timing-function:var(--appui)] ${
                  isAutoOrganized ? "translate-x-2 bg-slate-950" : "translate-x-0"
                }`}
              />
            </div>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4">{children}</div>

      {!maximized && !isMobile && (
        <>
          {/* Bord droit */}
          <div
            onPointerDown={startResize("e")}
            onPointerMove={onResizeMove}
            onPointerUp={endPointer}
            className="nx-drag absolute right-0 top-8 bottom-4 w-1.5 cursor-ew-resize"
          />
          {/* Bord bas */}
          <div
            onPointerDown={startResize("s")}
            onPointerMove={onResizeMove}
            onPointerUp={endPointer}
            className="nx-drag absolute bottom-0 left-4 right-4 h-1.5 cursor-ns-resize"
          />
          {/* Coin bas-droit */}
          <div
            onPointerDown={startResize("se")}
            onPointerMove={onResizeMove}
            onPointerUp={endPointer}
            className="nx-drag absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize"
            style={{
              background:
                "linear-gradient(135deg, transparent 50%, #52525b 50%, #52525b 62%, transparent 62%)",
            }}
          />
        </>
      )}
    </div>
  );
}

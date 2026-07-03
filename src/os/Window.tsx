import { useRef, useState, type ReactNode } from "react";
import { useWindows, type OpenWindow } from "./useWindows";
import { useIsMobile } from "../lib/useIsMobile";

interface WindowProps {
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
      className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-bold text-black/60 transition-opacity"
      style={{ backgroundColor: color }}
    >
      <span className="opacity-0 transition-opacity group-hover/ctrl:opacity-100">
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
    window.setTimeout(() => closeWindow(win.id), 200);
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

  return (
    <div
      onMouseDown={() => focusWindow(win.id)}
      className="nexus-fade-in absolute flex flex-col overflow-hidden rounded-xl border border-nexus-border bg-nexus-panel/95 shadow-2xl backdrop-blur-[var(--glass-blur)] transition-[transform,opacity] duration-300 ease-in-out"
      style={{
        left: isMobile ? 0 : win.x,
        top: isMobile ? 0 : win.y,
        width: isMobile ? "100%" : win.width,
        height: isMobile ? "100%" : win.height,
        borderRadius: isMobile ? 0 : undefined,
        zIndex: win.z,
        transformOrigin: closing ? "center" : "bottom left",
        transform: win.minimized
          ? "scale(0.12) translateY(1400px)"
          : closing
          ? "scale(0.9)"
          : "none",
        opacity: win.minimized || closing ? 0 : 1,
        pointerEvents: win.minimized || closing ? "none" : "auto",
      }}
    >
      <div className="flex items-center gap-2 border-b border-nexus-border px-3 py-2">
        {/* Ilot de boutons, totalement independant de la zone de deplacement. */}
        <div className="group/ctrl flex items-center gap-1.5">
          <Control color="#f87171" symbol="✕" onClick={animatedClose} label="Fermer" />
          <Control color="#fbbf24" symbol="–" onClick={() => toggleMinimize(win.id)} label="Reduire" />
          {!isMobile && (
            <Control color="#34d399" symbol="◻" onClick={toggleMaximize} label="Agrandir" />
          )}
        </div>
        {/* Zone de deplacement : tout le reste de la barre. */}
        <div
          onPointerDown={onTitlePointerDown}
          onPointerMove={onTitlePointerMove}
          onPointerUp={endPointer}
          onDoubleClick={toggleMaximize}
          className="nx-drag flex flex-1 cursor-grab items-center justify-end self-stretch active:cursor-grabbing"
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

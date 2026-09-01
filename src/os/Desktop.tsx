import { useEffect, useRef, useState } from "react";
import Dock from "./Dock";
import TopBar from "./TopBar";
import { estModeOnglet } from "../lib/ongletMode";
import Window from "./Window";
import ControlRoom from "./ControlRoom";
import CallWatcher from "./CallWatcher";
import Home from "./Home";
import CommandPalette from "./CommandPalette";
import { useWindows, noterZoneBureau } from "./useWindows";
import { useSettings, resolveWallpaper, type DockPos } from "./useSettings";
import { getApp } from "./appsRegistry";
import { isTauri } from "../lib/tauri";
import { recordVisit } from "../lib/activity";
import { useIsMobile } from "../lib/useIsMobile";
import NexusAssistant from "./NexusAssistant";

// Le bureau : assemble la barre du haut, le dock, les fenetres ouvertes et la
// barre de commande. Gere aussi les raccourcis clavier globaux.
export default function Desktop() {
  const windows = useWindows((s) => s.windows);
  const togglePalette = useWindows((s) => s.togglePalette);
  const setPaletteOpen = useWindows((s) => s.setPaletteOpen);
  const autoMinimizeInactiveWindows = useWindows((s) => s.autoMinimizeInactiveWindows);
  const ajusterAEcran = useWindows((s) => s.ajusterAEcran);
  const zoneRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const background = useSettings((s) => s.background);
  const wallpaper = useSettings((s) => s.wallpaper);
  const customWallpaper = useSettings((s) => s.customWallpaper);
  const dockPos = useSettings((s) => s.dockPos);
  const autoMinimizeInactive = useSettings((s) => s.autoMinimizeInactive);

  const [aiState, setAiState] = useState<{ active: boolean; thinking?: boolean }>({ active: false });

  // Verification periodique des fenetres inactives (2 min)
  // Quand l'ecran change de taille, on remet les espaces dedans. Sans cela,
  // reduire la fenetre du navigateur laissait les espaces a leur ancienne
  // taille : la moitie du contenu passait hors champ.
  useEffect(() => {
    let t: number | undefined;
    const mesurer = () => {
      const el = zoneRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      noterZoneBureau({ left: r.left, top: r.top, width: r.width, height: r.height });
    };
    const suivre = () => {
      window.clearTimeout(t);
      t = window.setTimeout(() => { mesurer(); ajusterAEcran(); }, 120);
    };
    mesurer();
    ajusterAEcran();
    window.addEventListener("resize", suivre);
    window.addEventListener("orientationchange", suivre);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", suivre);
      window.removeEventListener("orientationchange", suivre);
    };
  }, [ajusterAEcran]);

  useEffect(() => {
    if (!autoMinimizeInactive) return;
    const timer = setInterval(() => {
      autoMinimizeInactiveWindows(120000);
    }, 5000);
    return () => clearInterval(timer);
  }, [autoMinimizeInactive, autoMinimizeInactiveWindows]);

  useEffect(() => {
    const handleAiEvent = (e: Event) => {
      const customEv = e as CustomEvent;
      setAiState(customEv.detail || { active: false });
    };
    window.addEventListener("nexus:ai-active", handleAiEvent);
    return () => window.removeEventListener("nexus:ai-active", handleAiEvent);
  }, []);

  // Position effective de la barre : en portrait telephone, toujours en bas.
  const homeStyle = useSettings((st) => st.homeStyle);
  const pos: DockPos = isMobile ? "bottom" : dockPos;
  const horizontalDock = pos === "top" || pos === "bottom";
  const dockEl = <Dock horizontal={horizontalDock} pos={pos} />;

  // Chaque ambiance dessine un fond different (subtil, jamais agressif).
  const backgrounds: Record<string, string> = {
    nuit: "radial-gradient(900px 500px at 30% 0%, rgba(255,255,255,0.03), transparent 70%)",
    aurore:
      "radial-gradient(900px 520px at 25% -5%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 70%)",
    ardoise: "none",
    lueur:
      "radial-gradient(800px 480px at 50% 115%, color-mix(in srgb, var(--accent) 20%, transparent), transparent 70%)",
  };

  // Enregistre la visite du jour (pour le bilan sobre de l'accueil).
  useEffect(() => {
    recordVisit();
  }, []);

  useEffect(() => {
    async function onKeyDown(e: KeyboardEvent) {
      // Cmd+K / Ctrl+K : ouvrir/fermer la barre de commande.
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        togglePalette();
        return;
      }
      // Echap : fermer la barre de commande.
      if (e.key === "Escape") {
        setPaletteOpen(false);
        return;
      }
      // Option+Espace / Alt+Espace : masquer/afficher la fenetre (mode bureau).
      if (e.altKey && e.code === "Space") {
        e.preventDefault();
        if (isTauri()) {
          const { invoke } = await import("@tauri-apps/api/core");
          await invoke("toggle_window_visibility");
        }
        return;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [togglePalette, setPaletteOpen]);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-nexus-bg text-nexus-text">
      <TopBar />
      <CallWatcher />
      {!estModeOnglet() && pos === "top" && dockEl}
      <div
        className={`relative flex flex-1 overflow-hidden ${
          pos === "right" ? "flex-row-reverse" : "flex-row"
        }`}
      >
        {!estModeOnglet() && (pos === "left" || pos === "right") && dockEl}

        {/* Le bureau ou se posent les fenetres. On MESURE cette zone : c'est
            elle qui borne les fenetres, pas la fenetre du navigateur. La barre
            laterale lui prend sa largeur, et une fenetre bornee sur l'ecran
            entier depassait d'autant a droite. */}
        <div ref={zoneRef} className="relative flex-1 overflow-hidden">
          {/* Reflet discret du fond d'ecran choisi : l'espace de travail garde
              son epure, mais reste en continuite visuelle avec l'accueil. */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.16] transition-opacity duration-500"
            style={{ background: resolveWallpaper(wallpaper, customWallpaper) }}
          />
          {/* Ambiance choisie dans Personnalisation, par-dessus le reflet. */}
          <div
            className="pointer-events-none absolute inset-0 transition-opacity duration-500"
            style={{ background: backgrounds[background] ?? backgrounds.nuit }}
          />

          {/* L'accueil reapparait des qu'aucune fenetre n'est visible. */}
          {windows.every((w) => w.minimized) &&
            (estModeOnglet() || homeStyle === "classic" ? <Home /> : <ControlRoom />)}

          {windows.map((win) => {
            const app = getApp(win.appId);
            if (!app) return null;
            const Body = app.Component;
            return (
              <Window key={win.id} win={win} title={app.title} hue={app.hue}>
                <Body />
              </Window>
            );
          })}
        </div>
      </div>

      {!estModeOnglet() && pos === "bottom" && dockEl}

      <CommandPalette />

      <NexusAssistant />

      {/* Siri 2026/2027 Apple Intelligence Iridescent Edge Aura */}
      {aiState.active && (
        <div
          className="pointer-events-none fixed inset-0 z-40 transition-all duration-700"
          style={{
            boxShadow: aiState.thinking
              ? "inset 0 0 50px rgba(236, 72, 153, 0.45), inset 0 0 100px rgba(56, 189, 248, 0.45)"
              : "inset 0 0 35px rgba(168, 85, 247, 0.35), inset 0 0 70px rgba(56, 189, 248, 0.35)",
          }}
        >
          <div className="h-full w-full border-2 border-cyan-400/40 opacity-70 animate-pulse" />
        </div>
      )}

      {/* Petite barre en bas listant les fenetres reduites, pour les rouvrir. */}
      <MinimizedBar />
    </div>
  );
}

function MinimizedBar() {
  const windows = useWindows((s) => s.windows);
  const toggleMinimize = useWindows((s) => s.toggleMinimize);
  const focusWindow = useWindows((s) => s.focusWindow);
  const minimized = windows.filter((w) => w.minimized);

  if (minimized.length === 0) return null;

  return (
    <div className="z-40 flex h-9 shrink-0 items-center gap-2 overflow-x-auto border-t border-nexus-border bg-nexus-panel/60 px-4 backdrop-blur-[var(--glass-blur)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {minimized.map((w) => {
        const app = getApp(w.appId);
        return (
          <button
            key={w.id}
            onClick={() => {
              toggleMinimize(w.id);
              focusWindow(w.id);
            }}
            className="nx-btn nx-btn-secondary shrink-0 whitespace-nowrap text-[11px]"
          >
            {app?.title ?? "Fenetre"}
          </button>
        );
      })}
    </div>
  );
}

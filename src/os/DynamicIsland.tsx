import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useWindows } from "./useWindows";
import { usePersistentState } from "../lib/persist";
import { APPS } from "./appsRegistry";

interface Task {
  id: string;
  text: string;
  done: boolean;
}

export default function DynamicIsland() {
  const [expanded, setExpanded] = useState(false);
  const openApp = useWindows((s) => s.openApp);
  const windows = useWindows((s) => s.windows);
  const [tasks] = usePersistentState<Task[]>("nexus.tasks", []);

  const pendingTasks = tasks.filter((t) => !t.done).length;
  const activeWindows = windows.filter((w) => !w.minimized);
  const activeWindowsCount = activeWindows.length;

  // Find top focused window
  const topWindow = activeWindows.reduce<typeof windows[0] | null>((maxWin, win) => {
    if (!maxWin || win.z > maxWin.z) return win;
    return maxWin;
  }, null);

  const focusedAppDef = topWindow ? APPS.find((a) => a.id === topWindow.appId) : null;
  const isMusicOpen = windows.some((w) => w.appId === "focus" && !w.minimized);

  return (
    <div
      className="relative z-[999999] select-none flex justify-center"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 380, damping: 25 }}
        className={`bg-slate-950/95 border border-white/20 backdrop-blur-3xl shadow-[0_12px_40px_rgba(0,0,0,0.6)] flex items-center justify-between text-white transition-colors ${
          isMusicOpen ? "border-emerald-500/50 shadow-emerald-500/20" : "hover:border-cyan-400/60"
        } ${expanded
          // Ouvert : ancre EN HAUT et deroule vers le bas. Avant, le panneau
          // grandissait sur place, centre dans une barre de 44px : la moitie
          // haute sortait de l'ecran et se retrouvait coupee.
          ? "absolute top-1 left-1/2 -translate-x-1/2 w-[360px] max-w-[94vw] max-h-[80vh] overflow-y-auto rounded-3xl p-3.5 sm:p-4 flex-col space-y-3 z-[1000020]"
          : "h-8 min-w-[130px] sm:min-w-[220px] max-w-[220px] sm:max-w-[300px] rounded-full px-2.5 sm:px-3.5 cursor-pointer"}`}
      >
        {!expanded ? (
          /* Collapsed View Pill */
          <motion.button
            layout="position"
            onClick={() => setExpanded(true)}
            className="w-full flex items-center justify-between text-xs font-sans h-full"
          >
            <div className="flex items-center gap-1.5 sm:gap-2 truncate pr-1">
              {isMusicOpen ? (
                <div className="flex items-end gap-0.5 h-3 shrink-0">
                  <span className="w-0.5 bg-emerald-400 animate-bounce h-full rounded-full" />
                  <span className="w-0.5 bg-emerald-400 animate-bounce h-2/3 rounded-full delay-100" />
                  <span className="w-0.5 bg-emerald-400 animate-bounce h-4/5 rounded-full delay-200" />
                </div>
              ) : (
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
              )}
              <span className="text-[10px] sm:text-[11px] font-bold text-white truncate tracking-tight">
                {focusedAppDef ? focusedAppDef.title : "Nexus"}
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0 text-[10px]">
              {pendingTasks > 0 && (
                <span className="rounded-full bg-amber-500/20 px-1 py-0.2 text-amber-300 font-bold border border-amber-500/30 text-[9px]">
                  {pendingTasks}
                </span>
              )}
              {/* « 0 app » ne veut rien dire : quand rien n'est ouvert, on
                  n'affiche pas un compteur a zero, on dit ce qu'on voit. */}
              <span className="bg-white/10 px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-semibold text-slate-200">
                {activeWindowsCount === 0
                  ? "Accueil"
                  : `${activeWindowsCount} espace${activeWindowsCount > 1 ? "s" : ""}`}
              </span>
            </div>
          </motion.button>
        ) : (
          /* Expanded View Dropdown Card */
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: -5, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -5, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 420, damping: 26 }}
              className="w-full text-white space-y-3"
            >
              {/* Header Status */}
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                  <span className="text-xs font-extrabold text-white tracking-wide">Espaces ouverts</span>
                </div>
                <button
                  onClick={() => setExpanded(false)}
                  className="text-[10px] text-cyan-300 hover:text-white bg-cyan-500/20 px-2.5 py-0.5 rounded-full border border-cyan-500/30 font-semibold transition-all"
                >
                  Réduire
                </button>
              </div>

              {/* Contextual Status Bar */}
              <div className="flex items-center justify-between bg-white/5 rounded-2xl px-3.5 py-2 text-[11px] text-slate-300 border border-white/10 shadow-inner">
                <span className="truncate font-medium">
                  {isMusicOpen
                    ? "🎵 Focus actif : Musique"
                    : pendingTasks > 0
                    ? `📋 ${pendingTasks} tâche(s) prioritaire(s)`
                    : focusedAppDef
                    ? `⚡ App active : ${focusedAppDef.title}`
                    : "✨ Espace prêt pour la productivité"}
                </span>
                <span className="text-cyan-400 font-extrabold text-[10px] shrink-0 ml-2">EN DIRECT</span>
              </div>

              {/* Quick Pro Actions Grid */}
              <div className="grid grid-cols-4 gap-2 pt-0.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openApp("files", { width: 460, height: 480 });
                    setExpanded(false);
                  }}
                  className="flex flex-col items-center justify-center p-2 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/10 hover:border-cyan-400/50 transition-all text-[11px] group shadow"
                >
                  <span className="text-sm group-hover:scale-110 transition-transform">📁</span>
                  <span className="truncate text-slate-200 text-[10px] mt-1 font-semibold">Fichiers</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openApp("ai", { width: 460, height: 420 });
                    setExpanded(false);
                  }}
                  className="flex flex-col items-center justify-center p-2 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/10 hover:border-purple-400/50 transition-all text-[11px] group shadow"
                >
                  <span className="text-sm group-hover:scale-110 transition-transform">🧠</span>
                  <span className="truncate text-slate-200 text-[10px] mt-1 font-semibold">IA Hub</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openApp("terminal", { width: 620, height: 440 });
                    setExpanded(false);
                  }}
                  className="flex flex-col items-center justify-center p-2 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/10 hover:border-emerald-400/50 transition-all text-[11px] group shadow"
                >
                  <span className="text-sm group-hover:scale-110 transition-transform">💻</span>
                  <span className="truncate text-slate-200 text-[10px] mt-1 font-semibold">Terminal</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openApp("notes", { width: 620, height: 460 });
                    setExpanded(false);
                  }}
                  className="flex flex-col items-center justify-center p-2 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/10 hover:border-pink-400/50 transition-all text-[11px] group shadow"
                >
                  <span className="text-sm group-hover:scale-110 transition-transform">📝</span>
                  <span className="truncate text-slate-200 text-[10px] mt-1 font-semibold">Notes</span>
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </motion.div>
    </div>
  );
}

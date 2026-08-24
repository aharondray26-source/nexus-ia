import React, { useState } from "react";
import ChessGame from "./ChessGame";

export default function Game() {
  const [activeTab, setActiveTab] = useState<"chess" | "arcade">("arcade");

  return (
    <div className="flex h-full flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 relative">
      {/* Tab bar header - Apple like */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
        <div className="flex gap-1 rounded-full bg-white/70 dark:bg-black/60 p-1 border border-slate-200 dark:border-white/10 backdrop-blur-xl shadow-sm">
          <button
            onClick={() => setActiveTab("arcade")}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-300 ${
              activeTab === "arcade"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            <span>🕹️</span>
            <span>Arcade</span>
          </button>
          <button
            onClick={() => setActiveTab("chess")}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-300 ${
              activeTab === "chess"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            <span>♟️</span>
            <span>Échecs</span>
          </button>
        </div>
      </div>

      {/* Main Content View */}
      <div className="flex-1 overflow-hidden bg-white dark:bg-slate-950">
        {activeTab === "chess" ? (
          <div className="h-full pt-16">
            <ChessGame />
          </div>
        ) : (
          <iframe
            title="Nexus Retro Arcade"
            src="/arcade.html"
            className="h-full w-full"
            style={{ border: 0 }}
            allow="fullscreen"
          />
        )}
      </div>
    </div>
  );
}

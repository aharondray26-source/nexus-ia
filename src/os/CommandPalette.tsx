import React, { useEffect, useMemo, useState } from "react";
import { APPS } from "./appsRegistry";
import { useWindows } from "./useWindows";
import Icon from "./Icons";
import { Sparkles, Search, Calculator, ArrowRight } from "lucide-react";

export default function CommandPalette() {
  const open = useWindows((s) => s.paletteOpen);
  const setOpen = useWindows((s) => s.setPaletteOpen);
  const openApp = useWindows((s) => s.openApp);

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Safe Math Evaluator
  const mathResult = useMemo(() => {
    const q = query.trim();
    if (/^[0-9+\-*/().\s^]+$/.test(q) && q.length > 1 && /[0-9]/.test(q)) {
      try {
        const sanitized = q.replace(/\^/g, "**");
        const val = Function(`"use strict"; return (${sanitized})`)();
        if (typeof val === "number" && !isNaN(val) && isFinite(val)) {
          return String(val);
        }
      } catch {
        return null;
      }
    }
    return null;
  }, [query]);

  // App matches
  const appMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const visible = APPS.filter((a) => !a.hidden);
    if (!q) return visible;
    return visible.filter(
      (a) =>
        a.title.toLowerCase().includes(q) || a.keywords.includes(q)
    );
  }, [query]);

  // Combined action items
  const items = useMemo(() => {
    const q = query.trim();
    const list: Array<{
      type: "app" | "ai" | "web" | "math";
      id: string;
      title: string;
      subtitle?: string;
      icon: string | React.ReactNode;
      appId?: string;
    }> = [];

    if (mathResult !== null) {
      list.push({
        type: "math",
        id: "math-action",
        title: `= ${mathResult}`,
        subtitle: `Calcul instantané pour "${q}"`,
        icon: <Calculator className="w-4 h-4 text-emerald-400" />,
      });
    }

    if (q) {
      list.push({
        type: "ai",
        id: "ai-action",
        title: `Demander à l'IA : "${q}"`,
        subtitle: "Lancer la réponse intelligente Nexus AI",
        icon: <Sparkles className="w-4 h-4 text-purple-400" />,
      });

      list.push({
        type: "web",
        id: "web-action",
        title: `Rechercher "${q}" sur le Web & Wikipedia`,
        subtitle: "Ouvrir le moteur de recherche Nexus",
        icon: <Search className="w-4 h-4 text-cyan-400" />,
      });
    }

    appMatches.forEach((app) => {
      list.push({
        type: "app",
        id: app.id,
        title: app.title,
        subtitle: `Ouvrir l'application ${app.title}`,
        icon: app.icon,
        appId: app.id,
      });
    });

    return list;
  }, [query, mathResult, appMatches]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!open) return null;

  function executeItem(item: typeof items[0]) {
    if (!item) return;

    if (item.type === "app" && item.appId) {
      const app = APPS.find((a) => a.id === item.appId);
      openApp(item.appId, app ? { width: app.width, height: app.height } : undefined);
    } else if (item.type === "ai") {
      window.dispatchEvent(new CustomEvent("nexus:open-ai"));
      // Trigger question in AI
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("nexus:ai-query", { detail: { query: query.trim() } })
        );
      }, 200);
    } else if (item.type === "web") {
      openApp("web", { width: 620, height: 480 });
    } else if (item.type === "math") {
      navigator.clipboard.writeText(mathResult || "");
    }

    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (items[selectedIndex]) executeItem(items[selectedIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[900] flex items-start justify-center bg-black/40 pt-[12vh] backdrop-blur-md"
      onClick={() => setOpen(false)}
    >
      <div
        className="nexus-fade-in w-full max-w-xl overflow-hidden rounded-2xl border border-nexus-border bg-nexus-panel shadow-2xl backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex items-center border-b border-nexus-border px-4 py-3">
          <Search className="w-4 h-4 text-cyan-400 mr-2 shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Posez une question à l'IA, faites un calcul, ou cherchez une application..."
            className="w-full bg-transparent text-sm text-nexus-text outline-none placeholder:text-nexus-muted font-sans"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-xs text-nexus-muted hover:text-nexus-text px-2 py-0.5 rounded bg-nexus-card"
            >
              Effacer
            </button>
          )}
        </div>

        <ul className="max-h-80 overflow-y-auto p-2 space-y-1 [scrollbar-width:thin]">
          {items.map((item, i) => {
            const isSelected = i === selectedIndex;
            return (
              <li key={item.id}>
                <button
                  onClick={() => executeItem(item)}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
                    isSelected
                      ? "bg-cyan-500/15 border border-cyan-500/40 text-nexus-text"
                      : "text-nexus-muted hover:bg-nexus-card hover:text-nexus-text"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg bg-nexus-card border border-nexus-border text-nexus-text">
                      {typeof item.icon === "string" ? (
                        <Icon name={item.icon} size={16} />
                      ) : (
                        item.icon
                      )}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold truncate text-nexus-text">
                        {item.title}
                      </span>
                      {item.subtitle && (
                        <span className="text-[10px] text-nexus-muted truncate">
                          {item.subtitle}
                        </span>
                      )}
                    </div>
                  </div>

                  <ArrowRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${isSelected ? "text-cyan-400 translate-x-0.5" : "text-nexus-muted"}`} />
                </button>
              </li>
            );
          })}

          {items.length === 0 && (
            <li className="px-3 py-8 text-center text-xs text-slate-400">
              Tapez une question ou le nom d'un outil...
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

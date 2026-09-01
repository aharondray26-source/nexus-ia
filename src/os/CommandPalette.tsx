import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { APPS } from "./appsRegistry";
import { useWindows } from "./useWindows";
import Icon from "./Icons";
import { Sparkles, Search, Calculator, ArrowRight } from "lucide-react";

/// Minuscules et sans accents : « Réglages », « reglages » et « RÉGLAGES »
/// deviennent la même chose.
const sansAccent = (s: string) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export default function CommandPalette() {
  const open = useWindows((s) => s.paletteOpen);
  const setOpen = useWindows((s) => s.setPaletteOpen);
  const openApp = useWindows((s) => s.openApp);

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  // Quand la liste deborde, elle est tranchee net contre le bord du panneau :
  // on ne voit pas qu'elle defile, on voit un element coupe. Un degrade en bas
  // dit « ça continue » — et il s'efface des qu'on est arrive au bout.
  const [resteEnBas, setResteEnBas] = useState(false);
  const listeRef = useRef<HTMLUListElement>(null);
  const mesurerDefilement = useCallback(() => {
    const el = listeRef.current;
    if (!el) return;
    setResteEnBas(el.scrollHeight - el.scrollTop - el.clientHeight > 4);
  }, []);

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
    // On replie les accents des DEUX cotes : taper « réglages » doit trouver
    // « reglages », et l'inverse aussi. Sans ca, ecrire correctement le
    // francais empechait de trouver — l'exact contraire du bon sens.
    const q = sansAccent(query.trim());
    const visible = APPS.filter((a) => !a.hidden);
    if (!q) return visible;
    return visible.filter(
      (a) =>
        sansAccent(a.title).includes(q) || sansAccent(a.keywords).includes(q)
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
        // Le sous-titre disait « Ouvrir l'application X » sous un titre deja
        // nomme X : du bruit. On montre ce qu'on FAIT dans cet espace.
        subtitle: (app.keywords || "")
          .split(/\s+/).filter(Boolean).slice(0, 5).join(" · "),
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

  // ATTENTION : ce hook doit rester AVANT le retour anticipe ci-dessous. Place
  // apres, il n'est appele que lorsque la palette est ouverte — le nombre de
  // hooks change d'un rendu a l'autre et React s'arrete net (erreur 310,
  // ecran noir). Le nombre de resultats change a chaque frappe : on remesure.
  useEffect(mesurerDefilement, [mesurerDefilement, items, open]);

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
      className="fixed inset-0 z-[900] flex items-start justify-center bg-black/45 px-4 pt-[13vh] backdrop-blur-[3px]"
      onClick={() => setOpen(false)}
    >
      <div
        className="nexus-naissance nx-palette w-full max-w-2xl overflow-hidden rounded-[26px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex items-center gap-3 border-b border-white/10 px-5 py-4">
          <Search className="h-[18px] w-[18px] shrink-0 text-nexus-muted" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Chercher un espace, calculer, ou demander à l'IA"
            className="nx-champ w-full bg-transparent text-nexus-text outline-none placeholder:text-nexus-muted font-sans"
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

        <ul
          ref={listeRef}
          onScroll={mesurerDefilement}
          className="nx-entre-liste max-h-[min(52vh,420px)] overflow-y-auto p-2 pb-3 space-y-1 [scrollbar-width:thin]"
          style={
            // C'est le CONTENU qui s'efface, pas un voile de couleur pose
            // par-dessus : un degrade colore reclamerait la teinte exacte du
            // panneau, differente en mode clair et en mode sombre, et laisserait
            // une trace grise des qu'on se trompe. Le masque, lui, est juste.
            resteEnBas
              ? { maskImage: "linear-gradient(to bottom, #000 calc(100% - 38px), transparent)",
                  WebkitMaskImage: "linear-gradient(to bottom, #000 calc(100% - 38px), transparent)" }
              : undefined
          }
        >
          {items.map((item, i) => {
            const isSelected = i === selectedIndex;
            return (
              <li key={item.id}>
                <button
                  onClick={() => executeItem(item)}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className={`flex w-full items-center justify-between gap-3 rounded-2xl px-3.5 py-2.5 text-left transition-all duration-[220ms] [transition-timing-function:var(--appui)] ${
                    isSelected
                      ? "bg-cyan-500/15 border border-cyan-500/40 text-nexus-text"
                      : "text-nexus-muted hover:bg-nexus-card hover:text-nexus-text"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="nx-chip shrink-0 flex items-center justify-center w-7 h-7">
                      {typeof item.icon === "string" ? (
                        <Icon name={item.icon} size={16} />
                      ) : (
                        item.icon
                      )}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[13px] font-semibold truncate text-nexus-text">
                        {item.title}
                      </span>
                      {item.subtitle && (
                        <span className="text-[11px] text-nexus-muted truncate">
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
              Tape une question ou le nom d'un outil...
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

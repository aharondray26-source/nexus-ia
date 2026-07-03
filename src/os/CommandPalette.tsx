import { useEffect, useMemo, useState } from "react";
import { APPS } from "./appsRegistry";
import { useWindows } from "./useWindows";
import Icon from "./Icons";

// La barre de commande (Cmd+K) : on tape, on filtre les espaces, Entree ouvre.
export default function CommandPalette() {
  const open = useWindows((s) => s.paletteOpen);
  const setOpen = useWindows((s) => s.setPaletteOpen);
  const openApp = useWindows((s) => s.openApp);

  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const visible = APPS.filter((a) => !a.hidden);
    if (!q) return visible;
    return visible.filter(
      (a) =>
        a.title.toLowerCase().includes(q) || a.keywords.includes(q)
    );
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setIndex(0);
    }
  }, [open]);

  useEffect(() => {
    setIndex(0);
  }, [query]);

  if (!open) return null;

  function choose(appId: string) {
    const app = APPS.find((a) => a.id === appId);
    openApp(appId, app ? { width: app.width, height: app.height } : undefined);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[index]) choose(results[index].id);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[900] flex items-start justify-center bg-black/40 pt-[15vh] backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="nexus-fade-in w-full max-w-lg overflow-hidden rounded-2xl border border-nexus-border bg-nexus-panel shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ouvrir un espace, chercher..."
          className="w-full border-b border-nexus-border bg-transparent px-4 py-3.5 text-sm text-nexus-text outline-none placeholder:text-nexus-muted"
        />
        <ul className="max-h-72 overflow-y-auto p-2">
          {results.map((app, i) => (
            <li key={app.id}>
              <button
                onClick={() => choose(app.id)}
                onMouseEnter={() => setIndex(i)}
                style={
                  i === index
                    ? { boxShadow: "inset 2px 0 0 0 var(--accent)" }
                    : undefined
                }
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                  i === index ? "bg-white/[0.06]" : ""
                }`}
              >
                <span className="text-nexus-muted">
                  <Icon name={app.icon} size={18} />
                </span>
                <span className="text-sm text-nexus-text">{app.title}</span>
              </button>
            </li>
          ))}
          {results.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-nexus-muted">
              Aucun espace ne correspond.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

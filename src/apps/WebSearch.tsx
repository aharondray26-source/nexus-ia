import { useState, type FormEvent } from "react";
import { openAiWindow } from "../lib/tauri";

// Deux facons de chercher :
//  1) Resultats Wikipedia AFFICHES DANS le site (la recherche reste ici) ;
//     un clic sur un resultat ouvre seulement alors la page.
//  2) Lancement rapide vers les grands moteurs (qui, eux, s'ouvrent a part
//     car ils interdisent d'afficher leurs resultats chez nous).

interface WikiResult {
  title: string;
  snippet: string;
}

const ENGINES = [
  { name: "Google", url: (q: string) => `https://www.google.com/search?q=${q}` },
  { name: "DuckDuckGo", url: (q: string) => `https://duckduckgo.com/?q=${q}` },
  {
    name: "YouTube",
    url: (q: string) => `https://www.youtube.com/results?search_query=${q}`,
  },
];

// Retire les balises HTML renvoyees dans les extraits de Wikipedia.
function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "");
}

export default function WebSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<WikiResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function search(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(
        `https://fr.wikipedia.org/w/api.php?action=query&list=search&format=json` +
          `&origin=*&srlimit=10&srsearch=${encodeURIComponent(q)}`
      );
      const data = await res.json();
      const list = (data?.query?.search ?? []) as {
        title: string;
        snippet: string;
      }[];
      setResults(
        list.map((r) => ({ title: r.title, snippet: stripHtml(r.snippet) }))
      );
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <form onSubmit={search} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher (ex : Ninjago)..."
          className="flex-1 rounded-lg border border-nexus-border bg-nexus-bg px-3 py-2 text-sm text-nexus-text outline-none focus:border-white/30"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg border border-nexus-border bg-white/[0.04] px-4 py-2 text-sm text-nexus-text transition-colors hover:bg-white/[0.08] disabled:opacity-50"
        >
          {loading ? "..." : "Chercher"}
        </button>
      </form>

      {/* Lancement rapide vers les grands moteurs. */}
      {query.trim() && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-nexus-muted">Ouvrir sur :</span>
          {ENGINES.map((eng) => (
            <button
              key={eng.name}
              onClick={() =>
                openAiWindow(
                  "web-search",
                  eng.url(encodeURIComponent(query.trim()))
                )
              }
              className="rounded-full border border-nexus-border px-2.5 py-1 text-[11px] text-nexus-muted transition-colors hover:text-nexus-text"
            >
              {eng.name}
            </button>
          ))}
        </div>
      )}

      {/* Resultats Wikipedia, affiches dans le site. */}
      <ul className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {results.map((r) => (
          <li key={r.title}>
            <button
              onClick={() =>
                openAiWindow(
                  `wiki-${r.title}`,
                  `https://fr.wikipedia.org/wiki/${encodeURIComponent(
                    r.title.replace(/ /g, "_")
                  )}`
                )
              }
              className="flex w-full flex-col gap-1 rounded-lg border border-nexus-border bg-nexus-bg px-3 py-2.5 text-left transition-colors hover:border-white/20"
            >
              <span className="text-sm font-medium text-nexus-text">
                {r.title}
              </span>
              <span className="line-clamp-2 text-[11px] leading-relaxed text-nexus-muted">
                {r.snippet}…
              </span>
            </button>
          </li>
        ))}
        {searched && !loading && results.length === 0 && (
          <li className="flex flex-1 items-center justify-center text-[11px] text-nexus-muted/70">
            Aucun resultat. Essaie les moteurs ci-dessus.
          </li>
        )}
        {!searched && (
          <li className="flex flex-1 items-center justify-center text-center text-[11px] text-nexus-muted/70">
            Les resultats s'affichent ici. Un clic ouvre la page choisie.
          </li>
        )}
      </ul>
    </div>
  );
}

import { useState, type FormEvent } from "react";

// Le dictionnaire s'appuie sur le Wiktionnaire francais (donnees libres).
// On recupere le texte de la page du mot, puis on isole la section francaise.

interface Line {
  kind: "heading" | "text";
  value: string;
}

// Extrait la partie "== Français ==" et la decoupe en lignes affichables.
function parseFrenchSection(extract: string): Line[] {
  const start = extract.indexOf("== Français ==");
  let section = start >= 0 ? extract.slice(start) : extract;

  // On coupe a la prochaine langue (un autre titre de niveau "== ... ==").
  const rest = section.slice("== Français ==".length);
  const nextLang = rest.search(/\n== [^=]/);
  if (nextLang >= 0) {
    section = "== Français ==" + rest.slice(0, nextLang);
  }

  const lines: Line[] = [];
  for (const raw of section.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line === "== Français ==") continue;
    const heading = line.match(/^===+\s*(.+?)\s*===+$/);
    if (heading) {
      lines.push({ kind: "heading", value: heading[1] });
    } else {
      lines.push({ kind: "text", value: line });
    }
  }
  return lines;
}

export default function Dictionary() {
  const [word, setWord] = useState("");
  const [lines, setLines] = useState<Line[] | null>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function search(e: FormEvent) {
    e.preventDefault();
    const term = word.trim();
    if (!term) return;
    setLoading(true);
    setError(null);
    setLines(null);
    try {
      const url =
        "https://fr.wiktionary.org/w/api.php?action=query&format=json" +
        "&prop=extracts&explaintext=1&redirects=1&origin=*&titles=" +
        encodeURIComponent(term);
      const res = await fetch(url);
      if (!res.ok) throw new Error("reseau");
      const data = await res.json();
      const pages = data?.query?.pages ?? {};
      const first = Object.values(pages)[0] as
        | { extract?: string; title?: string; missing?: string }
        | undefined;
      if (!first || first.missing !== undefined || !first.extract) {
        setError(`Aucune definition trouvee pour « ${term} ».`);
        return;
      }
      setTitle(first.title ?? term);
      setLines(parseFrenchSection(first.extract));
    } catch {
      setError("Connexion indisponible. Reessaie dans un instant.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <form onSubmit={search} className="flex gap-2">
        <input
          value={word}
          onChange={(e) => setWord(e.target.value)}
          placeholder="Cherche un mot..."
          className="nx-input flex-1 text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="nx-btn nx-btn-secondary text-sm"
        >
          {loading ? "..." : "Chercher"}
        </button>
      </form>

      <div className="flex-1 overflow-y-auto">
        {error && <p className="text-sm text-nexus-muted">{error}</p>}
        {lines && (
          <div className="flex flex-col gap-1.5">
            <h3 className="text-base font-semibold text-nexus-text">{title}</h3>
            {lines.map((l, i) =>
              l.kind === "heading" ? (
                <span
                  key={i}
                  className="mt-2 text-[11px] uppercase tracking-wider text-nexus-muted"
                >
                  {l.value}
                </span>
              ) : (
                <p key={i} className="text-sm leading-relaxed text-nexus-text">
                  {l.value}
                </p>
              )
            )}
          </div>
        )}
        {!lines && !error && !loading && (
          <p className="text-[11px] text-nexus-muted/70">
            Tape un mot et appuie sur Chercher pour voir sa definition.
          </p>
        )}
      </div>
    </div>
  );
}

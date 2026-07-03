import { useState, type FormEvent } from "react";

// Musique : on peut chercher par nom (chanteur, titre), choisir une ambiance,
// ou coller un lien YouTube. Tout se joue directement dans le site.
const STATIONS = [
  { name: "Lo-fi", id: "jfKfPfyJRdk" },
  { name: "Synthwave", id: "4xDzrJKXOOY" },
  { name: "Jazz", id: "Dx5qFachd3A" },
  { name: "Piano", id: "TtkFsfOP9QI" },
  { name: "Nature", id: "eKFTSSKCzWA" },
];

const embedId = (id: string) => `https://www.youtube.com/embed/${id}?autoplay=0`;
const embedSearch = (q: string) =>
  `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(q)}`;

// Extrait l'identifiant depuis un lien YouTube, ou accepte un identifiant brut.
function extractVideoId(raw: string): string | null {
  const input = raw.trim();
  if (!input) return null;
  const patterns = [
    /[?&]v=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/live\/([\w-]{11})/,
  ];
  for (const p of patterns) {
    const m = input.match(p);
    if (m) return m[1];
  }
  if (/^[\w-]{11}$/.test(input)) return input;
  return null;
}

export default function Focus() {
  const [index, setIndex] = useState(0);
  const [src, setSrc] = useState(embedId(STATIONS[0].id));
  const [label, setLabel] = useState(STATIONS[0].name);
  const [query, setQuery] = useState("");
  const [link, setLink] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);

  function playStation(i: number) {
    const wrapped = (i + STATIONS.length) % STATIONS.length;
    setIndex(wrapped);
    setSrc(embedId(STATIONS[wrapped].id));
    setLabel(STATIONS[wrapped].name);
  }

  function search(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setIndex(-1);
    setSrc(embedSearch(q));
    setLabel(q);
  }

  function playLink(e: FormEvent) {
    e.preventDefault();
    const id = extractVideoId(link);
    if (!id) {
      setLinkError("Lien non reconnu. Colle une adresse YouTube complete.");
      return;
    }
    setLinkError(null);
    setIndex(-1);
    setSrc(embedId(id));
    setLabel("Ta selection");
  }

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Recherche par nom */}
      <form onSubmit={search} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Chercher un chanteur, un titre..."
          className="flex-1 rounded-lg border border-nexus-border bg-nexus-bg px-3 py-2 text-sm text-nexus-text outline-none focus:border-white/30"
        />
        <button
          type="submit"
          className="rounded-lg border px-4 py-2 text-sm"
          style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
        >
          Chercher
        </button>
      </form>

      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => playStation(index - 1)}
          className="rounded-lg border border-nexus-border px-3 py-2 text-sm text-nexus-muted transition-colors hover:text-nexus-text"
          aria-label="Precedent"
        >
          ‹
        </button>
        <span className="flex-1 truncate text-center text-sm font-medium text-nexus-text">
          {label}
        </span>
        <button
          onClick={() => playStation(index + 1)}
          className="rounded-lg border border-nexus-border px-3 py-2 text-sm text-nexus-muted transition-colors hover:text-nexus-text"
          aria-label="Suivant"
        >
          ›
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {STATIONS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => playStation(i)}
            className="rounded-full border px-2.5 py-1 text-[11px] transition-colors"
            style={
              i === index
                ? { borderColor: "var(--accent)", color: "var(--accent)" }
                : { borderColor: "#27272a" }
            }
          >
            <span className={i === index ? "" : "text-nexus-muted"}>{s.name}</span>
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-nexus-border bg-black">
        <iframe
          key={src}
          title={`Lecture ${label}`}
          src={src}
          className="h-full w-full"
          allow="autoplay; encrypted-media"
          allowFullScreen
        />
      </div>

      <form onSubmit={playLink} className="flex flex-col gap-1">
        <div className="flex gap-2">
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="Ou colle un lien YouTube..."
            className="flex-1 rounded-lg border border-nexus-border bg-nexus-bg px-3 py-2 text-sm text-nexus-text outline-none focus:border-white/30"
          />
          <button
            type="submit"
            className="rounded-lg border border-nexus-border bg-white/[0.04] px-4 py-2 text-sm text-nexus-text transition-colors hover:bg-white/[0.08]"
          >
            Jouer
          </button>
        </div>
        {linkError && (
          <span className="text-[11px] text-nexus-muted">{linkError}</span>
        )}
      </form>
    </div>
  );
}

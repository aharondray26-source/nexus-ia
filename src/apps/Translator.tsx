import { useState, type FormEvent } from "react";

// Traducteur via MyMemory (gratuit, sans cle). Pratique au quotidien.
const LANGS = [
  { code: "fr", label: "Francais" },
  { code: "en", label: "Anglais" },
  { code: "es", label: "Espagnol" },
  { code: "de", label: "Allemand" },
  { code: "it", label: "Italien" },
  { code: "pt", label: "Portugais" },
  { code: "ar", label: "Arabe" },
];

export default function Translator() {
  const [text, setText] = useState("");
  const [from, setFrom] = useState("fr");
  const [to, setTo] = useState("en");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function translate(e: FormEvent) {
    e.preventDefault();
    const q = text.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
          q
        )}&langpair=${from}|${to}`
      );
      const data = await res.json();
      const t = data?.responseData?.translatedText;
      if (!t) throw new Error();
      setResult(t);
    } catch {
      setError("Traduction indisponible. Reessaie.");
    } finally {
      setLoading(false);
    }
  }

  function swap() {
    setFrom(to);
    setTo(from);
    setText(result);
    setResult(text);
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-2">
        <select
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="flex-1 rounded-lg border border-nexus-border bg-nexus-bg px-2 py-2 text-xs text-nexus-text outline-none"
        >
          {LANGS.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
        <button
          onClick={swap}
          className="nx-btn nx-btn-secondary text-sm"
          aria-label="Inverser"
        >
          ⇄
        </button>
        <select
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="flex-1 rounded-lg border border-nexus-border bg-nexus-bg px-2 py-2 text-xs text-nexus-text outline-none"
        >
          {LANGS.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      <form onSubmit={translate} className="flex flex-1 flex-col gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Texte a traduire..."
          className="nx-input flex-1 text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="nx-btn nx-btn-secondary text-sm"
        >
          {loading ? "..." : "Traduire"}
        </button>
      </form>

      {error && <p className="text-xs text-nexus-muted">{error}</p>}
      {result && (
        <div className="rounded-lg border border-nexus-border bg-nexus-bg p-3 text-sm text-nexus-text">
          {result}
        </div>
      )}
    </div>
  );
}

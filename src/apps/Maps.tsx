import { useState, type FormEvent } from "react";

// Carte interactive via OpenStreetMap, qui autorise l'integration (contrairement
// a beaucoup de services). On cherche un lieu, on centre la carte dessus.
function buildEmbed(lat: number, lon: number): string {
  const d = 0.05;
  const bbox = `${lon - d}%2C${lat - d}%2C${lon + d}%2C${lat + d}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lon}`;
}

export default function Maps() {
  // Vue par defaut : Paris.
  const [src, setSrc] = useState(buildEmbed(48.8566, 2.3522));
  const [place, setPlace] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function search(e: FormEvent) {
    e.preventDefault();
    const q = place.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          q
        )}&count=1&language=fr&format=json`
      );
      const data = await res.json();
      const r = data?.results?.[0];
      if (!r) {
        setError(`Lieu « ${q} » introuvable.`);
        return;
      }
      setSrc(buildEmbed(r.latitude, r.longitude));
    } catch {
      setError("Connexion indisponible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <form onSubmit={search} className="flex gap-2">
        <input
          value={place}
          onChange={(e) => setPlace(e.target.value)}
          placeholder="Chercher un lieu, une ville..."
          className="flex-1 rounded-lg border border-nexus-border bg-nexus-bg px-3 py-2 text-sm text-nexus-text outline-none focus:border-white/30"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg border border-nexus-border bg-white/[0.04] px-4 py-2 text-sm text-nexus-text transition-colors hover:bg-white/[0.08] disabled:opacity-50"
        >
          {loading ? "..." : "Aller"}
        </button>
      </form>

      {error && <p className="text-xs text-nexus-muted">{error}</p>}

      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-nexus-border bg-black">
        <iframe
          key={src}
          title="Carte"
          src={src}
          className="h-full w-full"
          style={{ border: 0 }}
        />
      </div>
    </div>
  );
}

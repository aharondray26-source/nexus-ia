import { useState, type FormEvent } from "react";
import { usePersistentState } from "../lib/persist";

// Meteo via Open-Meteo (gratuit, sans cle, avec CORS). On cherche d'abord la
// ville pour obtenir ses coordonnees, puis on demande les previsions.
const WEATHER_LABELS: Record<number, string> = {
  0: "Ciel degage",
  1: "Plutot degage",
  2: "Partiellement nuageux",
  3: "Couvert",
  45: "Brouillard",
  48: "Brouillard givrant",
  51: "Bruine legere",
  53: "Bruine",
  55: "Bruine forte",
  61: "Pluie faible",
  63: "Pluie",
  65: "Pluie forte",
  71: "Neige faible",
  73: "Neige",
  75: "Neige forte",
  80: "Averses",
  81: "Averses",
  82: "Averses violentes",
  95: "Orage",
  96: "Orage avec grele",
  99: "Orage violent",
};

interface Current {
  temperature: number;
  code: number;
  city: string;
}
interface Day {
  date: string;
  min: number;
  max: number;
  code: number;
}

export default function Weather() {
  const [city, setCity] = usePersistentState<string>("nexus.weatherCity", "Paris");
  const [input, setInput] = useState(city);
  const [current, setCurrent] = useState<Current | null>(null);
  const [days, setDays] = useState<Day[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchCityWeather(cityName: string) {
    const name = cityName.trim();
    if (!name) return;
    setLoading(true);
    setError(null);
    try {
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          name
        )}&count=1&language=fr&format=json`
      );
      const geo = await geoRes.json();
      const place = geo?.results?.[0];
      if (!place) {
        setError(`Ville « ${name} » introuvable.`);
        setCurrent(null);
        setDays([]);
        return;
      }
      const wRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}` +
          `&longitude=${place.longitude}&current=temperature_2m,weather_code` +
          `&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=4`
      );
      const w = await wRes.json();
      setCurrent({
        temperature: Math.round(w.current.temperature_2m),
        code: w.current.weather_code,
        city: `${place.name}${place.country ? ", " + place.country : ""}`,
      });
      setDays(
        w.daily.time.map((date: string, i: number) => ({
          date,
          min: Math.round(w.daily.temperature_2m_min[i]),
          max: Math.round(w.daily.temperature_2m_max[i]),
          code: w.daily.weather_code[i],
        }))
      );
      setCity(name);
    } catch {
      setError("Connexion météo indisponible.");
    } finally {
      setLoading(false);
    }
  }

  // Load default on mount
  if (!current && !loading && !error) {
    fetchCityWeather(city || "Paris");
  }

  function load(e: FormEvent) {
    e.preventDefault();
    fetchCityWeather(input);
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <form onSubmit={load} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ta ville..."
          className="nx-input flex-1 text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="nx-btn nx-btn-secondary text-sm"
        >
          {loading ? "..." : "Voir"}
        </button>
      </form>

      {error && <p className="text-sm text-nexus-muted">{error}</p>}

      {current && (
        <div className="flex flex-col gap-3">
          <div className="rounded-xl border border-nexus-border bg-nexus-bg p-4">
            <div className="text-sm text-nexus-muted">{current.city}</div>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="text-4xl font-light text-nexus-text">
                {current.temperature}°
              </span>
              <span className="text-sm text-nexus-muted">
                {WEATHER_LABELS[current.code] ?? "—"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {days.map((d) => (
              <div
                key={d.date}
                className="flex flex-col items-center gap-1 rounded-lg border border-nexus-border bg-nexus-bg p-2 text-center"
              >
                <span className="text-[10px] uppercase text-nexus-muted">
                  {new Date(d.date).toLocaleDateString("fr-FR", {
                    weekday: "short",
                  })}
                </span>
                <span className="text-xs text-nexus-text">{d.max}°</span>
                <span className="text-[10px] text-nexus-muted">{d.min}°</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!current && !error && !loading && (
        <p className="text-[11px] text-nexus-muted/70">
          Entre le nom de ta ville pour voir la meteo.
        </p>
      )}
    </div>
  );
}

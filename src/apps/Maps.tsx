import { useState, type FormEvent } from "react";
import {
  MapPin,
  Search,
  Layers,
  Navigation,
  Star,
  Compass,
  Maximize2,
  Info,
  Car,
  Bike,
  Footprints,
  Sparkles,
  ExternalLink
} from "lucide-react";

interface LocationPreset {
  name: string;
  category: "Capitale" | "Monument" | "Nature" | "Ville";
  lat: number;
  lon: number;
  desc: string;
}

const PRESETS: LocationPreset[] = [
  { name: "Paris, France", category: "Capitale", lat: 48.8566, lon: 2.3522, desc: "Tour Eiffel, Louvre & Seine" },
  { name: "Lyon, France", category: "Ville", lat: 45.764, lon: 4.8357, desc: "Château, Vieux-Lyon & Rhône" },
  { name: "Marseille, France", category: "Ville", lat: 43.2965, lon: 5.3698, desc: "Vieux-Port & Calanques" },
  { name: "Bordeaux, France", category: "Ville", lat: 44.8378, lon: -0.5792, desc: "Cité du Vin & Garonne" },
  { name: "Tokyo, Japon", category: "Capitale", lat: 35.6762, lon: 139.6503, desc: "Shinjuku & Mount Fuji" },
  { name: "New York, USA", category: "Ville", lat: 40.7128, lon: -74.006, desc: "Manhattan, Times Square & Central Park" },
  { name: "Londres, UK", category: "Capitale", lat: 51.5074, lon: -0.1278, desc: "Big Ben & Tamise" },
  { name: "Rome, Italie", category: "Capitale", lat: 41.9028, lon: 12.4964, desc: "Colisée & Vatican" },
  { name: "Mont-Saint-Michel", category: "Monument", lat: 48.6361, lon: -1.5115, desc: "Merveille de Normandie" },
  { name: "Grand Canyon, USA", category: "Nature", lat: 36.1069, lon: -112.1129, desc: "Parc National d'Arizona" },
];

export default function Maps() {
  const [currentLat, setCurrentLat] = useState(48.8566);
  const [currentLon, setCurrentLon] = useState(2.3522);
  const [currentName, setCurrentName] = useState("Paris, France");

  const [placeQuery, setPlaceQuery] = useState("");
  const [layer, setLayer] = useState<"mapnik" | "cycle" | "topo">("mapnik");
  const [zoomOffset, setZoomOffset] = useState(0.04);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Itinerary estimation states
  const [showDirections, setShowDirections] = useState(false);
  const [destPlace, setDestPlace] = useState("");
  const [routeInfo, setRouteInfo] = useState<{ distanceKm: number; carTime: string; bikeTime: string; walkTime: string } | null>(null);

  // Favorites
  const [favorites, setFavorites] = useState<{ name: string; lat: number; lon: number }[]>(() => {
    try {
      const saved = localStorage.getItem("nexus_maps_favs");
      return saved ? JSON.parse(saved) : [
        { name: "Paris, France", lat: 48.8566, lon: 2.3522 },
        { name: "Lyon, France", lat: 45.764, lon: 4.8357 }
      ];
    } catch {
      return [];
    }
  });

  const toggleFavorite = (name: string, lat: number, lon: number) => {
    const exists = favorites.some((f) => f.name === name);
    let updated;
    if (exists) {
      updated = favorites.filter((f) => f.name !== name);
    } else {
      updated = [...favorites, { name, lat, lon }];
    }
    setFavorites(updated);
    try {
      localStorage.setItem("nexus_maps_favs", JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const isFav = favorites.some((f) => f.name === currentName);

  // Construct iframe embed URL for OpenStreetMap
  const buildIframeUrl = (): string => {
    const d = zoomOffset;
    const bbox = `${currentLon - d}%2C${currentLat - d}%2C${currentLon + d}%2C${currentLat + d}`;
    let layerParam = "mapnik";
    if (layer === "cycle") layerParam = "cyclemap";
    if (layer === "topo") layerParam = "hot";

    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=${layerParam}&marker=${currentLat}%2C${currentLon}`;
  };

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    const q = placeQuery.trim();
    if (!q) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=fr&format=json`
      );
      const data = await res.json();
      const r = data?.results?.[0];

      if (!r) {
        setError(`Lieu « ${q} » introuvable.`);
        return;
      }

      setCurrentLat(r.latitude);
      setCurrentLon(r.longitude);
      setCurrentName(`${r.name}${r.country ? `, ${r.country}` : ""}`);
      setPlaceQuery("");
    } catch {
      setError("Connexion réseau indisponible.");
    } finally {
      setLoading(false);
    }
  };

  const calculateRoute = async (e: FormEvent) => {
    e.preventDefault();
    if (!destPlace.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destPlace)}&count=1&language=fr&format=json`
      );
      const data = await res.json();
      const r = data?.results?.[0];

      if (!r) {
        setError(`Destination « ${destPlace} » introuvable.`);
        return;
      }

      // Calculate approximate straight-line Haversine distance
      const R = 6371; // km
      const dLat = ((r.latitude - currentLat) * Math.PI) / 180;
      const dLon = ((r.longitude - currentLon) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((currentLat * Math.PI) / 180) *
          Math.cos((r.latitude * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const dist = Math.round(R * c * 1.2 * 10) / 10; // 1.2 road factor

      const carMinutes = Math.round((dist / 80) * 60);
      const bikeMinutes = Math.round((dist / 18) * 60);
      const walkMinutes = Math.round((dist / 4.5) * 60);

      setRouteInfo({
        distanceKm: dist,
        carTime: carMinutes > 60 ? `${Math.floor(carMinutes / 60)}h ${carMinutes % 60}m` : `${carMinutes} min`,
        bikeTime: bikeMinutes > 60 ? `${Math.floor(bikeMinutes / 60)}h ${bikeMinutes % 60}m` : `${bikeMinutes} min`,
        walkTime: walkMinutes > 60 ? `${Math.floor(walkMinutes / 60)}h ${walkMinutes % 60}m` : `${walkMinutes} min`,
      });
    } catch {
      setError("Erreur de calcul de l'itinéraire.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full w-full bg-slate-950 text-slate-100 flex-col overflow-hidden">
      {/* Search Header Bar */}
      <div className="p-3 border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
        <form onSubmit={handleSearch} className="flex-1 min-w-[240px] flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={placeQuery}
              onChange={(e) => setPlaceQuery(e.target.value)}
              placeholder="Rechercher une ville, adresse, monument..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/60"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 nx-grad hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? "..." : "Rechercher"}
          </button>
        </form>

        {/* Map Controls */}
        <div className="flex items-center gap-2">
          {/* Layers Toggle */}
          <div className="flex bg-slate-950 border border-slate-800 rounded-xl p-1 text-[11px] font-semibold">
            <button
              onClick={() => setLayer("mapnik")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                layer === "mapnik" ? "bg-cyan-500 text-slate-950 font-bold shadow-sm" : "text-slate-400 hover:text-white"
              }`}
            >
              Standard
            </button>
            <button
              onClick={() => setLayer("cycle")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                layer === "cycle" ? "bg-cyan-500 text-slate-950 font-bold shadow-sm" : "text-slate-400 hover:text-white"
              }`}
            >
              Transport
            </button>
            <button
              onClick={() => setLayer("topo")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                layer === "topo" ? "bg-cyan-500 text-slate-950 font-bold shadow-sm" : "text-slate-400 hover:text-white"
              }`}
            >
              Relief
            </button>
          </div>

          {/* Toggle Directions Panel */}
          <button
            onClick={() => setShowDirections(!showDirections)}
            className={`p-2 rounded-xl border text-xs font-bold transition-all ${
              showDirections
                ? "bg-cyan-500/20 border-cyan-500 text-cyan-200"
                : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
            }`}
            title="Calculateur d'itinéraires"
          >
            <Navigation className="w-4 h-4" />
          </button>

          {/* Fav toggle */}
          <button
            onClick={() => toggleFavorite(currentName, currentLat, currentLon)}
            className={`p-2 rounded-xl border text-xs font-bold transition-all ${
              isFav
                ? "bg-amber-500/20 border-amber-500 text-amber-300"
                : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
            }`}
            title="Ajouter aux favoris"
          >
            <Star className={`w-4 h-4 ${isFav ? "fill-amber-400" : ""}`} />
          </button>
        </div>
      </div>

      {error && <div className="px-4 py-2 bg-rose-500/20 text-rose-300 text-xs font-medium">{error}</div>}

      {/* Main Map + Side Panel Container */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Map Viewport Frame */}
        <div className="flex-1 h-full bg-slate-950 relative">
          <iframe
            key={`${currentLat}-${currentLon}-${zoomOffset}-${layer}`}
            title="Carte Interactive Nexus"
            src={buildIframeUrl()}
            className="w-full h-full border-0"
          />

          {/* Current Location Badge Overlay */}
          <div className="absolute top-3 left-3 bg-slate-950/90 border border-slate-800/90 backdrop-blur-md px-3.5 py-2 rounded-xl shadow-xl flex items-center gap-2">
            <MapPin className="w-4 h-4 text-cyan-400" />
            <div>
              <p className="text-xs font-extrabold text-white">{currentName}</p>
              <p className="text-[10px] text-slate-400 font-mono">
                {currentLat.toFixed(4)}° N, {currentLon.toFixed(4)}° E
              </p>
            </div>
          </div>

          {/* Zoom Buttons Overlay */}
          <div className="absolute bottom-4 right-4 flex flex-col bg-slate-950/90 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
            <button
              onClick={() => setZoomOffset((z) => Math.max(0.005, z * 0.5))}
              className="p-2.5 hover:bg-slate-800 text-slate-200 font-bold border-b border-slate-800 transition-colors"
              title="Zoom +"
            >
              +
            </button>
            <button
              onClick={() => setZoomOffset((z) => Math.min(0.5, z * 2))}
              className="p-2.5 hover:bg-slate-800 text-slate-200 font-bold transition-colors"
              title="Dézoom -"
            >
              -
            </button>
          </div>
        </div>

        {/* Directions / Presets Side Drawer */}
        <div className="w-72 sm:w-80 shrink-0 bg-slate-900/95 border-l border-slate-800/80 flex flex-col p-4 gap-4 overflow-y-auto">
          {/* Directions Panel if open */}
          {showDirections ? (
            <div className="space-y-3 bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5">
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold">
                <Navigation className="w-4 h-4" />
                <span>Itinéraire & Estimation</span>
              </div>

              <form onSubmit={calculateRoute} className="space-y-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Départ :</label>
                  <div className="text-xs font-semibold text-white truncate px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg">
                    {currentName}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Arrivée :</label>
                  <input
                    type="text"
                    value={destPlace}
                    onChange={(e) => setDestPlace(e.target.value)}
                    placeholder="Entrez une destination..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 bg-cyan-500 text-slate-950 font-bold text-xs rounded-lg transition-all"
                >
                  Calculer
                </button>
              </form>

              {routeInfo && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <p className="text-xs font-bold text-white">Distance : {routeInfo.distanceKm} km</p>
                  <div className="grid grid-cols-3 gap-1 text-[11px]">
                    <div className="p-2 bg-slate-900 rounded-lg text-center">
                      <Car className="w-3.5 h-3.5 text-cyan-400 mx-auto mb-1" />
                      <span className="font-bold text-white block">{routeInfo.carTime}</span>
                    </div>
                    <div className="p-2 bg-slate-900 rounded-lg text-center">
                      <Bike className="w-3.5 h-3.5 text-emerald-400 mx-auto mb-1" />
                      <span className="font-bold text-white block">{routeInfo.bikeTime}</span>
                    </div>
                    <div className="p-2 bg-slate-900 rounded-lg text-center">
                      <Footprints className="w-3.5 h-3.5 text-amber-400 mx-auto mb-1" />
                      <span className="font-bold text-white block">{routeInfo.walkTime}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* Presets & Favorites List */}
          <div className="space-y-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Destinations Raccourcis
            </span>

            <div className="space-y-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => {
                    setCurrentLat(p.lat);
                    setCurrentLon(p.lon);
                    setCurrentName(p.name);
                  }}
                  className="w-full text-left p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-cyan-500/40 hover:bg-slate-900 transition-all group flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-200 group-hover:text-cyan-300">{p.name}</p>
                    <p className="text-[10px] text-slate-500">{p.desc}</p>
                  </div>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-semibold">
                    {p.category}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

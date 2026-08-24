import { useState, useEffect, useRef, type FormEvent } from "react";
import { Search, Play, Pause, Music, Radio, Youtube, Disc, Link as LinkIcon, Volume2, Sparkles, ExternalLink, RefreshCw } from "lucide-react";

interface SongResult {
  trackId: number | string;
  trackName: string;
  artistName: string;
  collectionName?: string;
  artworkUrl100?: string;
  previewUrl?: string;
  kind?: string;
}

const STATIONS = [
  { name: "Lo-Fi Beats", id: "jfKfPfyJRdk", genre: "Relax & Focus" },
  { name: "Synthwave", id: "4xDzrJKXOOY", genre: "Cyberpunk Vibe" },
  { name: "Jazz Café", id: "Dx5qFachd3A", genre: "Douceur & Travail" },
  { name: "Piano Solo", id: "TtkFsfOP9QI", genre: "Classique Intense" },
  { name: "Nature & Rain", id: "eKFTSSKCzWA", genre: "Sons de la nature" },
  { name: "Chilled Hits", id: "5qap5aO4i9A", genre: "Pop Moderne" }
];

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
  const [activeTab, setActiveTab] = useState<"search" | "radio" | "custom">("search");
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SongResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Active track state
  const [currentSong, setCurrentSong] = useState<SongResult | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [youtubeId, setYoutubeId] = useState<string | null>(STATIONS[0].id);
  const [customAudioUrl, setCustomAudioUrl] = useState<string | null>(null);

  // Station index
  const [stationIndex, setStationIndex] = useState(0);

  // Link input state
  const [linkInput, setLinkInput] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initial search or default tracks
  useEffect(() => {
    fetchMusic("Daft Punk Stromae Coldplay");
  }, []);

  // Listen for global music play events from Nexus Assistant
  useEffect(() => {
    const handlePlayMusic = (e: CustomEvent) => {
      if (e.detail?.query) {
        setQuery(e.detail.query);
        setActiveTab("search");
        fetchMusic(e.detail.query);
      } else if (e.detail?.stationIndex !== undefined) {
        selectStation(e.detail.stationIndex);
      }
    };

    window.addEventListener("nexus:play-music" as any, handlePlayMusic);
    return () => window.removeEventListener("nexus:play-music" as any, handlePlayMusic);
  }, []);

  async function fetchMusic(searchTerm: string) {
    if (!searchTerm.trim()) return;
    setIsSearching(true);
    setSearchError(null);
    try {
      const res = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(
          searchTerm
        )}&entity=song&limit=18`
      );
      if (!res.ok) throw new Error("Erreur réseau");
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        setResults(data.results);
      } else {
        setResults([]);
        setSearchError(`Aucun morceau trouvé pour "${searchTerm}". Essaie un autre artiste.`);
      }
    } catch (err) {
      console.error("Erreur de recherche musicale:", err);
      setSearchError("Impossible de se connecter au service musical. Vérifiez votre connexion.");
    } finally {
      setIsSearching(false);
    }
  }

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    fetchMusic(query);
  }

  function playTrack(song: SongResult) {
    setCurrentSong(song);
    setYoutubeId(null);
    setCustomAudioUrl(null);

    if (song.previewUrl) {
      if (audioRef.current) {
        audioRef.current.src = song.previewUrl;
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      }
    }
  }

  function toggleAudioPlay() {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }

  function selectStation(idx: number) {
    const wrapped = (idx + STATIONS.length) % STATIONS.length;
    setStationIndex(wrapped);
    const st = STATIONS[wrapped];
    setYoutubeId(st.id);
    setCurrentSong(null);
    setCustomAudioUrl(null);
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }

  function handlePlayLinkSubmit(e: FormEvent) {
    e.preventDefault();
    const input = linkInput.trim();
    if (!input) return;

    // Check if it's a direct audio URL (.mp3, .wav, .m4a, etc.)
    if (/^https?:\/\/.*?\.(mp3|wav|ogg|m4a|aac)(\?.*)?$/i.test(input)) {
      setLinkError(null);
      setYoutubeId(null);
      setCustomAudioUrl(input);
      setCurrentSong({
        trackId: Date.now(),
        trackName: "Lien Audio Personnalisé",
        artistName: "Source Directe",
        previewUrl: input,
      });
      if (audioRef.current) {
        audioRef.current.src = input;
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      }
      return;
    }

    // Check YouTube video ID or link
    const ytId = extractVideoId(input);
    if (ytId) {
      setLinkError(null);
      setCurrentSong(null);
      setCustomAudioUrl(null);
      setYoutubeId(ytId);
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
      return;
    }

    setLinkError("Lien non reconnu. Saisissez un lien YouTube ou un fichier audio MP3 valide.");
  }

  return (
    <div className="flex h-full flex-col gap-3 p-1 bg-slate-950 text-white rounded-xl select-none">
      {/* Tab Navigation Bar */}
      <div className="flex items-center justify-between gap-2 bg-slate-900/90 p-1.5 rounded-xl border border-white/10 shrink-0">
        <button
          onClick={() => setActiveTab("search")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
            activeTab === "search"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Artistes & Titres</span>
        </button>

        <button
          onClick={() => setActiveTab("radio")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
            activeTab === "radio"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Ambiance & Radio</span>
        </button>

        <button
          onClick={() => setActiveTab("custom")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
            activeTab === "custom"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Youtube className="w-3.5 h-3.5" />
          <span>Coller Lien URL</span>
        </button>
      </div>

      {/* Hidden HTML5 Audio Element for iTunes Previews / Direct MP3 */}
      <audio
        ref={audioRef}
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />

      {/* SEARCH TAB CONTENT */}
      {activeTab === "search" && (
        <div className="flex flex-1 flex-col gap-2 min-h-0">
          <form onSubmit={handleSearchSubmit} className="flex gap-2 shrink-0">
            <div className="relative flex-1">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Chercher un chanteur, groupe ou titre (ex: Stromae, Daft Punk)..."
                className="w-full rounded-xl border border-white/10 bg-slate-900/90 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 outline-none focus:border-purple-500 transition-all"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-500 shadow-md shadow-purple-600/20 active:scale-95 transition-all shrink-0"
            >
              {isSearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              <span>Chercher</span>
            </button>
          </form>

          {/* Results Grid */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 [scrollbar-width:thin]">
            {isSearching && (
              <div className="flex h-32 items-center justify-center gap-2 text-xs text-slate-400 animate-pulse">
                <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
                <span>Recherche dans le catalogue musical...</span>
              </div>
            )}

            {!isSearching && searchError && (
              <div className="p-4 rounded-xl bg-slate-900 border border-white/10 text-center text-xs text-slate-400">
                {searchError}
              </div>
            )}

            {!isSearching &&
              results.map((song) => {
                const isSelected = currentSong?.trackId === song.trackId;
                return (
                  <div
                    key={song.trackId}
                    onClick={() => playTrack(song)}
                    className={`group flex items-center justify-between gap-3 p-2 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-purple-600/20 border-purple-500/50 shadow-md shadow-purple-600/10"
                        : "bg-slate-900/60 border-white/5 hover:bg-slate-900 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-11 h-11 rounded-lg overflow-hidden shrink-0 bg-slate-800 border border-white/10">
                        {song.artworkUrl100 ? (
                          <img
                            src={song.artworkUrl100.replace("100x100", "200x200")}
                            alt={song.trackName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Music className="w-5 h-5 m-auto text-slate-500" />
                        )}
                        <div
                          className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${
                            isSelected && isPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                          }`}
                        >
                          {isSelected && isPlaying ? (
                            <Pause className="w-5 h-5 text-purple-400 fill-purple-400 animate-pulse" />
                          ) : (
                            <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                          )}
                        </div>
                      </div>

                      <div className="min-w-0 flex flex-col">
                        <span className={`text-xs font-bold truncate ${isSelected ? "text-purple-300" : "text-white"}`}>
                          {song.trackName}
                        </span>
                        <span className="text-[11px] text-slate-400 truncate">{song.artistName}</span>
                        {song.collectionName && (
                          <span className="text-[10px] text-slate-500 truncate">{song.collectionName}</span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playTrack(song);
                      }}
                      className={`p-2 rounded-lg border transition-all ${
                        isSelected && isPlaying
                          ? "bg-purple-600 text-white border-purple-400"
                          : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/15"
                      }`}
                    >
                      {isSelected && isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* RADIO & STATIONS TAB */}
      {activeTab === "radio" && (
        <div className="flex flex-1 flex-col gap-3 min-h-0">
          <div className="grid grid-cols-2 gap-2">
            {STATIONS.map((st, i) => {
              const isActive = youtubeId === st.id;
              return (
                <button
                  key={st.id}
                  onClick={() => selectStation(i)}
                  className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                    isActive
                      ? "bg-purple-600/20 border-purple-500 shadow-md shadow-purple-600/20"
                      : "bg-slate-900/60 border-white/10 hover:bg-slate-900 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-xs font-bold text-white">{st.name}</span>
                    <Radio className={`w-3.5 h-3.5 ${isActive ? "text-purple-400 animate-pulse" : "text-slate-500"}`} />
                  </div>
                  <span className="text-[10px] text-slate-400">{st.genre}</span>
                </button>
              );
            })}
          </div>

          {youtubeId && (
            <div className="flex-1 overflow-hidden rounded-xl border border-white/10 bg-black shadow-inner">
              <iframe
                key={youtubeId}
                title="Radio Station Player"
                src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
                className="h-full w-full"
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
            </div>
          )}
        </div>
      )}

      {/* CUSTOM LINK TAB */}
      {activeTab === "custom" && (
        <div className="flex flex-1 flex-col gap-3 min-h-0 p-2">
          <form onSubmit={handlePlayLinkSubmit} className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5 text-purple-400" />
              <span>Collez une URL YouTube ou un fichier MP3 :</span>
            </label>
            <div className="flex gap-2">
              <input
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                placeholder="ex: https://www.youtube.com/watch?v=... ou https://site.com/audio.mp3"
                className="flex-1 rounded-xl border border-white/10 bg-slate-900/90 px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-500 shadow-md shadow-purple-600/20 active:scale-95 transition-all"
              >
                Lancer
              </button>
            </div>
            {linkError && <p className="text-[11px] text-amber-400 font-medium">{linkError}</p>}
          </form>

          {youtubeId && (
            <div className="flex-1 overflow-hidden rounded-xl border border-white/10 bg-black">
              <iframe
                key={youtubeId}
                title="YouTube Player"
                src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
                className="h-full w-full"
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
            </div>
          )}
        </div>
      )}

      {/* BOTTOM AUDIO PLAYER BAR (When playing iTunes preview or custom MP3) */}
      {currentSong && (
        <div className="flex items-center justify-between gap-3 bg-slate-900/90 p-2.5 rounded-xl border border-purple-500/30 shrink-0 shadow-xl">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-slate-800 border border-white/10 overflow-hidden shrink-0">
              {currentSong.artworkUrl100 ? (
                <img src={currentSong.artworkUrl100} alt={currentSong.trackName} className="w-full h-full object-cover" />
              ) : (
                <Disc className="w-5 h-5 text-purple-400 m-auto animate-spin" />
              )}
            </div>
            <div className="min-w-0 flex flex-col">
              <span className="text-xs font-bold text-white truncate">{currentSong.trackName}</span>
              <span className="text-[10px] text-purple-300 truncate">{currentSong.artistName}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={toggleAudioPlay}
              className="p-2 rounded-full bg-purple-600 text-white hover:bg-purple-500 shadow-md shadow-purple-600/30 active:scale-95 transition-all"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

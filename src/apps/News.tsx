import React, { useState } from "react";

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: "En cours" | "Terminé" | "À venir";
  minute?: string;
  league: string;
}

interface NewsItem {
  id: string;
  title: string;
  category: "Football" | "Tech" | "Monde" | "Sciences";
  time: string;
  summary: string;
  image: string;
  source: string;
}

const MATCHES: Match[] = [
  { id: "m1", homeTeam: "Paris SG", awayTeam: "Marseille", homeScore: 2, awayScore: 1, status: "En cours", minute: "74'", league: "Ligue 1" },
  { id: "m2", homeTeam: "Real Madrid", awayTeam: "FC Barcelone", homeScore: 3, awayScore: 2, status: "Terminé", league: "La Liga" },
  { id: "m3", homeTeam: "Arsenal", awayTeam: "Manchester City", homeScore: 1, awayScore: 1, status: "En cours", minute: "52'", league: "Premier League" },
  { id: "m4", homeTeam: "Bayern Munich", awayTeam: "Dortmund", homeScore: 0, awayScore: 0, status: "À venir", league: "Bundesliga" }
];

const NEWS: NewsItem[] = [
  {
    id: "n1",
    title: "Ligue des Champions : Qualification épique lors de la nuit des tirs au but",
    category: "Football",
    time: "Il y a 15 min",
    summary: "Un scénario d'une intensité folle s'est déroulé hier soir au sommet du football européen.",
    image: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&auto=format&fit=crop&q=80",
    source: "L'Équipe"
  },
  {
    id: "n2",
    title: "Modèles d'IA & Systèmes Liquides : La révolution de l'expérience utilisateur",
    category: "Tech",
    time: "Il y a 45 min",
    summary: "Découvrez comment la fluidité des interfaces réinvente l'interaction homme-machine.",
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80",
    source: "Nexus Tech"
  },
  {
    id: "n3",
    title: "Mission spatiale Artemis : De nouvelles découvertes fascinantes révélées",
    category: "Sciences",
    time: "Il y a 2h",
    summary: "Les dernières captures transmises par la sonde confirment des données géologiques majeures.",
    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80",
    source: "Sciences & Avenir"
  }
];

export default function News() {
  const [tab, setTab] = useState<"football" | "news">("football");
  const [filter, setFilter] = useState("Tous");

  return (
    <div className="flex h-full flex-col bg-nexus-bg text-nexus-text">
      {/* Tab Navigation */}
      <div className="flex items-center justify-between border-b border-nexus-border bg-nexus-panel/50 px-4 py-2.5 backdrop-blur-md">
        <div className="flex gap-2">
          <button
            onClick={() => setTab("football")}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
              tab === "football"
                ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/20"
                : "text-nexus-muted hover:bg-white/5 hover:text-white"
            }`}
          >
            ⚽ Direct Foot & Scores
          </button>
          <button
            onClick={() => setTab("news")}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
              tab === "news"
                ? "bg-blue-500 text-white shadow-md shadow-blue-500/20"
                : "text-nexus-muted hover:bg-white/5 hover:text-white"
            }`}
          >
            📰 Fil d'Actualités
          </button>
        </div>

        <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Live Feed Nexus
        </span>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {tab === "football" ? (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-white flex items-center justify-between">
              <span>Matchs en Direct & Derniers Résultats</span>
              <span className="text-[10px] text-nexus-muted font-normal">Mise à jour en temps réel</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {MATCHES.map((m) => (
                <div
                  key={m.id}
                  className="rounded-2xl border border-nexus-border bg-nexus-panel/40 p-4 space-y-3 hover:border-emerald-500/40 transition-all"
                >
                  <div className="flex items-center justify-between text-[10px] text-nexus-muted">
                    <span className="font-semibold text-emerald-300">{m.league}</span>
                    {m.status === "En cours" ? (
                      <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-red-400 font-bold animate-pulse">
                        LIVE {m.minute}
                      </span>
                    ) : (
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-nexus-muted">{m.status}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between px-2">
                    <span className="text-sm font-bold text-white w-2/5 truncate">{m.homeTeam}</span>
                    <div className="rounded-xl bg-black/60 px-3 py-1 text-base font-extrabold text-emerald-400 tracking-wider">
                      {m.homeScore} - {m.awayScore}
                    </div>
                    <span className="text-sm font-bold text-white w-2/5 text-right truncate">{m.awayTeam}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2">
              {["Tous", "Football", "Tech", "Sciences"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    filter === cat ? "bg-white/20 text-white" : "text-nexus-muted hover:text-white"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4">
              {NEWS.filter((n) => filter === "Tous" || n.category === filter).map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-nexus-border bg-nexus-panel/40 p-3 flex flex-col md:flex-row gap-4 hover:border-blue-500/40 transition-all"
                >
                  <img src={item.image} alt={item.title} className="h-32 md:w-44 rounded-xl object-cover" />
                  <div className="flex-1 flex flex-col justify-between space-y-2">
                    <div>
                      <div className="flex items-center gap-2 text-[10px] text-nexus-muted">
                        <span className="rounded-md bg-blue-500/20 px-2 py-0.5 text-blue-300 font-semibold">{item.category}</span>
                        <span>{item.source} • {item.time}</span>
                      </div>
                      <h4 className="text-xs font-bold text-white mt-1">{item.title}</h4>
                      <p className="text-[11px] text-nexus-muted mt-1 leading-relaxed">{item.summary}</p>
                    </div>
                    <button className="self-start text-[11px] text-blue-400 hover:underline">Lire la suite →</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

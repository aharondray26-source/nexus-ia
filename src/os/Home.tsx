import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Search, Compass, Rocket, Zap, Shield, Grid, LayoutGrid, Cpu, Wrench, Gamepad2, Palette } from "lucide-react";
import { useWindows } from "./useWindows";
import { useSettings, resolveWallpaper } from "./useSettings";
import { APPS, AppDefinition } from "./appsRegistry";
import { getActivity } from "../lib/activity";
import { searchShortcutLabel } from "../lib/platform";
import HomeWidgets from "./HomeWidgets";
import Icon from "./Icons";
import Logo from "./Logo";

const QUOTES = [
  "La constance vaut mieux que l'intensité.",
  "Ce qui est noté n'encombre plus l'esprit.",
  "Commencer petit, mais commencer.",
  "La clarté de l'espace fait la clarté des idées.",
  "Un jour à la fois, une chose à la fois.",
  "Le calme est une forme de puissance.",
  "Apprendre un peu chaque jour finit par tout changer.",
  "La simplicité est la sophistication suprême.",
  "Ce que tu fais chaque jour compte plus que ce que tu fais parfois.",
  "L'attention est la ressource la plus précieuse.",
];

function quoteOfTheDay(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const day = Math.floor((now.getTime() - start.getTime()) / 86400000);
  return QUOTES[day % QUOTES.length];
}

type CategoryType = "all" | "ai" | "productivity" | "entertainment" | "creation";

export default function Home() {
  const [now, setNow] = useState(new Date());
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>("all");
  const [welcomed, setWelcomed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("nexus.welcomed") === "1";
    } catch {
      return true;
    }
  });

  function dismissWelcome() {
    try {
      localStorage.setItem("nexus.welcomed", "1");
    } catch {}
    setWelcomed(true);
  }

  const setPaletteOpen = useWindows((s) => s.setPaletteOpen);
  const openApp = useWindows((s) => s.openApp);
  const userName = useSettings((s) => s.userName);
  const wallpaper = useSettings((s) => s.wallpaper);
  const widgets = useSettings((s) => s.widgets);
  const iconColors = useSettings((s) => s.iconColors);
  const customWallpaper = useSettings((s) => s.customWallpaper);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const css = resolveWallpaper(wallpaper, customWallpaper);

  const hour = now.getHours();
  const salut =
    hour < 6
      ? "Bonne nuit"
      : hour < 12
      ? "Bonjour"
      : hour < 18
      ? "Bon après-midi"
      : "Bonsoir";

  const activity = getActivity();

  // Categorize apps for discovery
  const getCategoryApps = (): AppDefinition[] => {
    const visibleApps = APPS.filter((a) => !a.hidden);
    if (selectedCategory === "ai") {
      return visibleApps.filter((a) => ["nexus-chat", "ai", "cloud", "messages", "notes", "files", "sheet", "terminal", "web"].includes(a.id));
    }
    if (selectedCategory === "productivity") {
      return visibleApps.filter((a) => ["cloud", "messages", "tasks", "calendar", "calculator", "converter", "clock", "weather", "mail", "learn", "annales", "dictionary", "translator", "today"].includes(a.id));
    }
    if (selectedCategory === "entertainment") {
      return visibleApps.filter((a) => ["game", "recipes", "deals", "news", "focus", "soundscapes", "onthisday"].includes(a.id));
    }
    if (selectedCategory === "creation") {
      return visibleApps.filter((a) => ["whiteboard", "image", "video", "notes"].includes(a.id));
    }
    return visibleApps;
  };

  const currentApps = getCategoryApps();

  const handleTriggerAiPrompt = (promptText: string) => {
    window.dispatchEvent(new CustomEvent("nexus:open-ai"));
  };

  return (
    <div
      className="absolute inset-0 overflow-y-auto select-none py-10 px-4 sm:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      onDoubleClick={(e) => {
        if (e.target === e.currentTarget) setPaletteOpen(true);
      }}
    >
      <div
        className="pointer-events-none fixed inset-0 transition-all duration-700"
        style={{ background: css }}
      />

      <div className="relative z-10 flex min-h-full flex-col items-center justify-center gap-8 max-w-5xl mx-auto py-6">
        {/* Clock & Greeting Hero */}
        <div className="text-center space-y-2 drop-shadow-2xl">
          <div className="text-6xl sm:text-7xl font-extralight tracking-tight text-white font-sans">
            {now.toLocaleTimeString("fr-FR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
          <div className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-cyan-200/90">
            {now.toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-nexus-text pt-1 flex items-center justify-center gap-2">
            <span>{salut}{userName ? `, ${userName}` : ""}</span>
            <span className="inline-block animate-bounce">✨</span>
          </h1>
          {widgets.quote && (
            <p className="text-xs italic text-nexus-muted max-w-md mx-auto">
              « {quoteOfTheDay()} »
            </p>
          )}
        </div>

        {/* AI Command & Quick Prompt Search Bar */}
        <div className="w-full max-w-xl space-y-3">
          <div className="relative group">
            <div className="absolute -inset-1 rounded-3xl nx-grad opacity-30 group-hover:opacity-75 blur-md transition duration-500" />
            <button
              onClick={() => setPaletteOpen(true)}
              className="relative flex w-full items-center justify-between gap-3 rounded-2xl border border-nexus-border bg-nexus-panel px-5 py-3.5 text-sm text-nexus-text backdrop-blur-2xl transition-all duration-300 hover:bg-nexus-card shadow-2xl"
            >
              <span className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
                <span className="text-xs sm:text-sm font-medium">Lancer une recherche ou poser une question à l'IA...</span>
              </span>
              <kbd className="nx-btn nx-btn-secondary text-[10px] font-mono">
                {searchShortcutLabel()}
              </kbd>
            </button>
          </div>

          {/* AI Quick Prompts Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => handleTriggerAiPrompt("Résoudre un devoir ou un problème")}
              className="nx-btn nx-btn-secondary text-xs flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>Devoirs & AI</span>
            </button>
            <button
              onClick={() => openApp("game", { width: 760, height: 620 })}
              className="nx-btn nx-btn-secondary text-xs flex items-center gap-1.5"
            >
              <Gamepad2 className="w-3.5 h-3.5 text-purple-400" />
              <span>Partie d'Échecs</span>
            </button>
            <button
              onClick={() => openApp("recipes", { width: 680, height: 520 })}
              className="nx-btn nx-btn-secondary text-xs flex items-center gap-1.5"
            >
              <Compass className="w-3.5 h-3.5 text-emerald-400" />
              <span>Recettes du Chef</span>
            </button>
            <button
              onClick={() => openApp("whiteboard", { width: 720, height: 520 })}
              className="nx-btn nx-btn-secondary text-xs flex items-center gap-1.5"
            >
              <Palette className="w-3.5 h-3.5 text-amber-400" />
              <span>Tableau Blanc</span>
            </button>
          </div>
        </div>

        {/* Live Widgets Section */}
        <HomeWidgets />

        {/* Apps Discovery Hub Section */}
        <div className="w-full bg-nexus-panel border border-nexus-border rounded-3xl p-5 sm:p-6 backdrop-blur-3xl shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-nexus-border pb-4">
            <div className="flex items-center gap-2">
              <div className="nx-btn nx-btn-icon">
                <LayoutGrid className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-nexus-text tracking-wide">
                  Catalogue des Applications & Outils
                </h2>
                <p className="text-xs text-nexus-muted">
                  {currentApps.length} applications prêtes à être exécutées
                </p>
              </div>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1 bg-nexus-card p-1 rounded-2xl border border-nexus-border text-xs">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                  selectedCategory === "all" ? "bg-cyan-600 text-white shadow-md" : "text-nexus-muted hover:text-nexus-text"
                }`}
              >
                Toutes
              </button>
              <button
                onClick={() => setSelectedCategory("ai")}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                  selectedCategory === "ai" ? "bg-purple-600 text-white shadow-md" : "text-nexus-muted hover:text-nexus-text"
                }`}
              >
                🤖 IA & Pro
              </button>
              <button
                onClick={() => setSelectedCategory("productivity")}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                  selectedCategory === "productivity" ? "bg-emerald-600 text-white shadow-md" : "text-nexus-muted hover:text-nexus-text"
                }`}
              >
                🛠️ Outils
              </button>
              <button
                onClick={() => setSelectedCategory("entertainment")}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                  selectedCategory === "entertainment" ? "bg-pink-600 text-white shadow-md" : "text-nexus-muted hover:text-nexus-text"
                }`}
              >
                🎮 Loisirs
              </button>
              <button
                onClick={() => setSelectedCategory("creation")}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                  selectedCategory === "creation" ? "bg-amber-600 text-white shadow-md" : "text-nexus-muted hover:text-nexus-text"
                }`}
              >
                🎨 Création
              </button>
            </div>
          </div>

          {/* Apps Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-2">
            {currentApps.map((app) => (
              <motion.button
                key={app.id}
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => openApp(app.id, { width: app.width, height: app.height })}
                className="group flex flex-col items-center gap-2 rounded-2xl border border-nexus-border bg-nexus-card p-3.5 backdrop-blur-xl transition-all duration-300 hover:border-cyan-400/50 hover:bg-nexus-card-hover shadow-lg relative overflow-hidden text-center"
              >
                {/* Subtle Glow on Hover */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-15 transition-opacity duration-300 pointer-events-none"
                  style={{ backgroundColor: app.hue }}
                />

                <span
                  className="p-2.5 rounded-2xl bg-nexus-panel border border-nexus-border group-hover:scale-110 transition-transform shadow-md"
                  style={{ color: iconColors ? app.hue : "#38bdf8" }}
                >
                  <Icon name={app.icon} size={26} />
                </span>

                <div className="min-w-0 w-full">
                  <h3 className="text-xs font-bold text-nexus-text group-hover:text-cyan-400 transition-colors truncate">
                    {app.title}
                  </h3>
                  <span className="text-[10px] text-nexus-muted block truncate capitalize font-mono mt-0.5">
                    {app.id}
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Activity Summary Badge */}
        {widgets.activity && activity.daysActive > 0 && (
          <div className="flex items-center gap-4 rounded-full border border-white/15 bg-black/60 px-6 py-2.5 text-xs text-slate-200 backdrop-blur-2xl shadow-xl">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white font-bold">{activity.daysActive}</span> jour{activity.daysActive > 1 ? "s" : ""} actif
            </span>
            <span className="h-3 w-px bg-white/20" />
            <span>
              <span className="text-white font-bold">{activity.notes}</span> note{activity.notes > 1 ? "s" : ""}
            </span>
            <span className="h-3 w-px bg-white/20" />
            <span>
              <span className="text-white font-bold">{activity.tasksDone}</span> tâche{activity.tasksDone > 1 ? "s" : ""} accomplie{activity.tasksDone > 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      {/* Welcome Overlay */}
      {!welcomed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex w-full max-w-md flex-col items-center gap-4 rounded-3xl border border-cyan-500/30 bg-slate-950/90 p-8 text-center shadow-2xl backdrop-blur-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1 nx-grad" />
            <Logo size={42} />
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              Bienvenue sur Nexus OS Pro
            </h2>
            <p className="text-xs leading-relaxed text-slate-300">
              Votre environnement multitâche intelligent nouvelle génération. Accédez aux applications depuis le catalogue, la barre latérale ou la recherche rapide avec{" "}
              <kbd className="rounded border border-white/20 px-2 py-0.5 text-[10px] text-cyan-300 bg-cyan-950 font-mono">
                {searchShortcutLabel()}
              </kbd>
              .
            </p>
            <button
              onClick={dismissWelcome}
              className="mt-2 rounded-2xl nx-grad px-8 py-3 text-xs font-extrabold text-white shadow-xl hover:scale-105 transition-all"
            >
              Explorer Nexus OS
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { useWindows } from "./useWindows";
import { useSettings, resolveWallpaper } from "./useSettings";
import { APPS } from "./appsRegistry";
import { getActivity } from "../lib/activity";
import { searchShortcutLabel } from "../lib/platform";
import HomeWidgets from "./HomeWidgets";
import Icon from "./Icons";
import Logo from "./Logo";

// Ecran d'accueil, affiche uniquement quand aucune fenetre n'est ouverte.
// Il porte le fond d'ecran, l'heure, la salutation, une barre de recherche
// bien visible (pour ne pas oublier Cmd+K), et des raccourcis rapides.
const QUICK = ["today", "ai", "notes", "learn", "focus", "maps"];

// Pensees sobres, une par jour (locales : aucune dependance au reseau).
const QUOTES = [
  "La constance vaut mieux que l'intensite.",
  "Ce qui est note n'encombre plus l'esprit.",
  "Commencer petit, mais commencer.",
  "La clarte de l'espace fait la clarte des idees.",
  "Un jour a la fois, une chose a la fois.",
  "Le calme est une forme de puissance.",
  "Apprendre un peu chaque jour finit par tout changer.",
  "La simplicite est la sophistication supreme.",
  "Ce que tu fais chaque jour compte plus que ce que tu fais parfois.",
  "L'attention est la ressource la plus precieuse.",
  "Terminer vaut mieux que perfectionner.",
  "Les grandes choses sont une suite de petites choses.",
  "Ecrire, c'est penser deux fois.",
  "Moins d'onglets, plus d'idees.",
  "Le silence aussi est un outil.",
  "Relire hier eclaire aujourd'hui.",
  "Une question bien posee est a moitie resolue.",
  "Ranger dehors, c'est ranger dedans.",
  "La curiosite ne vieillit pas.",
  "Demain commence ce soir.",
];

// Lien "code source" (open source), discret. A remplacer par l'adresse du
// depot GitHub une fois le code publie.
const SOURCE_URL = "https://github.com/";

function quoteOfTheDay(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const day = Math.floor((now.getTime() - start.getTime()) / 86400000);
  return QUOTES[day % QUOTES.length];
}

export default function Home() {
  const [now, setNow] = useState(new Date());
  // Carte de bienvenue : montree une seule fois, a la toute premiere visite.
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
    } catch {
      // Stockage indisponible : on ignore.
    }
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
      ? "Bon apres-midi"
      : "Bonsoir";

  const quickApps = QUICK.map((id) => APPS.find((a) => a.id === id)).filter(
    (a): a is (typeof APPS)[number] => Boolean(a)
  );

  const activity = getActivity();

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      onDoubleClick={(e) => {
        // Double-clic sur le vide : ouvre la recherche (reflexe de bureau).
        if (e.target === e.currentTarget) setPaletteOpen(true);
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: css }}
      />

      <div
        className="nexus-fade-in relative z-10 flex h-full flex-col items-center justify-center gap-8 px-6"
        onDoubleClick={(e) => {
          if (e.target === e.currentTarget) setPaletteOpen(true);
        }}
      >
        <div className="text-center">
          <div className="text-6xl font-extralight tracking-tight text-nexus-text">
            {now.toLocaleTimeString("fr-FR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
          <div className="mt-2 text-sm capitalize text-nexus-muted">
            {now.toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </div>
          <div className="mt-4 text-lg font-light text-nexus-text">
            {salut}
            {userName ? `, ${userName}` : ""}
          </div>
          {widgets.quote && (
            <p className="mt-2 text-xs italic text-nexus-muted/80">
              « {quoteOfTheDay()} »
            </p>
          )}
        </div>

        <button
          onClick={() => setPaletteOpen(true)}
          className="flex w-full max-w-md items-center justify-between gap-3 rounded-2xl border border-nexus-border bg-nexus-panel/70 px-5 py-3.5 text-sm text-nexus-muted backdrop-blur-[var(--glass-blur)] transition-all duration-300 hover:border-white/20 hover:bg-nexus-panel/90"
        >
          <span className="flex items-center gap-2.5">
            <Icon name="search" size={18} />
            Rechercher ou ouvrir un espace
          </span>
          <kbd className="kbd-hint rounded border border-nexus-border px-1.5 py-0.5 text-[10px]">
            {searchShortcutLabel()}
          </kbd>
        </button>

        <HomeWidgets />

        <div className="flex flex-wrap items-center justify-center gap-3">
          {quickApps.map((app) => (
            <button
              key={app.id}
              onClick={() => openApp(app.id, { width: app.width, height: app.height })}
              className="group flex w-20 flex-col items-center gap-2 rounded-xl border border-transparent px-2 py-3 transition-all duration-200 hover:border-nexus-border hover:bg-white/[0.03]"
            >
              <span
                className="text-nexus-muted transition-all group-hover:text-nexus-text"
                style={iconColors ? { color: app.hue, opacity: 0.9 } : undefined}
              >
                <Icon name={app.icon} size={24} />
              </span>
              <span className="text-[11px] text-nexus-muted transition-colors group-hover:text-nexus-text">
                {app.title}
              </span>
            </button>
          ))}
        </div>

        {/* Rendu sobre de ton activite (pas de "flammes", un simple reflet). */}
        {widgets.activity && activity.daysActive > 0 && (
          <div className="flex items-center gap-4 rounded-full border border-nexus-border bg-nexus-panel/50 px-5 py-2 text-[11px] text-nexus-muted backdrop-blur-[var(--glass-blur)]">
            <span>
              <span className="text-nexus-text">{activity.daysActive}</span> jour
              {activity.daysActive > 1 ? "s" : ""} ici
            </span>
            <span className="h-3 w-px bg-nexus-border" />
            <span>
              <span className="text-nexus-text">{activity.notes}</span> note
              {activity.notes > 1 ? "s" : ""}
            </span>
            <span className="h-3 w-px bg-nexus-border" />
            <span>
              <span className="text-nexus-text">{activity.tasksDone}</span> tache
              {activity.tasksDone > 1 ? "s" : ""} faite
              {activity.tasksDone > 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      {/* Lien open source, tres discret (pour les curieux qui scrutent). */}
      <a
        href={SOURCE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 text-[10px] text-nexus-muted/40 transition-colors hover:text-nexus-muted"
      >
        Code source · open source
      </a>

      {/* Bienvenue : une seule fois, a la premiere visite. */}
      {!welcomed && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="nexus-fade-in flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-nexus-border bg-nexus-panel p-7 text-center shadow-2xl">
            <Logo size={34} />
            <h2 className="text-lg font-medium text-nexus-text">
              Bienvenue sur Nexus
            </h2>
            <p className="text-sm leading-relaxed text-nexus-muted">
              Ton espace de travail tout-en-un. Chaque icone de la barre de
              gauche ouvre un outil dans sa propre fenetre. Retrouve tout avec{" "}
              <kbd className="rounded border border-nexus-border px-1.5 py-0.5 text-[10px]">
                {searchShortcutLabel()}
              </kbd>
              . Tes notes et fichiers sont enregistres automatiquement sur ton
              appareil : rien n'est envoye ni collecte.
            </p>
            <button
              onClick={dismissWelcome}
              className="mt-1 rounded-lg border px-6 py-2.5 text-sm font-medium transition-colors"
              style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
            >
              C'est parti
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

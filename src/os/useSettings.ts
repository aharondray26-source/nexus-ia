import { create } from "zustand";

// Couleurs d'accent proposees (sobres, pensees pour le fond sombre).
export const ACCENTS = [
  { name: "Indigo", value: "#6366f1" },
  { name: "Emeraude", value: "#10b981" },
  { name: "Ambre", value: "#f59e0b" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Ciel", value: "#38bdf8" },
  { name: "Violet", value: "#a855f7" },
];

// Ambiances de fond du bureau (quand des fenetres sont ouvertes : discret).
export const BACKGROUNDS = [
  { key: "nuit", label: "Nuit" },
  { key: "aurore", label: "Aurore" },
  { key: "ardoise", label: "Ardoise" },
  { key: "lueur", label: "Lueur" },
];

// Fonds d'ecran de l'accueil (uniquement quand aucune fenetre n'est ouverte).
// Ce sont des degrades vectoriels : nets a toutes les tailles, jamais pixelises.
// Ils s'adaptent a la couleur d'accent choisie.
export const WALLPAPERS: { key: string; label: string; css: string }[] = [
  {
    key: "monde",
    label: "Monde",
    css: "radial-gradient(900px 500px at 50% 0%, color-mix(in srgb, var(--accent) 15%, transparent), transparent 65%), url('/world.svg') center 45%/88% no-repeat, var(--nexus-bg)",
  },
  {
    key: "monde-froid",
    label: "Monde froid",
    css: "radial-gradient(900px 520px at 50% 8%, rgba(56,189,248,0.18), transparent 60%), url('/world.svg') center 45%/86% no-repeat, var(--nexus-bg)",
  },
  {
    key: "grille",
    label: "Grille",
    css: "repeating-linear-gradient(0deg, var(--nexus-border) 0 1px, transparent 1px 42px), repeating-linear-gradient(90deg, var(--nexus-border) 0 1px, transparent 1px 42px), radial-gradient(800px 460px at 50% -8%, color-mix(in srgb, var(--accent) 16%, transparent), transparent 62%), var(--nexus-bg)",
  },
  {
    key: "constellation",
    label: "Constellation",
    css: "radial-gradient(var(--nexus-border) 1px, transparent 1.6px) 0 0/26px 26px, radial-gradient(700px 460px at 50% 6%, color-mix(in srgb, var(--accent) 14%, transparent), transparent 62%), var(--nexus-bg)",
  },
  {
    key: "circuit",
    label: "Circuit",
    css: "repeating-linear-gradient(90deg, rgba(56,189,248,0.08) 0 1px, transparent 1px 60px), repeating-linear-gradient(0deg, rgba(56,189,248,0.08) 0 1px, transparent 1px 60px), radial-gradient(700px 500px at 50% 110%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 60%), var(--nexus-bg)",
  },
  {
    key: "ardoise",
    label: "Ardoise",
    css: "radial-gradient(1200px 620px at 50% -12%, var(--nexus-border), transparent 60%), var(--nexus-bg)",
  },
  {
    key: "aurore",
    label: "Aurore",
    css: "radial-gradient(900px 520px at 22% -8%, color-mix(in srgb, var(--accent) 38%, transparent), transparent 60%), var(--nexus-bg)",
  },
  {
    key: "prisme",
    label: "Prisme",
    css: "radial-gradient(620px 440px at 14% 22%, color-mix(in srgb, var(--accent) 32%, transparent), transparent 60%), radial-gradient(720px 520px at 86% 82%, color-mix(in srgb, var(--accent) 18%, transparent), transparent 60%), var(--nexus-bg)",
  },
  {
    key: "vague",
    label: "Vague",
    css: "linear-gradient(155deg, var(--nexus-bg) 42%, color-mix(in srgb, var(--accent) 24%, var(--nexus-bg)))",
  },
  {
    key: "brume",
    label: "Brume",
    css: "radial-gradient(520px 520px at 72% 28%, color-mix(in srgb, var(--accent) 24%, transparent), transparent 60%), radial-gradient(520px 420px at 18% 74%, var(--nexus-border), transparent 60%), var(--nexus-bg)",
  },
];

// Polices d'ecran adaptees et style Tech
export const FONTS = [
  { key: "system", name: "Système Épuré (Défaut)", family: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif", style: "Standard UI" },
  { key: "jakarta", name: "Plus Jakarta Tech", family: "'Plus Jakarta Sans', sans-serif", style: "Tech Pro Interface" },
  { key: "orbitron", name: "Orbitron Cyber HUD", family: "'Orbitron', sans-serif", style: "Futuriste Cyber Matrix" },
  { key: "jetbrains", name: "JetBrains Mono Code", family: "'JetBrains Mono', monospace", style: "Développeur & Code" },
  { key: "outfit", name: "Outfit Design", family: "'Outfit', sans-serif", style: "Géométrique & Élégant" },
  { key: "space", name: "Space Grotesk", family: "'Space Grotesk', sans-serif", style: "Modern Cyberpunk" },
  { key: "syne", name: "Syne Avant-Garde", family: "'Syne', sans-serif", style: "Sleek Minimalist" },
];

export function applyFont(fontKey: string) {
  if (typeof document !== "undefined") {
    const found = FONTS.find((f) => f.key === fontKey) || FONTS[0];
    document.documentElement.style.setProperty("--nexus-font", found.family);
  }
}

const DEFAULT_ACCENT = ACCENTS[0].value;

export interface HomeWidgets {
  activity: boolean;
  tasks: boolean;
  weather: boolean;
  history: boolean;
  quote: boolean;
}

const DEFAULT_WIDGETS: HomeWidgets = {
  activity: true,
  tasks: true,
  weather: true,
  history: true,
  quote: true,
};

// Resout le CSS du fond d'ecran choisi ("perso" = image importee).
export function resolveWallpaper(key: string, custom: string | null): string {
  if (key === "perso" && custom) {
    return `linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.2)), url('${custom}') center/cover no-repeat, var(--nexus-bg)`;
  }
  const found = WALLPAPERS.find((w) => w.key === key);
  return found ? found.css : WALLPAPERS[0].css;
}

export type ThemeMode = "dark" | "light";

export function applyTheme(mode: ThemeMode) {
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("light-mode", mode === "light");
    document.documentElement.style.colorScheme = mode;
  }
}

interface SettingsState {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  accent: string;
  font: string;
  setFont: (font: string) => void;
  glass: number;
  setGlass: (v: number) => void;
  dockPos: DockPos;
  setDockPos: (p: DockPos) => void;
  customWallpaper: string | null;
  setCustomWallpaper: (dataUrl: string) => void;
  iconColors: boolean;
  setIconColors: (on: boolean) => void;
  reduceMotion: boolean;
  setReduceMotion: (on: boolean) => void;
  largeText: boolean;
  setLargeText: (on: boolean) => void;
  autoMinimizeInactive: boolean;
  setAutoMinimizeInactive: (on: boolean) => void;
  userName: string;
  background: string;
  wallpaper: string;
  widgets: HomeWidgets;
  setAccent: (accent: string) => void;
  setUserName: (name: string) => void;
  setBackground: (background: string) => void;
  setWallpaper: (wallpaper: string) => void;
  toggleWidget: (key: keyof HomeWidgets) => void;
  reset: () => void;
}

// Applique la couleur d'accent a toute l'interface via une variable CSS.
function applyAccent(hex: string) {
  if (typeof document !== "undefined") {
    document.documentElement.style.setProperty("--accent", hex);
  }
}

// "Liquid glass" : intensite du flou translucide (0 = plat, 100 = tres verre).
export function applyGlass(glass: number) {
  if (typeof document !== "undefined") {
    const blur = 4 + (Math.max(0, Math.min(100, glass)) / 100) * 26;
    document.documentElement.style.setProperty("--glass-blur", blur.toFixed(1) + "px");
  }
}

// Accessibilite / confort : animations reduites et texte plus grand.
export function applyMotion(on: boolean) {
  if (typeof document !== "undefined")
    document.documentElement.classList.toggle("reduce-motion", on);
}
export function applyText(large: boolean) {
  if (typeof document !== "undefined")
    document.documentElement.style.fontSize = large ? "18px" : "";
}

export type DockPos = "left" | "right" | "top" | "bottom";

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

const initialAccent = load<string>("nexus.accent", DEFAULT_ACCENT);
applyAccent(initialAccent);
const initialFont = load<string>("nexus.font", "system");
applyFont(initialFont);
const initialGlass = load<number>("nexus.glass", 46);
applyGlass(initialGlass);
const initialMotion = load<boolean>("nexus.reduceMotion", false);
applyMotion(initialMotion);
const initialText = load<boolean>("nexus.largeText", false);
applyText(initialText);
const initialTheme = load<ThemeMode>("nexus.theme", "dark");
applyTheme(initialTheme);

export const useSettings = create<SettingsState>((set) => ({
  theme: initialTheme,
  setTheme: (mode) => {
    applyTheme(mode);
    localStorage.setItem("nexus.theme", JSON.stringify(mode));
    set({ theme: mode });
  },
  accent: initialAccent,
  font: initialFont,
  setFont: (font) => {
    applyFont(font);
    localStorage.setItem("nexus.font", JSON.stringify(font));
    set({ font });
  },
  glass: initialGlass,
  setGlass: (v) => {
    applyGlass(v);
    localStorage.setItem("nexus.glass", JSON.stringify(v));
    set({ glass: v });
  },
  dockPos: load<DockPos>("nexus.dockPos", "left"),
  setDockPos: (pos) => {
    localStorage.setItem("nexus.dockPos", JSON.stringify(pos));
    set({ dockPos: pos });
  },
  iconColors: load<boolean>("nexus.iconColors", true),
  setIconColors: (on) => {
    localStorage.setItem("nexus.iconColors", JSON.stringify(on));
    set({ iconColors: on });
  },
  reduceMotion: initialMotion,
  setReduceMotion: (on) => {
    applyMotion(on);
    localStorage.setItem("nexus.reduceMotion", JSON.stringify(on));
    set({ reduceMotion: on });
  },
  largeText: initialText,
  setLargeText: (on) => {
    applyText(on);
    localStorage.setItem("nexus.largeText", JSON.stringify(on));
    set({ largeText: on });
  },
  autoMinimizeInactive: load<boolean>("nexus.autoMinimizeInactive", false),
  setAutoMinimizeInactive: (on) => {
    localStorage.setItem("nexus.autoMinimizeInactive", JSON.stringify(on));
    set({ autoMinimizeInactive: on });
  },
  userName: load<string>("nexus.userName", ""),
  background: load<string>("nexus.background", "nuit"),
  wallpaper: load<string>("nexus.wallpaper", "monde"),
  customWallpaper: load<string | null>("nexus.customWallpaper", null),
  setCustomWallpaper: (dataUrl) => {
    try {
      localStorage.setItem("nexus.customWallpaper", JSON.stringify(dataUrl));
      localStorage.setItem("nexus.wallpaper", JSON.stringify("perso"));
      set({ customWallpaper: dataUrl, wallpaper: "perso" });
    } catch {
      // Image trop lourde pour le stockage : on l'applique sans la memoriser.
      set({ customWallpaper: dataUrl, wallpaper: "perso" });
    }
  },
  widgets: load<HomeWidgets>("nexus.widgets", DEFAULT_WIDGETS),

  setAccent: (accent) => {
    applyAccent(accent);
    localStorage.setItem("nexus.accent", JSON.stringify(accent));
    set({ accent });
  },
  setUserName: (userName) => {
    localStorage.setItem("nexus.userName", JSON.stringify(userName));
    set({ userName });
  },
  setBackground: (background) => {
    localStorage.setItem("nexus.background", JSON.stringify(background));
    set({ background });
  },
  setWallpaper: (wallpaper) => {
    localStorage.setItem("nexus.wallpaper", JSON.stringify(wallpaper));
    set({ wallpaper });
  },
  toggleWidget: (key) =>
    set((state) => {
      const widgets = { ...state.widgets, [key]: !state.widgets[key] };
      localStorage.setItem("nexus.widgets", JSON.stringify(widgets));
      return { widgets };
    }),
  reset: () => {
    applyAccent(DEFAULT_ACCENT);
    applyTheme("dark");
    applyFont("system");
    localStorage.removeItem("nexus.accent");
    localStorage.removeItem("nexus.font");
    localStorage.removeItem("nexus.theme");
    localStorage.removeItem("nexus.userName");
    localStorage.removeItem("nexus.background");
    localStorage.removeItem("nexus.wallpaper");
    localStorage.removeItem("nexus.widgets");
    localStorage.removeItem("nexus.iconColors");
    localStorage.removeItem("nexus.customWallpaper");
    localStorage.removeItem("nexus.glass");
    localStorage.removeItem("nexus.dockPos");
    localStorage.removeItem("nexus.reduceMotion");
    localStorage.removeItem("nexus.largeText");
    applyGlass(46);
    applyMotion(false);
    applyText(false);
    set({
      accent: DEFAULT_ACCENT,
      font: "system",
      reduceMotion: false,
      largeText: false,
      userName: "",
      background: "nuit",
      wallpaper: "monde",
      customWallpaper: null,
      glass: 46,
      dockPos: "left",
      iconColors: true,
      widgets: { ...DEFAULT_WIDGETS },
    });
  },
}));

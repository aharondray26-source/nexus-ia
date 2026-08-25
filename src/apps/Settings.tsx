import { useState } from "react";
import { Sun, Moon, Type, Check } from "lucide-react";
import { ACCENTS, BACKGROUNDS, WALLPAPERS, FONTS, useSettings } from "../os/useSettings";

// Reduit l'image importee (max 1600px, JPEG) pour tenir dans le stockage local.
function shrinkImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("canvas")); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = reject;
    img.src = url;
  });
}

// Personnalisation : couleur d'accent (palette + choix libre), ambiance de fond,
// prenom d'accueil, et remise a zero. Chaque visiteur regle son espace.
export default function Settings() {
  const theme = useSettings((s) => s.theme);
  const setTheme = useSettings((s) => s.setTheme);
  const accent = useSettings((s) => s.accent);
  const setAccent = useSettings((s) => s.setAccent);
  const font = useSettings((s) => s.font);
  const setFont = useSettings((s) => s.setFont);
  const userName = useSettings((s) => s.userName);
  const setUserName = useSettings((s) => s.setUserName);
  const background = useSettings((s) => s.background);
  const setBackground = useSettings((s) => s.setBackground);
  const wallpaper = useSettings((s) => s.wallpaper);
  const setWallpaper = useSettings((s) => s.setWallpaper);
  const customWallpaper = useSettings((s) => s.customWallpaper);
  const setCustomWallpaper = useSettings((s) => s.setCustomWallpaper);
  const glass = useSettings((s) => s.glass);
  const setGlass = useSettings((s) => s.setGlass);
  const dockPos = useSettings((s) => s.dockPos);
  const setDockPos = useSettings((s) => s.setDockPos);
  const iconColors = useSettings((s) => s.iconColors);
  const setIconColors = useSettings((s) => s.setIconColors);
  const reduceMotion = useSettings((s) => s.reduceMotion);
  const setReduceMotion = useSettings((s) => s.setReduceMotion);
  const largeText = useSettings((s) => s.largeText);
  const setLargeText = useSettings((s) => s.setLargeText);
  const autoMinimizeInactive = useSettings((s) => s.autoMinimizeInactive);
  const setAutoMinimizeInactive = useSettings((s) => s.setAutoMinimizeInactive);
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem("nexus_gemini_api_key") || "");
  const [showApiGuide, setShowApiGuide] = useState(false);

  function handleKeyChange(val: string) {
    setGeminiKey(val);
    if (val.trim()) {
      localStorage.setItem("nexus_gemini_api_key", val.trim());
    } else {
      localStorage.removeItem("nexus_gemini_api_key");
    }
  }

  const DOCKS: { key: typeof dockPos; label: string }[] = [
    { key: "left", label: "Gauche" },
    { key: "right", label: "Droite" },
    { key: "top", label: "Haut" },
    { key: "bottom", label: "Bas" },
  ];
  const widgets = useSettings((s) => s.widgets);
  const toggleWidget = useSettings((s) => s.toggleWidget);
  const reset = useSettings((s) => s.reset);

  const WIDGET_LABELS: { key: keyof typeof widgets; label: string }[] = [
    { key: "activity", label: "Mon activite" },
    { key: "tasks", label: "A faire" },
    { key: "weather", label: "Meteo" },
    { key: "history", label: "Ce jour" },
    { key: "quote", label: "Pensee du jour" },
  ];

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto">
      {/* Mode Thème (Sombre / Clair) */}
      <div className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-wider text-nexus-muted">
          Thème d'affichage
        </span>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setTheme("dark")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all ${
              theme === "dark"
                ? "border-cyan-500/80 bg-cyan-500/15 text-cyan-300 shadow-md shadow-cyan-500/10"
                : "border-nexus-border bg-nexus-panel/40 text-nexus-muted hover:text-nexus-text"
            }`}
          >
            <Moon className="w-4 h-4 text-indigo-400" />
            <span>Mode Sombre (Par défaut)</span>
          </button>
          <button
            onClick={() => setTheme("light")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all ${
              theme === "light"
                ? "border-amber-500/80 bg-amber-500/15 text-amber-600 dark:text-amber-300 shadow-md shadow-amber-500/10"
                : "border-nexus-border bg-nexus-panel/40 text-nexus-muted hover:text-nexus-text"
            }`}
          >
            <Sun className="w-4 h-4 text-amber-500" />
            <span>Mode Clair (Lumineux)</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-wider text-nexus-muted">
          Couleur d'accent
        </span>
        <div className="flex flex-wrap items-center gap-3">
          {ACCENTS.map((a) => (
            <button
              key={a.value}
              onClick={() => setAccent(a.value)}
              title={a.name}
              className="flex h-8 w-8 items-center justify-center rounded-full border-2 transition-transform hover:scale-110"
              style={{
                backgroundColor: a.value,
                borderColor: accent === a.value ? "#ffffff" : "transparent",
              }}
              aria-label={a.name}
            />
          ))}
          {/* Choix libre de couleur */}
          <label
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-dashed border-nexus-border text-[10px] text-nexus-muted"
            title="Couleur personnalisee"
          >
            +
            <input
              type="color"
              value={accent}
              onChange={(e) => setAccent(e.target.value)}
              className="h-0 w-0 opacity-0"
            />
          </label>
        </div>
      </div>

      {/* Selection de Police d'ecran (Style Adapter & Tech) */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-2">
          <Type size={15} className="text-cyan-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-nexus-muted">
            Police d'Écran Tech & Adaptée
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {FONTS.map((f) => {
            const isSelected = font === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFont(f.key)}
                className={`flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? "border-cyan-500 bg-cyan-500/10 text-white shadow-md shadow-cyan-500/10 ring-1 ring-cyan-500/50"
                    : "border-white/10 bg-white/[0.02] text-slate-300 hover:border-white/20 hover:bg-white/[0.05]"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    {f.name}
                    {isSelected && <Check size={13} className="text-cyan-400" />}
                  </span>
                  <span className="text-[10px] font-medium opacity-60 px-1.5 py-0.5 rounded bg-white/10">
                    {f.style}
                  </span>
                </div>
                <span
                  className="text-sm tracking-wide mt-1 text-cyan-300/90"
                  style={{ fontFamily: f.family }}
                >
                  Nexus OS Pro — 12:45
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-wider text-nexus-muted">
          Effet verre (liquid glass) · {glass}%
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={glass}
          onChange={(e) => setGlass(Number(e.target.value))}
          className="w-full accent-[color:var(--accent)]"
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-wider text-nexus-muted">
          Position de la barre
        </span>
        <div className="flex flex-wrap gap-2">
          {DOCKS.map((d) => (
            <button
              key={d.key}
              onClick={() => setDockPos(d.key)}
              className="rounded-lg border px-3 py-1.5 text-xs transition-colors"
              style={
                dockPos === d.key
                  ? { borderColor: "var(--accent)", color: "var(--accent)" }
                  : { borderColor: "#27272a", color: "#a1a1aa" }
              }
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-wider text-nexus-muted">
          Icones
        </span>
        <button
          onClick={() => setIconColors(!iconColors)}
          className="w-fit rounded-lg border px-3 py-1.5 text-xs transition-colors"
          style={
            iconColors
              ? { borderColor: "var(--accent)", color: "var(--accent)" }
              : { borderColor: "#27272a", color: "#a1a1aa" }
          }
        >
          {iconColors ? "● Icones colorees" : "○ Icones monochromes"}
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-wider text-nexus-muted">
          Fond d'ecran de l'accueil
        </span>
        <div className="grid grid-cols-4 gap-2">
          {WALLPAPERS.map((w) => (
            <button
              key={w.key}
              onClick={() => setWallpaper(w.key)}
              title={w.label}
              className="h-12 rounded-lg border-2 transition-transform hover:scale-[1.03]"
              style={{
                background: w.css,
                borderColor:
                  wallpaper === w.key ? "var(--accent)" : "transparent",
              }}
              aria-label={w.label}
            />
          ))}
          {customWallpaper && (
            <button
              onClick={() => setWallpaper("perso")}
              title="Ton image"
              className="h-12 rounded-lg border-2 transition-transform hover:scale-[1.03]"
              style={{
                background: `url('${customWallpaper}') center/cover no-repeat`,
                borderColor:
                  wallpaper === "perso" ? "var(--accent)" : "transparent",
              }}
              aria-label="Ton image"
            />
          )}
          <label
            title="Importer une image"
            className="flex h-12 cursor-pointer items-center justify-center rounded-lg border border-dashed border-nexus-border text-lg text-nexus-muted transition-colors hover:text-nexus-text"
          >
            +
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  setCustomWallpaper(await shrinkImage(file));
                } catch {
                  // Image illisible : on ignore silencieusement.
                }
              }}
            />
          </label>
        </div>
        <span className="text-[10px] text-nexus-muted/70">
          + : importe ta propre image comme fond d'ecran.
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-wider text-nexus-muted">
          Ambiance de l'espace de travail
        </span>
        <div className="flex flex-wrap gap-2">
          {BACKGROUNDS.map((b) => (
            <button
              key={b.key}
              onClick={() => setBackground(b.key)}
              className="rounded-lg border px-3 py-1.5 text-xs transition-colors"
              style={
                background === b.key
                  ? { borderColor: "var(--accent)", color: "var(--accent)" }
                  : { borderColor: "#27272a", color: "#a1a1aa" }
              }
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-wider text-nexus-muted">
          Widgets de l'accueil
        </span>
        <div className="flex flex-wrap gap-2">
          {WIDGET_LABELS.map((w) => (
            <button
              key={w.key}
              onClick={() => toggleWidget(w.key)}
              className="rounded-lg border px-3 py-1.5 text-xs transition-colors"
              style={
                widgets[w.key]
                  ? { borderColor: "var(--accent)", color: "var(--accent)" }
                  : { borderColor: "#27272a", color: "#a1a1aa" }
              }
            >
              {widgets[w.key] ? "● " : "○ "}
              {w.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-wider text-nexus-muted">
          Ton prénom
        </span>
        <input
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="Comment veux-tu être accueilli ?"
          className="rounded-lg border border-nexus-border bg-nexus-bg px-3 py-2 text-sm text-nexus-text outline-none focus:border-white/30"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-1.5">
            🔑 Clé API Gemini (Optionnel pour Netlify)
          </span>
          {geminiKey && (
            <span className="text-[10px] text-emerald-400 font-semibold">
              ✓ Clé active
            </span>
          )}
        </div>
        <p className="text-[11px] text-nexus-muted">
          Si vous hébergez le site en statique (sur Netlify Drop), saisissez votre clé gratuite Gemini pour garantir 100% de la puissance de Gemini 3.5/3.6 Flash.
        </p>
        <input
          type="password"
          value={geminiKey}
          onChange={(e) => handleKeyChange(e.target.value)}
          placeholder="Collez votre clé API Gemini (AIzaSy...)"
          className="rounded-lg border border-nexus-border bg-nexus-bg px-3 py-2 text-xs text-nexus-text outline-none focus:border-cyan-500/50"
        />
        
        <button
          onClick={() => setShowApiGuide(!showApiGuide)}
          className="self-start text-[11px] text-cyan-300 hover:underline flex items-center gap-1 font-semibold pt-1"
        >
          {showApiGuide ? "▲ Masquer le guide" : "❓ Comment obtenir une clé Gemini gratuite en 30 secondes ? (Guide pas à pas)"}
        </button>

        {showApiGuide && (
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/40 p-3.5 text-xs text-slate-200 flex flex-col gap-2.5 mt-1 shadow-inner">
            <h5 className="font-bold text-cyan-300 text-xs">📖 Tutoriel express pour débutant :</h5>
            <ol className="list-decimal pl-4 space-y-1.5 text-[11px] leading-relaxed text-slate-300">
              <li>
                Allez sur le site officiel Google AI Studio :{" "}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 font-bold underline hover:text-cyan-200"
                >
                  https://aistudio.google.com/app/apikey
                </a>
              </li>
              <li>Connectez-vous avec votre compte Gmail habituel. <i>(Aucune carte bancaire demandée)</i>.</li>
              <li>Cliquez sur le bouton bleu <b>"Create API Key"</b> (Créer une clé API).</li>
              <li>Copiez la clé générée (commençant par <code>AIzaSy...</code>).</li>
              <li>Collez-la dans la case ci-dessus !</li>
            </ol>
            <p className="text-[10px] text-cyan-200/80 italic border-t border-cyan-500/20 pt-2">
              💡 Une fois collée, votre IA est immédiatement débloquée et autonome sur tout navigateur.
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-wider text-cyan-400 font-bold">
          📦 Télécharger le Code & le Rapport Technique
        </span>
        <div className="rounded-xl border border-cyan-500/40 bg-cyan-950/30 p-3.5 flex flex-col gap-3 shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-cyan-500/20 pb-3">
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-white">Projet Nexus OS complet (.ZIP)</h4>
              <p className="text-[11px] text-slate-300">
                L'intégralité du code source (Express, React, Vite, 30+ apps, Serveur IA) à décompresser sur votre PC.
              </p>
            </div>
            <a
              href="https://github.com/aharondray26-source/nexus-ia" target="_blank" rel="noopener noreferrer"
              
              className="shrink-0 flex items-center gap-2 rounded-lg nx-grad px-4 py-2 text-xs font-bold text-slate-950 hover:brightness-110 transition-all shadow-md shadow-cyan-500/20"
            >
              <span>⬇️ Télécharger .ZIP</span>
            </a>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-purple-300">Rapport Technique pour Claude AI (.MD)</h4>
              <p className="text-[11px] text-slate-300">
                Fichier Markdown récapitulatif prêt à être donné à Claude ou un autre LLM pour transmettre tout le contexte sans perte.
              </p>
            </div>
            <a
              href="https://github.com/aharondray26-source/nexus-ia" target="_blank" rel="noopener noreferrer"
              download="RAPPORT_TECHNIQUE_NEXUS_OS.md"
              className="shrink-0 flex items-center gap-2 rounded-lg border border-purple-400/50 bg-purple-500/20 px-4 py-2 text-xs font-bold text-purple-200 hover:bg-purple-500/30 transition-all shadow-md"
            >
              <span>📄 Rapport .MD</span>
            </a>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-wider text-nexus-muted">
          Confort & Organisation des fenêtres
        </span>
        <button
          onClick={() => setAutoMinimizeInactive(!autoMinimizeInactive)}
          className="w-full flex items-center justify-between rounded-xl border border-nexus-border bg-nexus-bg/50 p-3 text-xs text-nexus-text transition-colors hover:border-white/20"
        >
          <div className="flex flex-col items-start gap-0.5 pr-2">
            <span className="font-semibold text-white">Auto-réduction des fenêtres inactives (2 min)</span>
            <span className="text-[11px] text-nexus-muted text-left">
              Réduit automatiquement les fenêtres non utilisées depuis plus de 2 minutes avec l'animation de masquage.
            </span>
          </div>
          <div
            className={`w-11 h-6 shrink-0 rounded-full p-1 transition-colors duration-300 relative ${
              autoMinimizeInactive ? "bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.4)]" : "bg-slate-700"
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-300 ${
                autoMinimizeInactive ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </div>
        </button>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={() => setReduceMotion(!reduceMotion)}
            className="rounded-lg border px-3 py-1.5 text-xs transition-colors"
            style={
              reduceMotion
                ? { borderColor: "var(--accent)", color: "var(--accent)" }
                : { borderColor: "#27272a", color: "#a1a1aa" }
            }
          >
            {reduceMotion ? "● " : "○ "}Animations reduites
          </button>
          <button
            onClick={() => setLargeText(!largeText)}
            className="rounded-lg border px-3 py-1.5 text-xs transition-colors"
            style={
              largeText
                ? { borderColor: "var(--accent)", color: "var(--accent)" }
                : { borderColor: "#27272a", color: "#a1a1aa" }
            }
          >
            {largeText ? "● " : "○ "}Texte plus grand
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-wider text-nexus-muted">
          Faire de Nexus ta page d'accueil
        </span>
        <div className="rounded-lg border border-nexus-border bg-nexus-bg p-3 text-[11px] leading-relaxed text-nexus-muted">
          Pour retrouver Nexus a chaque ouverture du navigateur :
          {typeof navigator !== "undefined" && /Mac/i.test(navigator.userAgent) ? (
            <p className="mt-1">
              <span className="text-nexus-text">Safari</span> : Reglages → General →
              « La page d'accueil » → colle{" "}
              <span className="text-nexus-text">nexus-espace.netlify.app</span>.
              <br />
              <span className="text-nexus-text">Chrome</span> : Parametres → Au
              demarrage → « Ouvrir une page » → ajoute l'adresse.
            </p>
          ) : (
            <p className="mt-1">
              <span className="text-nexus-text">Chrome / Edge</span> : Parametres → Au
              demarrage → « Ouvrir une page ou des pages precises » → ajoute{" "}
              <span className="text-nexus-text">nexus-espace.netlify.app</span>.
            </p>
          )}
          <p className="mt-1">
            <span className="text-nexus-text">Telephone</span> : ouvre le site, puis
            « Partager → Sur l'ecran d'accueil » (iPhone) ou « Ajouter a l'ecran
            d'accueil » (Android).
          </p>
        </div>
      </div>

      <button
        onClick={reset}
        className="mt-auto rounded-lg border border-nexus-border px-4 py-2 text-xs text-nexus-muted transition-colors hover:text-red-400"
      >
        Tout reinitialiser
      </button>
    </div>
  );
}

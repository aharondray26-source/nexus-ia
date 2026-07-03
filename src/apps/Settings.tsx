import { ACCENTS, BACKGROUNDS, WALLPAPERS, useSettings } from "../os/useSettings";

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
  const accent = useSettings((s) => s.accent);
  const setAccent = useSettings((s) => s.setAccent);
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
  const isMac =
    typeof navigator !== "undefined" && /Mac/.test(navigator.platform);

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
          Ton prenom
        </span>
        <input
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="Comment veux-tu etre accueilli ?"
          className="rounded-lg border border-nexus-border bg-nexus-bg px-3 py-2 text-sm text-nexus-text outline-none focus:border-white/30"
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-wider text-nexus-muted">
          Confort
        </span>
        <div className="flex flex-wrap gap-2">
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
          {isMac ? (
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

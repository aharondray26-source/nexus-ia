import { useRef, useState } from "react";
import { Image as ImageIcon, Download, Monitor, Puzzle, Check, Info } from "lucide-react";
import { useSettings, resolveWallpaper } from "../os/useSettings";
import { creerZip, fichierDistant, enOctets } from "../lib/zip";

const SITE = "https://nexus-espace.netlify.app/";

/* ============ INTEGRATION macOS ============
   Trois choses concretes, sans rien installer d'obscur :
   1. Fond d'ecran Nexus : on genere une vraie image, aux dimensions de ton
      ecran, avec l'ambiance et la couleur que tu as choisies.
   2. Widgets macOS : via l'application installee (raccourcis dans le Dock).
   3. Extension navigateur : Nexus s'ouvre a chaque nouvel onglet.            */

const TAILLES = [
  { nom: "Retina 16 pouces", w: 3456, h: 2234 },
  { nom: "Retina 14 pouces", w: 3024, h: 1964 },
  { nom: "Écran 5K", w: 5120, h: 2880 },
  { nom: "Full HD", w: 1920, h: 1080 },
  { nom: "iPad Pro", w: 2732, h: 2048 },
];

export default function MacIntegration() {
  const accent = useSettings((s) => s.accent);
  const wallpaper = useSettings((s) => s.wallpaper);
  const customWallpaper = useSettings((s) => s.customWallpaper);
  const userName = useSettings((s) => s.userName);
  const [taille, setTaille] = useState(TAILLES[0]);
  const [avecWidgets, setAvecWidgets] = useState(true);
  const [fait, setFait] = useState<string | null>(null);
  const apercu = useRef<HTMLCanvasElement>(null);

  // Dessine le fond d'ecran a la taille demandee.
  function dessiner(cv: HTMLCanvasElement, W: number, H: number) {
    const c = cv.getContext("2d");
    if (!c) return;
    cv.width = W; cv.height = H;

    // Fond profond
    c.fillStyle = "#07070b";
    c.fillRect(0, 0, W, H);

    // Nappes de couleur (la meme aurore que dans Nexus)
    const nappe = (x: number, y: number, r: number, col: string, a: number) => {
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, col); g.addColorStop(1, "rgba(0,0,0,0)");
      c.globalAlpha = a; c.fillStyle = g; c.fillRect(0, 0, W, H); c.globalAlpha = 1;
    };
    nappe(W * 0.18, H * 0.12, Math.max(W, H) * 0.55, accent, 0.36);
    nappe(W * 0.86, H * 0.88, Math.max(W, H) * 0.5, accent, 0.22);
    nappe(W * 0.55, H * 0.5, Math.max(W, H) * 0.4, "#1e293b", 0.3);

    // Grille discrete
    c.strokeStyle = "rgba(255,255,255,0.035)";
    c.lineWidth = Math.max(1, W / 2400);
    const pas = Math.round(W / 34);
    for (let x = 0; x < W; x += pas) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
    for (let y = 0; y < H; y += pas) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }

    // Zones libres a gauche et a droite : la ou macOS pose ses widgets,
    // le fond reste calme pour qu'ils restent lisibles.
    if (avecWidgets) {
      const zone = (x: number) => {
        c.fillStyle = "rgba(0,0,0,0.16)";
        c.fillRect(x, H * 0.1, W * 0.19, H * 0.8);
      };
      zone(W * 0.035); zone(W * 0.775);
    }

    // Signature Nexus, discrete, en bas au centre
    c.textAlign = "center";
    c.fillStyle = "rgba(255,255,255,0.30)";
    c.font = `300 ${Math.round(H / 30)}px -apple-system, BlinkMacSystemFont, sans-serif`;
    c.fillText("NEXUS", W / 2, H * 0.9);
    c.fillStyle = "rgba(255,255,255,0.16)";
    c.font = `400 ${Math.round(H / 68)}px -apple-system, sans-serif`;
    c.letterSpacing = "4px";
    c.fillText(userName ? `L'espace de ${userName}` : "Ton espace de travail", W / 2, H * 0.935);
  }

  function telecharger() {
    const cv = document.createElement("canvas");
    dessiner(cv, taille.w, taille.h);
    cv.toBlob((b) => {
      if (!b) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(b);
      a.download = `nexus-fond-${taille.w}x${taille.h}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 3000);
      setFait("Image enregistrée dans tes Téléchargements.");
    }, "image/png");
  }

  // L'extension du navigateur, en UN seul fichier .zip.
  // Refondue : vrai style Nexus, menu contextuel, raccourcis vers les espaces,
  // et tout ce qu'elle enregistre passe par ton compte — donc arrive partout.
  async function telechargerExtension() {
    setFait("Préparation de l'extension…");
    try {
      // UNE SEULE SOURCE. Ces fichiers etaient recopies ici, en toutes lettres,
      // sur mille cinq cents lignes : la vraie extension et celle que le site
      // proposait au telechargement partaient chacune de leur cote, et une
      // correction faite d'un cote manquait de l'autre sans que rien ne le
      // dise. Ils vivent maintenant dans `public/ext/`, et on les lit.
      const lire = async (nom: string) => {
        const r = await fetch(`/ext/${nom}`, { cache: "no-store" });
        if (!r.ok) throw new Error(`fichier « ${nom} » introuvable (${r.status})`);
        return new Uint8Array(await r.arrayBuffer());
      };

      const [manifestF, ongletHtmlF, ongletJsF, modeleJsF, popupF, popupJsF, fondJsF,
             lisezMoiF, i16, i48, i128] = await Promise.all([
        lire("manifest.json"), lire("onglet.html"), lire("onglet.js"),
        // La bibliotheque du modele, livree AVEC l'extension : Chrome interdit
        // a une extension de charger un script depuis internet.
        lire("modele.js"),
        lire("popup.html"), lire("popup.js"), lire("fond.js"), lire("LISEZ-MOI.txt"),
        fichierDistant("/ext/icone-16.png"),
        fichierDistant("/ext/icone-48.png"),
        fichierDistant("/ext/icone-128.png"),
      ]);

      const zip = creerZip([
        { nom: "Nexus-extension-Chrome/manifest.json", donnees: manifestF },
        { nom: "Nexus-extension-Chrome/onglet.html", donnees: ongletHtmlF },
        { nom: "Nexus-extension-Chrome/onglet.js", donnees: ongletJsF },
        { nom: "Nexus-extension-Chrome/modele.js", donnees: modeleJsF },
        { nom: "Nexus-extension-Chrome/popup.html", donnees: popupF },
        { nom: "Nexus-extension-Chrome/popup.js", donnees: popupJsF },
        { nom: "Nexus-extension-Chrome/fond.js", donnees: fondJsF },
        { nom: "Nexus-extension-Chrome/icones/16.png", donnees: i16 },
        { nom: "Nexus-extension-Chrome/icones/48.png", donnees: i48 },
        { nom: "Nexus-extension-Chrome/icones/128.png", donnees: i128 },
        { nom: "Nexus-extension-Chrome/LISEZ-MOI.txt", donnees: lisezMoiF },
      ]);

      const a = document.createElement("a");
      a.href = URL.createObjectURL(zip);
      // Le zip et le dossier qu'il produit portent le meme nom : sinon on se
      // retrouve avec deux dossiers d'apparence identique, dont un perime.
      a.download = "Nexus-extension-Chrome.zip";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      setFait("Nexus-extension-Chrome.zip téléchargé. Double-clique dessus, puis "
        + "dans Chrome : chrome://extensions → Charger l'extension non empaquetée "
        + "→ choisis le dossier Nexus-extension-Chrome.");
    } catch (e) {
      setFait("Échec : " + (e as Error).message);
    }
  }

  function voirApercu() {
    if (apercu.current) dessiner(apercu.current, 640, 400);
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto pr-1">
      <div>
        <h2 className="text-base font-semibold text-nexus-text">Nexus sur ton Mac</h2>
        <p className="mt-1 text-xs leading-relaxed text-nexus-muted">
          Une vraie application native, dans la barre de menus — même navigateur
          fermé. Tes notes et tes scores rejoignent ton compte Nexus.
        </p>
      </div>

      {/* ---------- L'APPLICATION NATIVE ---------- */}
      <div className="nx-widget !gap-3 !p-4 shrink-0">
        <div className="nx-widget-title">
          <span className="nx-widget-icon" style={{ backgroundColor: accent + "26", color: accent }}>
            <Monitor size={15} />
          </span>
          Application macOS
        </div>
        <ul className="flex flex-col gap-1.5 text-xs leading-relaxed text-nexus-muted">
          <li>• <span className="text-nexus-text">Chat Nexus</span> — il ouvre tes applications, retrouve
            tes fichiers, lit un PDF ou une image que tu lui donnes.</li>
          <li>• <span className="text-nexus-text">Capture de texte</span> — sélectionne une zone
            de l'écran, tout le texte part dans le presse-papiers. Hors ligne.</li>
          <li>• <span className="text-nexus-text">Widgets sur le bureau</span> — horloge, météo, tâches,
            notes et captures. Déplaçables, et ils s'adaptent à leur contenu.</li>
          <li>• <span className="text-nexus-text">Dock Nexus</span> — se range tout seul contre un bord,
            à la verticale ou à l'horizontale.</li>
          <li>• <span className="text-nexus-text">École Directe</span> — notes, devoirs et emploi du
            temps, sans passer par leur site.</li>
          <li>• <span className="text-nexus-text">Arena</span> — le jeu, avec tes scores reliés à ton compte.</li>
          <li>• <span className="text-nexus-text">Fond d'écran vivant</span> et lancement au démarrage.</li>
        </ul>
        <a href="/Nexus-macOS.zip" download className="nx-btn nx-btn-primary w-full">
          <Download size={14} /> Télécharger Nexus pour macOS
        </a>
        <div className="flex flex-col gap-1.5 rounded-lg bg-white/[0.05] p-3 text-[11px] leading-relaxed text-nexus-muted">
          <span className="font-semibold text-nexus-text">Installation, étape par étape</span>
          <span>1. Double-clique le .zip téléchargé : tu obtiens <span className="text-nexus-text">Nexus.app</span>.</span>
          <span>2. Glisse-le dans ton dossier <span className="text-nexus-text">Applications</span>.</span>
          <span>3. Double-clique dessus. macOS refuse la première fois : c'est normal,
            il le fait pour toute application qui ne vient pas de l'App&nbsp;Store.</span>
          <span>4. Va dans <span className="text-nexus-text">Réglages Système → Confidentialité
            et sécurité</span>, descends en bas, et clique
            <span className="text-nexus-text"> « Ouvrir quand même »</span>.</span>
          <span>5. Une icône apparaît dans ta barre de menus, en haut à droite. C'est fait.</span>
          <span className="pt-1">Nexus demandera l'autorisation « Enregistrement de l'écran »
            la première fois que tu captures du texte — c'est ce qui lui permet de lire
            ton écran. La reconnaissance se fait sur ton Mac, rien n'est envoyé.</span>
        </div>
      </div>

      {/* ---------- FOND D'ECRAN EN IMAGE ---------- */}
      <div className="nx-widget !gap-3 !p-4 shrink-0">
        <div className="nx-widget-title">
          <span className="nx-widget-icon" style={{ backgroundColor: accent + "26", color: accent }}>
            <ImageIcon size={15} />
          </span>
          Fond d'écran en image
        </div>
        <p className="text-xs leading-relaxed text-nexus-muted">
          Si tu préfères un fond fixe, sans application : une image aux dimensions
          exactes de ton écran, dans ta couleur d'accent.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {TAILLES.map((t) => (
            <button key={t.nom} onClick={() => setTaille(t)}
              className={`nx-chip ${taille.nom === t.nom ? "nx-chip-active" : ""}`}>
              {t.nom}
            </button>
          ))}
        </div>
        <button onClick={() => setAvecWidgets((v) => !v)}
          className={`nx-chip w-fit ${avecWidgets ? "nx-chip-active" : ""}`}>
          {avecWidgets ? "✓ " : ""}Zones calmes pour les widgets
        </button>
        <canvas ref={apercu} className="w-full rounded-xl border border-nexus-border" style={{ aspectRatio: "16/10" }} />
        <div className="flex gap-2">
          <button onClick={voirApercu} className="nx-btn nx-btn-secondary flex-1">Aperçu</button>
          <button onClick={telecharger} className="nx-btn nx-btn-primary flex-1">
            <Download size={14} /> {taille.w}×{taille.h}
          </button>
        </div>
      </div>

      {/* ---------- EXTENSION ---------- */}
      <div className="nx-widget !gap-3 !p-4 shrink-0">
        <div className="nx-widget-title">
          <span className="nx-widget-icon" style={{ backgroundColor: accent + "26", color: accent }}>
            <Puzzle size={15} />
          </span>
          Extension navigateur
        </div>
        <ul className="flex flex-col gap-1.5 text-xs leading-relaxed text-nexus-muted">
          <li>• <span className="text-nexus-text">Chaque nouvel onglet</span> ouvre ton espace Nexus.</li>
          <li>• <span className="text-nexus-text">Note ou tâche en deux secondes</span> depuis la barre d'outils,
            avec des raccourcis vers tes espaces.</li>
          <li>• <span className="text-nexus-text">Clic droit sur du texte</span>, n'importe où sur le web :
            « Enregistrer dans Nexus ».</li>
          <li>• <span className="text-nexus-text">« Cette page »</span> garde le titre et l'adresse de l'onglet.</li>
          <li>• Tout passe par <span className="text-nexus-text">ton compte</span> : tu le retrouves sur le site et sur ton Mac.</li>
        </ul>
        <button onClick={telechargerExtension} className="nx-btn nx-btn-primary w-full">
          <Download size={14} /> Télécharger l'extension (.zip)
        </button>
        <div className="rounded-lg bg-white/[0.05] p-3 text-[11px] leading-relaxed text-nexus-muted">
          <span className="font-semibold text-nexus-text">Installation gratuite :</span> décompresse,
          va sur <span className="text-nexus-text">chrome://extensions</span>, active le
          « Mode développeur », puis « Charger l'extension non empaquetée ».
          Publier sur le Chrome Web Store demanderait une inscription à 5 $ chez Google —
          cette installation-là n'en dépend pas et donne exactement la même extension.
        </div>
      </div>

      {fait && (
        <p className="flex items-start gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-[11px] leading-relaxed text-emerald-300">
          <Check size={13} className="mt-0.5 shrink-0" /> {fait}
        </p>
      )}
    </div>
  );
}

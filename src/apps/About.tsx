import { useState } from "react";
import { useWindows } from "../os/useWindows";
import { openAiWindow } from "../lib/tauri";
import Logo from "../os/Logo";

// Page "A propos" : rassure le visiteur (qui, pourquoi, contact) et permet de
// partager le site. Le texte est volontairement simple ; a personnaliser ici.
const SITE = "https://nexus-espace.netlify.app/";
const SHARE_TEXT = "Nexus — un espace de travail tout-en-un, gratuit. Utilisable sans compte, synchronise si tu en crees un.";

export default function About() {
  const openApp = useWindows((s) => s.openApp);
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(SITE);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  function nativeShare() {
    const n = navigator as Navigator & {
      share?: (d: { title: string; text: string; url: string }) => Promise<void>;
    };
    if (n.share) n.share({ title: "Nexus", text: SHARE_TEXT, url: SITE }).catch(() => {});
    else copyLink();
  }

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto">
      <div className="flex items-center gap-3">
        <Logo size={30} />
        <div>
          <h2 className="text-base font-medium text-nexus-text">Nexus OS</h2>
          <p className="text-xs text-nexus-muted">Votre espace de travail universel tout-en-un</p>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-nexus-muted">
        Nexus réunit au même endroit tout ce dont vous avez besoin pour travailler,
        apprendre et vous concentrer : accès aux intelligences artificielles, notes,
        tâches, apprentissage, dictionnaire, traducteur, cartes, musique et plus encore.
        <br />
        <span className="text-nexus-text">Gratuit, utilisable sans compte</span> : tout
        reste alors sur votre appareil. Si vous créez un compte Nexus, vos données vous
        suivent sur tous vos appareils — elles restent privées et ne sont ni vendues ni partagées.
      </p>

      <div className="rounded-xl border border-nexus-border bg-nexus-bg p-3 text-xs leading-relaxed text-nexus-muted">
        <span className="text-nexus-text">Pourquoi Nexus OS ?</span> Parce qu'ouvrir
        dix onglets pour dix outils différents est Inefficace. Nexus rassemble l'essentiel
        dans un espace calme, rapide et épuré.
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[11px] uppercase tracking-wider text-nexus-muted">
          Contact
        </span>
        <button
          onClick={() => openApp("mail", { width: 440, height: 440 })}
          className="nx-btn nx-btn-primary w-fit text-sm"
        >
          Nous écrire
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[11px] uppercase tracking-wider text-nexus-muted">
          Informations légales
        </span>
        <div className="flex flex-wrap gap-2">
          <a href="/confidentialite.html" target="_blank" rel="noopener noreferrer"
            className="nx-btn nx-btn-secondary text-xs">
            Confidentialité
          </a>
          <a href="/conditions.html" target="_blank" rel="noopener noreferrer"
            className="nx-btn nx-btn-secondary text-xs">
            Conditions d'utilisation
          </a>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[11px] uppercase tracking-wider text-nexus-muted">
          Partager Nexus
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={copyLink}
            className="nx-btn nx-btn-secondary text-xs"
          >
            {copied ? "Lien copié !" : "Copier le lien"}
          </button>
          <button
            onClick={() =>
              openAiWindow(
                "share-x",
                `https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_TEXT)}&url=${encodeURIComponent(SITE)}`
              )
            }
            className="nx-btn nx-btn-secondary text-xs"
          >
            X
          </button>
          <button
            onClick={() =>
              openAiWindow(
                "share-wa",
                `https://wa.me/?text=${encodeURIComponent(SHARE_TEXT + " " + SITE)}`
              )
            }
            className="nx-btn nx-btn-secondary text-xs"
          >
            WhatsApp
          </button>
          <button
            onClick={nativeShare}
            className="nx-btn nx-btn-secondary text-xs"
          >
            Partager…
          </button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { ExternalLink, RotateCw, GraduationCap } from "lucide-react";

// NeoSchool, l'espace scolaire de Nexus : notes, devoirs, emploi du temps.
// Il vivait jusqu'ici derriere un lien qui FAISAIT SORTIR de Nexus, dans un
// autre onglet. Il s'ouvre desormais dedans, comme n'importe quel espace.
//
// Il est servi depuis un autre domaine : on ne peut donc ni lire son contenu
// ni savoir ce qu'il affiche. On sait seulement s'il a fini de charger — et
// s'il refusait un jour d'etre affiche ici, la porte de sortie reste offerte
// plutot que de laisser un rectangle blanc sans explication.
const ADRESSE = "https://neo-school-nine.vercel.app/";

export default function NeoSchool() {
  const [charge, setCharge] = useState(false);
  const [bloque, setBloque] = useState(false);
  const [cle, setCle] = useState(0);
  const cadre = useRef<HTMLIFrameElement>(null);

  // Si rien n'est arrive au bout de dix secondes, ce n'est pas une page lente :
  // c'est qu'elle ne viendra pas.
  useEffect(() => {
    setCharge(false);
    setBloque(false);
    const t = window.setTimeout(() => {
      setCharge((deja) => {
        if (!deja) setBloque(true);
        return deja;
      });
    }, 10000);
    return () => window.clearTimeout(t);
  }, [cle]);

  return (
    <div className="relative flex h-full flex-col bg-nexus-bg">
      <div className="flex shrink-0 items-center gap-2 border-b border-nexus-border px-3 py-2">
        <GraduationCap className="h-4 w-4 shrink-0 text-cyan-400" />
        <span className="text-[13px] font-semibold text-nexus-text">NeoSchool</span>
        <span className="truncate text-[11px] text-nexus-muted">
          Notes, devoirs, emploi du temps
        </span>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <button
            onClick={() => setCle((n) => n + 1)}
            title="Recharger"
            className="rounded-lg px-2 py-1 text-nexus-muted hover:text-nexus-text"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </button>
          <a
            href={ADRESSE}
            target="_blank"
            rel="noopener noreferrer"
            title="Ouvrir dans un onglet"
            className="rounded-lg px-2 py-1 text-nexus-muted hover:text-nexus-text"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {!charge && !bloque && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-nexus-muted">
            Ouverture de NeoSchool…
          </div>
        )}

        {bloque ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
            <GraduationCap className="h-7 w-7 text-cyan-400" />
            <p className="text-sm text-nexus-text">NeoSchool ne s'affiche pas ici</p>
            <p className="max-w-sm text-xs leading-relaxed text-nexus-muted">
              Son serveur refuse de se laisser afficher dans une fenêtre de Nexus.
              Ça arrive après une mise à jour de leur côté ; ça n'a rien à voir
              avec ton compte.
            </p>
            <a
              href={ADRESSE}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-indigo-500 px-4 py-2 text-xs font-semibold text-white"
            >
              Ouvrir NeoSchool dans un onglet
            </a>
          </div>
        ) : (
          <iframe
            key={cle}
            ref={cadre}
            title="NeoSchool"
            src={ADRESSE}
            onLoad={() => setCharge(true)}
            className="h-full w-full border-0"
            style={{ opacity: charge ? 1 : 0,
                     transition: "opacity var(--t-moyen) var(--doux)" }}
            allow="clipboard-write; fullscreen"
          />
        )}
      </div>
    </div>
  );
}

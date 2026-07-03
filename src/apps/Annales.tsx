import { useMemo, useState } from "react";
import { openAiWindow } from "../lib/tauri";

// Les annales proposees par le createur du site. Cette liste est integree au
// site : tous les visiteurs voient donc les memes documents. Pour en ajouter,
// il suffit de completer ce tableau (titre, matiere, annee, lien du fichier).
interface Annale {
  id: string;
  titre: string;
  matiere: string;
  annee: string;
  url: string;
}

// Liste des documents. Pour en ajouter, copier ce modele dans le tableau :
//   { id: "a1", titre: "Sujet de maths", matiere: "Mathematiques", annee: "2024", url: "https://..." }
const ANNALES: Annale[] = [];

// Identifiant YouTube de la video de presentation du site (a remplir quand tu
// auras enregistre ta presentation). Laisse vide pour masquer le bloc video.
const PRESENTATION_VIDEO_ID = "";

export default function Annales() {
  const [matiere, setMatiere] = useState<string>("Toutes");

  const matieres = useMemo(
    () => ["Toutes", ...Array.from(new Set(ANNALES.map((a) => a.matiere)))],
    []
  );

  const visibles = ANNALES.filter(
    (a) => matiere === "Toutes" || a.matiere === matiere
  );

  return (
    <div className="flex h-full flex-col gap-3">
      {PRESENTATION_VIDEO_ID && (
        <div className="aspect-video overflow-hidden rounded-xl border border-nexus-border bg-black">
          <iframe
            title="Presentation"
            src={`https://www.youtube.com/embed/${PRESENTATION_VIDEO_ID}`}
            className="h-full w-full"
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
        </div>
      )}

      <p className="text-xs text-nexus-muted">
        Sujets et documents a consulter. Clique pour ouvrir.
      </p>

      <div className="flex flex-wrap gap-2">
        {matieres.map((m) => (
          <button
            key={m}
            onClick={() => setMatiere(m)}
            className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
              matiere === m
                ? "border-white/25 bg-white/[0.06] text-nexus-text"
                : "border-nexus-border text-nexus-muted hover:text-nexus-text"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <ul className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {visibles.map((a) => (
          <li key={a.id}>
            <button
              onClick={() => openAiWindow(`annale-${a.id}`, a.url)}
              className="flex w-full items-center gap-3 rounded-lg border border-nexus-border bg-nexus-bg px-3 py-2.5 text-left transition-colors hover:border-white/20"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-nexus-border text-[10px] font-semibold text-nexus-muted">
                {a.annee}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm text-nexus-text">
                  {a.titre}
                </span>
                <span className="text-[11px] text-nexus-muted">{a.matiere}</span>
              </span>
            </button>
          </li>
        ))}
        {visibles.length === 0 && (
          <li className="flex flex-1 items-center justify-center text-center text-[11px] text-nexus-muted/70">
            Aucun document pour cette matiere pour l'instant.
          </li>
        )}
      </ul>
    </div>
  );
}

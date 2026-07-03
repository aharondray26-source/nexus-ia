import { useState } from "react";
import { usePersistentState } from "../lib/persist";

interface Note {
  id: string;
  title: string;
  body: string;
  updatedAt: number;
}

function relativeDate(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "a l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  return new Date(ts).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

export default function Notes() {
  const [notes, setNotes] = usePersistentState<Note[]>("nexus.notes", []);
  const [activeId, setActiveId] = useState<string | null>(notes[0]?.id ?? null);

  const active = notes.find((n) => n.id === activeId) ?? null;

  function createNote() {
    const note: Note = {
      id: `note-${Date.now()}`,
      title: "",
      body: "",
      updatedAt: Date.now(),
    };
    setNotes((prev) => [note, ...prev]);
    setActiveId(note.id);
  }

  function updateActive(patch: Partial<Note>) {
    if (!active) return;
    setNotes((prev) =>
      prev.map((n) =>
        n.id === active.id ? { ...n, ...patch, updatedAt: Date.now() } : n
      )
    );
  }

  function deleteNote(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (activeId === id) setActiveId(null);
  }

  const words = active?.body.trim()
    ? active.body.trim().split(/\s+/).length
    : 0;

  return (
    <div className="flex h-full gap-4">
      <div className="flex w-44 shrink-0 flex-col gap-3">
        <button
          onClick={createNote}
          className="flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-colors"
          style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
        >
          + Nouvelle note
        </button>
        <ul className="flex flex-1 flex-col gap-1.5 overflow-y-auto">
          {notes.map((n) => (
            <li key={n.id}>
              <button
                onClick={() => setActiveId(n.id)}
                className="flex w-full flex-col gap-0.5 rounded-lg border px-3 py-2 text-left transition-colors"
                style={{
                  borderColor:
                    n.id === activeId ? "var(--accent)" : "transparent",
                  backgroundColor:
                    n.id === activeId ? "rgba(255,255,255,0.04)" : "transparent",
                }}
              >
                <span className="truncate text-xs font-medium text-nexus-text">
                  {n.title || "Sans titre"}
                </span>
                <span className="truncate text-[10px] text-nexus-muted">
                  {n.body.trim() ? n.body.slice(0, 40) : "Vide"}
                </span>
                <span className="text-[9px] text-nexus-muted/70">
                  {relativeDate(n.updatedAt)}
                </span>
              </button>
            </li>
          ))}
          {notes.length === 0 && (
            <li className="px-1 py-2 text-[11px] text-nexus-muted/70">
              Aucune note. Cree la premiere.
            </li>
          )}
        </ul>
      </div>

      <div className="flex flex-1 flex-col gap-3">
        {active ? (
          <>
            <input
              value={active.title}
              onChange={(e) => updateActive({ title: e.target.value })}
              placeholder="Titre de la note"
              className="w-full bg-transparent text-lg font-medium text-nexus-text outline-none placeholder:text-nexus-muted/50"
            />
            <div className="flex items-center justify-between border-y border-nexus-border py-1.5 text-[10px] text-nexus-muted">
              <span>
                {words} mot{words > 1 ? "s" : ""} · enregistre automatiquement
              </span>
              <button
                onClick={() => deleteNote(active.id)}
                className="transition-colors hover:text-red-400"
              >
                Supprimer
              </button>
            </div>
            <textarea
              value={active.body}
              onChange={(e) => updateActive({ body: e.target.value })}
              placeholder="Commence a ecrire..."
              className="flex-1 resize-none bg-transparent text-sm leading-relaxed text-nexus-text outline-none placeholder:text-nexus-muted/50"
            />
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-nexus-border text-center">
            <span className="text-sm text-nexus-muted">
              Choisis une note ou cree-en une.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

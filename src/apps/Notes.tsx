import { useState } from "react";
import { usePersistentState } from "../lib/persist";
import { useWindows } from "../os/useWindows";
import { Mail, Cloud, Trash2, Send } from "lucide-react";

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
  const openApp = useWindows((s) => s.openApp);
  const [notes, setNotes] = usePersistentState<Note[]>("nexus.notes", []);
  const [cloudFiles, setCloudFiles] = usePersistentState<{ name: string; size: string }[]>(
    "nexus.cloudFiles",
    []
  );
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
          className="nx-btn nx-btn-primary flex items-center justify-center gap-1.5 text-xs"
        >
          + Nouvelle note
        </button>
        <ul className="flex flex-1 flex-col gap-1.5 overflow-y-auto">
          {notes.map((n) => (
            <li key={n.id}>
              <button
                onClick={() => setActiveId(n.id)}
                className="nx-btn nx-btn-secondary flex w-full flex-col gap-0.5 text-left"
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
                {words} mot{words > 1 ? "s" : ""} · enregistré
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    openApp("mail", { width: 840, height: 600 });
                  }}
                  className="flex items-center gap-1 text-amber-400 hover:text-amber-300 font-medium transition-colors"
                  title="Envoyer la note par e-mail"
                >
                  <Mail size={12} />
                  <span>Mail</span>
                </button>
                <button
                  onClick={() => {
                    const fileName = `${active.title || "Note"}.txt`;
                    if (!cloudFiles.some((f) => f.name === fileName)) {
                      setCloudFiles((prev) => [{ name: fileName, size: `${words * 5} B` }, ...prev]);
                    }
                    openApp("cloud", { width: 780, height: 580 });
                  }}
                  className="flex items-center gap-1 text-blue-400 hover:text-blue-300 font-medium transition-colors"
                  title="Enregistrer la note sur Nexus Cloud"
                >
                  <Cloud size={12} />
                  <span>Cloud</span>
                </button>
                <button
                  onClick={() => deleteNote(active.id)}
                  className="flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors"
                  title="Supprimer la note"
                >
                  <Trash2 size={12} />
                  <span>Supprimer</span>
                </button>
              </div>
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

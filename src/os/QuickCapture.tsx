import { useRef, useState, type KeyboardEvent } from "react";
import { useDismiss } from "../lib/useDismiss";
import Icon from "./Icons";
import { Plus } from "lucide-react";

// Capture rapide : un « + » dans la barre du haut pour noter une idee ou une
// tache en une seconde, sans ouvrir d'espace. Enregistre direct au bon endroit.
export default function QuickCapture() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [kind, setKind] = useState<"note" | "task">("note");
  const [saved, setSaved] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  // Meme comportement que le menu Compte : clic a cote = fermeture.
  useDismiss(boxRef, open, () => setOpen(false));

  function save() {
    const t = text.trim();
    if (!t) return;
    try {
      if (kind === "task") {
        const arr = JSON.parse(localStorage.getItem("nexus.tasks") || "[]");
        arr.unshift({ id: `task-${Date.now()}`, text: t, done: false });
        localStorage.setItem("nexus.tasks", JSON.stringify(arr));
      } else {
        const arr = JSON.parse(localStorage.getItem("nexus.notes") || "[]");
        arr.unshift({
          id: `note-${Date.now()}`,
          title: t.slice(0, 40),
          body: t,
          updatedAt: Date.now(),
        });
        localStorage.setItem("nexus.notes", JSON.stringify(arr));
      }
    } catch {
      // Stockage indisponible : on ignore.
    }
    setText("");
    setSaved(true);
    window.setTimeout(() => {
      setSaved(false);
      setOpen(false);
    }, 900);
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      save();
    }
    if (e.key === "Escape") setOpen(false);
  }

  return (
    <div className="relative" ref={boxRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Capture rapide (note ou tache)"
        className="nx-btn nx-btn-icon shrink-0"
        aria-label="Capture rapide"
      >
        <Plus size={15} />
      </button>

      {open && (
        <div className="nexus-fade-in absolute left-1/2 top-9 z-[1000010] w-72 -translate-x-1/2 rounded-xl border border-nexus-border bg-nexus-panel p-3 shadow-2xl backdrop-blur-[var(--glass-blur)]">
          <div className="mb-2 flex gap-1.5">
            {(["note", "task"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className="nx-btn nx-btn-secondary flex-1 text-[11px]"
                style={
                  kind === k
                    ? { borderColor: "var(--accent)", color: "var(--accent)" }
                    : { borderColor: "#27272a", color: "#a1a1aa" }
                }
              >
                {k === "note" ? "Note" : "Tache"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKey}
              placeholder={kind === "note" ? "Une idee..." : "A faire..."}
              className="nx-input flex-1 text-xs"
            />
            <button
              onClick={save}
              className="nx-btn nx-btn-primary flex items-center justify-center"
            >
              <Icon name="tasks" size={14} />
            </button>
          </div>
          <span className="mt-1.5 block text-[10px] text-nexus-muted">
            {saved ? "Ajoute ✓" : "Entree pour enregistrer"}
          </span>
        </div>
      )}
    </div>
  );
}

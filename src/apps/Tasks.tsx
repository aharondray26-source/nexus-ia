import { useState, type FormEvent } from "react";
import { usePersistentState } from "../lib/persist";

interface Task {
  id: string;
  text: string;
  done: boolean;
}

export default function Tasks() {
  const [tasks, setTasks] = usePersistentState<Task[]>("nexus.tasks", []);
  const [text, setText] = useState("");

  function add(e: FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setTasks((prev) => [
      { id: `task-${Date.now()}`, text: t, done: false },
      ...prev,
    ]);
    setText("");
  }

  const remaining = tasks.filter((t) => !t.done).length;

  return (
    <div className="flex h-full flex-col gap-3">
      <form onSubmit={add} className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ajouter une tache..."
          className="flex-1 rounded-lg border border-nexus-border bg-nexus-bg px-3 py-2 text-sm text-nexus-text outline-none focus:border-white/30"
        />
        <button
          type="submit"
          className="rounded-lg border border-nexus-border bg-white/[0.04] px-4 py-2 text-sm text-nexus-text transition-colors hover:bg-white/[0.08]"
        >
          +
        </button>
      </form>

      <ul className="flex flex-1 flex-col gap-1.5 overflow-y-auto">
        {tasks.map((t) => (
          <li
            key={t.id}
            className="flex items-center gap-3 rounded-lg border border-nexus-border bg-nexus-bg px-3 py-2"
          >
            <button
              onClick={() =>
                setTasks((prev) =>
                  prev.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x))
                )
              }
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[10px] transition-colors ${
                t.done
                  ? "border-white/30 bg-white/[0.1] text-nexus-text"
                  : "border-nexus-border text-transparent"
              }`}
              aria-label="Marquer comme faite"
            >
              ✓
            </button>
            <span
              className={`flex-1 text-sm ${
                t.done
                  ? "text-nexus-muted line-through"
                  : "text-nexus-text"
              }`}
            >
              {t.text}
            </span>
            <button
              onClick={() => setTasks((prev) => prev.filter((x) => x.id !== t.id))}
              aria-label="Supprimer"
              className="text-nexus-muted transition-colors hover:text-red-400"
            >
              ✕
            </button>
          </li>
        ))}
        {tasks.length === 0 && (
          <li className="flex flex-1 items-center justify-center text-[11px] text-nexus-muted/70">
            Aucune tache. Ajoute la premiere !
          </li>
        )}
      </ul>

      {tasks.length > 0 && (
        <p className="text-[11px] text-nexus-muted">
          {remaining} tache{remaining > 1 ? "s" : ""} restante
          {remaining > 1 ? "s" : ""}.
        </p>
      )}
    </div>
  );
}

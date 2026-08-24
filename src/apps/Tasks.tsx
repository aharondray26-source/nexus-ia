import { useState, type FormEvent } from "react";
import { usePersistentState } from "../lib/persist";
import { Bell, CheckCircle2, Circle, Trash2, Plus, Calendar } from "lucide-react";

interface Task {
  id: string;
  text: string;
  done: boolean;
  dueDate?: string;
  createdAt?: string;
}

export default function Tasks() {
  const [tasks, setTasks] = usePersistentState<Task[]>("nexus.tasks", []);
  const [text, setText] = useState("");
  const [dueDateInput, setDueDateInput] = useState("");

  function add(e: FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setTasks((prev) => [
      {
        id: `task-${Date.now()}`,
        text: t,
        done: false,
        dueDate: dueDateInput.trim() || undefined,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    setText("");
    setDueDateInput("");
  }

  const remaining = tasks.filter((t) => !t.done).length;

  return (
    <div className="flex h-full flex-col gap-3 p-1">
      {/* App Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400">
            <Bell size={16} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Tâches & Rappels Nexus</h2>
            <p className="text-[11px] text-slate-400">Gérés en direct par l'IA et synchronisés</p>
          </div>
        </div>
        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-cyan-300">
          {remaining} en attente
        </span>
      </div>

      {/* Task input form */}
      <form onSubmit={add} className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Nouveau rappel ou tâche..."
            className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-500/50"
          />
          <button
            type="submit"
            className="flex items-center gap-1 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-medium text-black hover:bg-cyan-400 transition-all"
          >
            <Plus size={16} />
            Ajouter
          </button>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Calendar size={13} className="text-cyan-400" />
          <input
            type="text"
            value={dueDateInput}
            onChange={(e) => setDueDateInput(e.target.value)}
            placeholder="Heure / Date optionnelle (ex: Demain 18h, À 14h30...)"
            className="flex-1 rounded-lg border border-white/5 bg-white/5 px-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-cyan-500/30"
          />
        </div>
      </form>

      {/* List of Tasks & Reminders */}
      <ul className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
        {tasks.map((t) => (
          <li
            key={t.id}
            className={`group flex items-start justify-between gap-3 rounded-xl border px-3.5 py-2.5 transition-all ${
              t.done
                ? "border-white/5 bg-white/[0.02] opacity-60"
                : "border-cyan-500/20 bg-cyan-950/20 hover:border-cyan-500/40"
            }`}
          >
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <button
                onClick={() =>
                  setTasks((prev) =>
                    prev.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x))
                  )
                }
                className="mt-0.5 text-slate-400 hover:text-cyan-400 transition-colors"
                aria-label="Marquer comme faite"
              >
                {t.done ? (
                  <CheckCircle2 size={18} className="text-cyan-400" />
                ) : (
                  <Circle size={18} />
                )}
              </button>
              <div className="flex flex-col min-w-0 flex-1">
                <span
                  className={`text-sm font-medium leading-snug break-words ${
                    t.done ? "text-slate-500 line-through" : "text-slate-100"
                  }`}
                >
                  {t.text}
                </span>
                {t.dueDate && (
                  <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-cyan-300/80">
                    <Bell size={10} />
                    {t.dueDate}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => setTasks((prev) => prev.filter((x) => x.id !== t.id))}
              aria-label="Supprimer"
              className="text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400 p-1"
            >
              <Trash2 size={15} />
            </button>
          </li>
        ))}

        {tasks.length === 0 && (
          <li className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-slate-500 py-8">
            <Bell size={28} className="text-slate-600 opacity-40" />
            <p className="text-xs">Aucun rappel en cours.</p>
            <p className="text-[11px] text-slate-600">
              Demandez à l'IA : "Rappelle-moi de préparer mon dossier à 18h" !
            </p>
          </li>
        )}
      </ul>
    </div>
  );
}


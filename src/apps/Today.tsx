import { usePersistentState } from "../lib/persist";
import { getActivity } from "../lib/activity";
import { useSettings } from "../os/useSettings";

interface Task {
  id: string;
  text: string;
  done: boolean;
}

export default function Today() {
  const [intention, setIntention] = usePersistentState<string>(
    "nexus.intention",
    ""
  );
  const [tasks] = usePersistentState<Task[]>("nexus.tasks", []);
  const userName = useSettings((s) => s.userName);
  const activity = getActivity();

  const todo = tasks.filter((t) => !t.done).slice(0, 4);
  const dateLabel = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto">
      <div>
        <h3 className="text-base font-medium text-nexus-text">
          {userName ? `Bonjour, ${userName}` : "Ta journee"}
        </h3>
        <p className="text-xs capitalize text-nexus-muted">{dateLabel}</p>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[11px] uppercase tracking-wider text-nexus-muted">
          Ton intention du jour
        </span>
        <input
          value={intention}
          onChange={(e) => setIntention(e.target.value)}
          placeholder="Sur quoi veux-tu avancer aujourd'hui ?"
          className="rounded-lg border border-nexus-border bg-nexus-bg px-3 py-2.5 text-sm text-nexus-text outline-none focus:border-white/30"
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[11px] uppercase tracking-wider text-nexus-muted">
          A faire
        </span>
        {todo.length > 0 ? (
          <ul className="flex flex-col gap-1.5">
            {todo.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-2 rounded-lg border border-nexus-border bg-nexus-bg px-3 py-2 text-sm text-nexus-text"
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: "var(--accent)" }}
                />
                {t.text}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-nexus-muted/70">
            Rien de prevu. Ouvre « Taches » pour en ajouter.
          </p>
        )}
      </div>

      <div className="mt-auto flex flex-col gap-2">
        <span className="text-[11px] uppercase tracking-wider text-nexus-muted">
          Ton activite
        </span>
        <div className="grid grid-cols-3 gap-2">
          <Stat value={activity.daysActive} label="jours actifs" />
          <Stat value={activity.notes} label="notes" />
          <Stat
            value={activity.tasksDone}
            label={`taches faites`}
          />
        </div>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-lg border border-nexus-border bg-nexus-bg py-3">
      <span className="text-xl font-light text-nexus-text">{value}</span>
      <span className="text-center text-[10px] text-nexus-muted">{label}</span>
    </div>
  );
}

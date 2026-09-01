import { useState } from "react";

// Calendrier mensuel, epure et natif (fonctionne sans connexion).
const DAYS = ["L", "M", "M", "J", "V", "S", "D"];
const MONTHS = [
  "janvier",
  "fevrier",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "aout",
  "septembre",
  "octobre",
  "novembre",
  "decembre",
];

export default function Calendar() {
  const today = new Date();
  const [view, setView] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const year = view.getFullYear();
  const month = view.getMonth();

  // Lundi = premier jour de la semaine.
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function move(delta: number) {
    setView(new Date(year, month + delta, 1));
  }

  const isToday = (d: number) =>
    d === today.getDate() &&
    month === today.getMonth() &&
    year === today.getFullYear();

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <button
          onClick={() => move(-1)}
          className="nx-btn nx-btn-secondary text-sm"
        >
          ‹
        </button>
        <span className="text-sm font-medium capitalize text-nexus-text">
          {MONTHS[month]} {year}
        </span>
        <button
          onClick={() => move(1)}
          className="nx-btn nx-btn-secondary text-sm"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {DAYS.map((d, i) => (
          <span key={i} className="py-1 text-[10px] uppercase text-nexus-muted">
            {d}
          </span>
        ))}
        {cells.map((d, i) => (
          <div
            key={i}
            className="flex aspect-square items-center justify-center rounded-lg text-sm"
            style={
              d && isToday(d)
                ? {
                    backgroundColor: "var(--accent)",
                    color: "#09090b",
                    fontWeight: 600,
                  }
                : undefined
            }
          >
            <span className={d ? "text-nexus-text" : "text-transparent"}>
              {d ?? "."}
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={() => setView(new Date(today.getFullYear(), today.getMonth(), 1))}
        className="nx-btn nx-btn-secondary mt-auto text-xs"
      >
        Revenir à aujourd'hui
      </button>
    </div>
  );
}

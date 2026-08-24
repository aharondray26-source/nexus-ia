import React, { useEffect, useState } from "react";
import { usePersistentState } from "../lib/persist";
import { useSettings } from "./useSettings";
import { useWindows } from "./useWindows";

// Petites cartes d'accueil, discretes et epurees. Chacune est activable dans
// Personnalisation. On clique une carte pour ouvrir l'espace complet.

interface Task {
  id: string;
  text: string;
  done: boolean;
}

function Card({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex min-w-[130px] flex-col gap-1 rounded-xl border border-nexus-border bg-nexus-panel/50 px-4 py-3 text-left backdrop-blur-[var(--glass-blur)] transition-colors hover:border-white/20"
    >
      {children}
    </button>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] uppercase tracking-wider text-nexus-muted">
      {children}
    </span>
  );
}

function TasksWidget() {
  const [tasks] = usePersistentState<Task[]>("nexus.tasks", []);
  const openApp = useWindows((s) => s.openApp);
  const todo = tasks.filter((t) => !t.done);
  return (
    <Card onClick={() => openApp("tasks", { width: 420, height: 460 })}>
      <Label>A faire</Label>
      <span className="max-w-[200px] truncate text-sm text-nexus-text">
        {todo.length === 0 ? "Rien de prevu" : todo[0].text}
      </span>
      {todo.length > 1 && (
        <span className="text-[11px] text-nexus-muted">
          +{todo.length - 1} autre{todo.length - 1 > 1 ? "s" : ""}
        </span>
      )}
    </Card>
  );
}

function WeatherWidget() {
  const [city] = usePersistentState<string>("nexus.weatherCity", "");
  const openApp = useWindows((s) => s.openApp);
  const [temp, setTemp] = useState<number | null>(null);
  const [place, setPlace] = useState("");

  useEffect(() => {
    if (!city.trim()) return;
    (async () => {
      try {
        const g = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
            city
          )}&count=1&language=fr&format=json`
        ).then((r) => r.json());
        const p = g?.results?.[0];
        if (!p) return;
        const w = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${p.latitude}&longitude=${p.longitude}&current=temperature_2m`
        ).then((r) => r.json());
        setTemp(Math.round(w.current.temperature_2m));
        setPlace(p.name);
      } catch {
        // silencieux
      }
    })();
  }, [city]);

  if (!city.trim() || temp === null) return null;

  return (
    <Card onClick={() => openApp("weather", { width: 420, height: 460 })}>
      <Label>Meteo</Label>
      <span className="text-sm text-nexus-text">
        {temp}° · {place}
      </span>
    </Card>
  );
}

function HistoryWidget() {
  const openApp = useWindows((s) => s.openApp);
  const [event, setEvent] = useState<{ year: number; text: string } | null>(
    null
  );

  useEffect(() => {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    (async () => {
      try {
        const data = await fetch(
          `https://fr.wikipedia.org/api/rest_v1/feed/onthisday/events/${mm}/${dd}`
        ).then((r) => r.json());
        const list = data?.events ?? [];
        if (list.length) {
          const pick = list[Math.floor(Math.random() * list.length)];
          setEvent({ year: pick.year, text: pick.text });
        }
      } catch {
        // silencieux
      }
    })();
  }, []);

  if (!event) return null;

  return (
    <Card onClick={() => openApp("onthisday", { width: 460, height: 480 })}>
      <Label>Ce jour</Label>
      <span className="line-clamp-2 text-xs leading-relaxed text-nexus-text">
        <span style={{ color: "var(--accent)" }}>{event.year}</span> ·{" "}
        {event.text}
      </span>
    </Card>
  );
}

export default function HomeWidgets() {
  const widgets = useSettings((s) => s.widgets);
  const anything =
    widgets.tasks || widgets.weather || widgets.history;
  if (!anything) return null;

  return (
    <div className="flex flex-wrap items-stretch justify-center gap-3">
      {widgets.tasks && <TasksWidget />}
      {widgets.weather && <WeatherWidget />}
      {widgets.history && <HistoryWidget />}
    </div>
  );
}

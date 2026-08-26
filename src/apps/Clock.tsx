import { useEffect, useRef, useState } from "react";

type Mode = "minuteur" | "chrono";

export default function Clock() {
  const [now, setNow] = useState(new Date());
  const [mode, setMode] = useState<Mode>("minuteur");

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="text-center">
        <div className="text-3xl font-light tracking-tight text-nexus-text">
          {now.toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
        <div className="mt-0.5 text-xs text-nexus-muted">
          {now.toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </div>
      </div>

      <div className="flex gap-2">
        {(["minuteur", "chrono"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="nx-btn nx-btn-secondary flex-1 text-xs"
            style={
              mode === m
                ? { borderColor: "var(--accent)", color: "var(--accent)" }
                : { borderColor: "#27272a", color: "#a1a1aa" }
            }
          >
            {m === "minuteur" ? "Minuteur" : "Chronometre"}
          </button>
        ))}
      </div>

      {mode === "minuteur" ? <Timer /> : <Stopwatch />}
    </div>
  );
}

function Timer() {
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    if (running) {
      ref.current = window.setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            setRunning(false);
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    }
    return () => {
      if (ref.current) window.clearInterval(ref.current);
    };
  }, [running]);

  function applyCustom() {
    const total = Math.max(0, minutes) * 60 + Math.max(0, Math.min(59, seconds));
    setRunning(false);
    setRemaining(total);
  }

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-nexus-border bg-nexus-bg p-4">
      <div className="text-5xl font-light tabular-nums text-nexus-text">
        {mm}:{ss}
      </div>

      <div className="flex items-center gap-2 text-xs text-nexus-muted">
        <input
          type="number"
          min={0}
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
          className="w-14 rounded-md border border-nexus-border bg-nexus-panel px-2 py-1 text-center text-sm text-nexus-text outline-none"
        />
        min
        <input
          type="number"
          min={0}
          max={59}
          value={seconds}
          onChange={(e) => setSeconds(Number(e.target.value))}
          className="w-14 rounded-md border border-nexus-border bg-nexus-panel px-2 py-1 text-center text-sm text-nexus-text outline-none"
        />
        sec
        <button
          onClick={applyCustom}
          className="nx-btn nx-btn-secondary"
        >
          Regler
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setRunning((r) => !r)}
          className="nx-btn nx-btn-secondary text-sm"
        >
          {running ? "Pause" : "Demarrer"}
        </button>
        <button
          onClick={applyCustom}
          className="nx-btn nx-btn-secondary text-sm"
        >
          Reinitialiser
        </button>
      </div>
    </div>
  );
}

function Stopwatch() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    if (running) {
      const start = Date.now() - elapsed;
      ref.current = window.setInterval(() => setElapsed(Date.now() - start), 50);
    }
    return () => {
      if (ref.current) window.clearInterval(ref.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const totalSec = Math.floor(elapsed / 1000);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const ss = String(totalSec % 60).padStart(2, "0");
  const cs = String(Math.floor((elapsed % 1000) / 10)).padStart(2, "0");

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 rounded-xl border border-nexus-border bg-nexus-bg p-4">
      <div className="text-5xl font-light tabular-nums text-nexus-text">
        {mm}:{ss}
        <span className="text-2xl text-nexus-muted">,{cs}</span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => setRunning((r) => !r)}
          className="nx-btn nx-btn-secondary text-sm"
        >
          {running ? "Pause" : "Demarrer"}
        </button>
        <button
          onClick={() => {
            setRunning(false);
            setElapsed(0);
          }}
          className="nx-btn nx-btn-secondary text-sm"
        >
          Reinitialiser
        </button>
      </div>
    </div>
  );
}

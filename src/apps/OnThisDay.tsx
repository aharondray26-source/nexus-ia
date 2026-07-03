import { useEffect, useState } from "react";
import { openAiWindow } from "../lib/tauri";

// Ephemeride : "ce jour dans l'histoire". Le contenu change chaque jour, ce qui
// donne une petite raison sobre de revenir. Source : Wikipedia (libre).
interface Event {
  year: number;
  text: string;
  url?: string;
}

export default function OnThisDay() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");

    (async () => {
      try {
        const res = await fetch(
          `https://fr.wikipedia.org/api/rest_v1/feed/onthisday/events/${mm}/${dd}`
        );
        if (!res.ok) throw new Error("indisponible");
        const data = await res.json();
        const list: Event[] = (data.events ?? [])
          .map((e: { year: number; text: string; pages?: { content_urls?: { desktop?: { page?: string } } }[] }) => ({
            year: e.year,
            text: e.text,
            url: e.pages?.[0]?.content_urls?.desktop?.page,
          }))
          .sort((a: Event, b: Event) => b.year - a.year);
        setEvents(list);
      } catch {
        setError("Connexion indisponible.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const dateLabel = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
  });

  return (
    <div className="flex h-full flex-col gap-3">
      <div>
        <h3 className="text-sm font-semibold text-nexus-text">
          Ce jour dans l'histoire
        </h3>
        <p className="text-xs capitalize text-nexus-muted">{dateLabel}</p>
      </div>

      {loading && <p className="text-sm text-nexus-muted">Chargement...</p>}
      {error && <p className="text-sm text-nexus-muted">{error}</p>}

      <ul className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {events.map((e, i) => (
          <li key={i}>
            <button
              onClick={() => e.url && openAiWindow(`histoire-${e.year}`, e.url)}
              className="flex w-full gap-3 rounded-lg border border-nexus-border bg-nexus-bg px-3 py-2.5 text-left transition-colors hover:border-white/20"
            >
              <span
                className="shrink-0 text-xs font-semibold"
                style={{ color: "var(--accent)" }}
              >
                {e.year}
              </span>
              <span className="text-xs leading-relaxed text-nexus-text">
                {e.text}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

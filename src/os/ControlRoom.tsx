import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Check, Plus, Play, Music, CloudSun, MessageSquare, StickyNote, Mail,
  Gamepad2, History, ArrowUpRight, Sparkles, CalendarDays, BookOpen,
  Eye, EyeOff, RotateCcw, LayoutGrid, Maximize2, Minimize2, GripVertical,
  Palette, Image as ImageIcon, Settings2, Search, Moon, Sun, Waves, ChevronDown, Download,
} from "lucide-react";
import { useWindows } from "./useWindows";
import { useSettings } from "./useSettings";
import { searchShortcutLabel } from "../lib/platform";
import Icon from "./Icons";
import { APPS } from "./appsRegistry";
import {
  MiniCalc, MiniConvert, MiniTranslate, MiniQr, MiniSearch,
  MiniChess, MiniSpectre, MiniTimer, MiniLinks, MiniTerminal,
} from "./MiniWidgets";

/* ============================ SALLE DE CONTROLE ============================
   Chaque espace apparait comme un widget SOLIDE qui affiche ses vraies
   informations et propose ses actions, sans avoir a ouvrir l'application.
   Clic droit n'importe ou : menu du site pour choisir les widgets affiches.
   ========================================================================= */

function read<T>(key: string, fallback: T): T {
  try { const r = localStorage.getItem(key); return r ? (JSON.parse(r) as T) : fallback; }
  catch { return fallback; }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent("nexus:persist-update", { detail: { key } }));
  } catch { /* stockage plein */ }
}
function useLive<T>(key: string, fallback: T): T {
  const [v, setV] = useState<T>(() => read(key, fallback));
  useEffect(() => {
    const h = () => setV(read(key, fallback));
    window.addEventListener("nexus:persist-update", h);
    window.addEventListener("storage", h);
    return () => { window.removeEventListener("nexus:persist-update", h); window.removeEventListener("storage", h); };
  }, [key]);
  return v;
}

// -------------------------- coquille commune --------------------------
function Widget({ title, icon, hue, onOpen, span = 1, tall = false, children, footer }: {
  title: string; icon: React.ReactNode; hue: string; onOpen: () => void;
  span?: 1 | 2; tall?: boolean; children: React.ReactNode; footer?: React.ReactNode;
}) {
  return (
    <div className={`nx-widget group ${span === 2 ? "sm:col-span-2" : ""}`}>
      <div className="flex items-center gap-2">
        <span className="nx-widget-icon" style={{ backgroundColor: hue + "26", color: hue }}>{icon}</span>
        <span className="nx-widget-title min-w-0 flex-1 truncate">{title}</span>
        <button onClick={onOpen} title={`Ouvrir ${title}`}
          className="shrink-0 rounded-lg p-1.5 text-nexus-muted opacity-0 transition-opacity hover:bg-white/10 hover:text-nexus-text group-hover:opacity-100">
          <ArrowUpRight size={15} />
        </button>
      </div>
      <div className="nx-widget-body min-h-0 flex-1">{children}</div>
      {footer}
    </div>
  );
}

// ------------------------------ HORLOGE ------------------------------
function ClockWidget({ onOpen }: { onOpen: () => void }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const i = window.setInterval(() => setNow(new Date()), 1000); return () => window.clearInterval(i); }, []);
  const s = now.getSeconds(), m = now.getMinutes(), h = now.getHours() % 12;
  const hand = (deg: number, len: number, w: number, color: string) => (
    <line x1="50" y1="50"
      x2={50 + len * Math.sin((deg * Math.PI) / 180)}
      y2={50 - len * Math.cos((deg * Math.PI) / 180)}
      stroke={color} strokeWidth={w} strokeLinecap="round" />
  );
  return (
    <div className="nx-widget group items-center justify-center">
      {/* aspect-square garantit un cercle PARFAIT (avant : ovale deforme) */}
      <button onClick={onOpen} title="Ouvrir l'horloge"
        className="relative aspect-square w-full max-w-[190px] shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <defs>
            <radialGradient id="clockFace" cx="50%" cy="35%">
              <stop offset="0%" stopColor="rgba(255,255,255,.09)" />
              <stop offset="100%" stopColor="rgba(255,255,255,.015)" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="48" fill="url(#clockFace)" stroke="rgba(255,255,255,.16)" strokeWidth="1.6" />
          {[...Array(60)].map((_, i) => {
            const a = (i * 6 * Math.PI) / 180, big = i % 5 === 0;
            return <line key={i}
              x1={50 + (big ? 39 : 42) * Math.sin(a)} y1={50 - (big ? 39 : 42) * Math.cos(a)}
              x2={50 + 45 * Math.sin(a)} y2={50 - 45 * Math.cos(a)}
              stroke={big ? "rgba(255,255,255,.5)" : "rgba(255,255,255,.16)"}
              strokeWidth={big ? 2.2 : 0.9} strokeLinecap="round" />;
          })}
          {hand(h * 30 + m * 0.5, 23, 5, "var(--nexus-text)")}
          {hand(m * 6, 33, 3.2, "var(--nexus-text)")}
          {hand(s * 6, 39, 1.3, "var(--accent)")}
          <circle cx="50" cy="50" r="3.4" fill="var(--accent)" />
          <circle cx="50" cy="50" r="1.4" fill="var(--nexus-panel-solid)" />
        </svg>
      </button>
      <div className="text-center">
        <div className="text-lg font-semibold tabular-nums text-nexus-text">
          {now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
        </div>
        <div className="text-xs capitalize text-nexus-muted">
          {now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
        </div>
      </div>
    </div>
  );
}

// ------------------------------ TACHES ------------------------------
interface Task { id: string; text: string; done: boolean }
function TasksWidget({ onOpen }: { onOpen: () => void }) {
  const tasks = useLive<Task[]>("nexus.tasks", []);
  const [draft, setDraft] = useState("");
  const todo = tasks.filter((t) => !t.done);
  return (
    <Widget title="À faire" icon={<Check size={15} />} hue="#43efb6" onOpen={onOpen}
      footer={
        <form onSubmit={(e) => { e.preventDefault(); const t = draft.trim(); if (!t) return;
          write("nexus.tasks", [{ id: `task-${Date.now()}`, text: t, done: false }, ...tasks]); setDraft(""); }}
          className="flex gap-2">
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Nouvelle tâche"
            className="nx-input min-w-0 flex-1" />
          <button type="submit" className="nx-btn nx-btn-primary shrink-0"><Plus size={14} /></button>
        </form>}
    >
      {todo.length === 0 ? (
        <p className="py-2">Rien de prévu aujourd'hui.</p>
      ) : (
        <>
          <div className="mb-2 flex items-baseline gap-2">
            <span className="nx-widget-big">{todo.length}</span>
            <span>tâche{todo.length > 1 ? "s" : ""} en attente</span>
          </div>
          <ul className="flex flex-col gap-1.5">
            {todo.slice(0, 4).map((t) => (
              <li key={t.id} className="flex items-center gap-2.5">
                <button title="Marquer comme faite"
                  onClick={() => write("nexus.tasks", tasks.map((x) => x.id === t.id ? { ...x, done: true } : x))}
                  className="h-4 w-4 shrink-0 rounded-md border border-white/25 transition-colors hover:border-white/60 hover:bg-white/10" />
                <span className="truncate text-nexus-text">{t.text}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Widget>
  );
}

// ------------------------------ NOTES ------------------------------
interface Note { id: string; title?: string; body?: string }
function NotesWidget({ onOpen }: { onOpen: () => void }) {
  const notes = useLive<Note[]>("nexus.notes", []);
  const [draft, setDraft] = useState("");
  return (
    <Widget title="Notes" icon={<StickyNote size={15} />} hue="#f471b6" onOpen={onOpen}
      footer={
        <form onSubmit={(e) => { e.preventDefault(); const t = draft.trim(); if (!t) return;
          write("nexus.notes", [{ id: `note-${Date.now()}`, title: t.slice(0, 40), body: t }, ...notes]); setDraft(""); }}
          className="flex gap-2">
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Écrire une idée"
            className="nx-input min-w-0 flex-1" />
          <button type="submit" className="nx-btn nx-btn-primary shrink-0"><Plus size={14} /></button>
        </form>}
    >
      {notes.length === 0 ? <p className="py-2">Aucune note enregistrée.</p> : (
        <ul className="flex flex-col gap-1.5">
          {notes.slice(0, 4).map((n) => (
            <li key={n.id} className="truncate text-nexus-text">
              {n.title || (n.body || "").slice(0, 46) || "Note"}
            </li>
          ))}
        </ul>
      )}
    </Widget>
  );
}

// ------------------------------ MESSAGES ------------------------------
function MessagesWidget({ onOpen }: { onOpen: () => void }) {
  const [msgs, setMsgs] = useState<{ from: string; text: string }[]>([]);
  const [ok, setOk] = useState(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { auth } = await import("../lib/googleAuth");
        if (!auth.currentUser?.email) return;
        if (alive) setOk(true);
        const { db } = await import("../lib/nexusAccount");
        const { collection, query, where, onSnapshot, orderBy, limit } = await import("firebase/firestore");
        const me = auth.currentUser.email.toLowerCase();
        const q = query(collection(db, "conversations"), where("members", "array-contains", me), orderBy("lastAt", "desc"), limit(4));
        onSnapshot(q, (snap) => {
          if (!alive) return;
          const out: { from: string; text: string }[] = [];
          snap.forEach((d) => {
            const v = d.data() as any;
            const other = (v.members || []).find((m: string) => m !== me) || "";
            out.push({ from: other.split("@")[0], text: v.lastText || "" });
          });
          setMsgs(out);
        }, () => {});
      } catch { /* hors ligne */ }
    })();
    return () => { alive = false; };
  }, []);
  return (
    <Widget title="Messages" icon={<MessageSquare size={15} />} hue="#39ddf9" onOpen={onOpen}
      footer={<button onClick={onOpen} className="nx-btn nx-btn-secondary w-full">Ouvrir la messagerie</button>}>
      {!ok ? <p className="py-2">Connecte ton compte Nexus pour voir tes conversations.</p>
        : msgs.length === 0 ? <p className="py-2">Aucune conversation pour l'instant.</p>
        : <ul className="flex flex-col gap-2">
            {msgs.map((m, i) => (
              <li key={i} className="min-w-0">
                <div className="truncate text-nexus-text">{m.from}</div>
                <div className="truncate text-xs opacity-70">{m.text}</div>
              </li>
            ))}
          </ul>}
    </Widget>
  );
}

// ------------------------------ MAIL ------------------------------
function MailWidget({ onOpen }: { onOpen: () => void }) {
  const user = useLive<{ email?: string } | null>("nexus.googleUser", null);
  const mails = useLive<any[]>(`nexus.userEmails.${user?.email || "mon.adresse@gmail.com"}`, []);
  const inbox = mails.filter((m) => m?.folder === "inbox");
  const unread = inbox.filter((m) => !m?.read).length;
  return (
    <Widget title="Boîte mail" icon={<Mail size={15} />} hue="#f7b13b" onOpen={onOpen}
      footer={<button onClick={onOpen} className="nx-btn nx-btn-secondary w-full">Ouvrir la boîte</button>}>
      {inbox.length === 0 ? <p className="py-2">Boîte vide. Connecte Gmail pour tes vrais messages.</p> : (
        <>
          {unread > 0 && (
            <div className="mb-2 flex items-baseline gap-2">
              <span className="nx-widget-big">{unread}</span><span>non lu{unread > 1 ? "s" : ""}</span>
            </div>
          )}
          <ul className="flex flex-col gap-2">
            {inbox.slice(0, 3).map((m) => (
              <li key={m.id} className="min-w-0">
                <div className="truncate text-nexus-text">{m.senderName}</div>
                <div className="truncate text-xs opacity-70">{m.subject}</div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Widget>
  );
}

// ------------------------------ MUSIQUE ------------------------------
const STATIONS = [
  { name: "Lo-Fi Beats", id: "jfKfPfyJRdk" },
  { name: "Synthwave", id: "4xDzrJKXOOY" },
  { name: "Jazz Café", id: "Dx5qFachd3A" },
  { name: "Piano Solo", id: "TtkFsfOP9QI" },
];
function MusicWidget({ onOpen }: { onOpen: () => void }) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const st = STATIONS[i];
  return (
    <Widget title="Musique" icon={<Music size={15} />} hue="#fb6a7f" onOpen={onOpen}
      footer={
        <div className="flex gap-2">
          <button onClick={() => { setI((i + 1) % STATIONS.length); setPlaying(false); }}
            className="nx-btn nx-btn-secondary flex-1">Suivante</button>
          <button onClick={() => setPlaying((p) => !p)} className="nx-btn nx-btn-primary flex-1">
            <Play size={13} /> {playing ? "Arrêter" : "Écouter"}
          </button>
        </div>}
    >
      <div className="mb-1 text-base font-medium text-nexus-text">{st.name}</div>
      <p className="text-xs">Radio de concentration, en continu.</p>
      {playing && (
        <iframe title={st.name} className="mt-2 h-0 w-0 opacity-0"
          src={`https://www.youtube.com/embed/${st.id}?autoplay=1`}
          allow="autoplay; encrypted-media" />
      )}
    </Widget>
  );
}

// ------------------------------ METEO ------------------------------
function WeatherWidget({ onOpen }: { onOpen: () => void }) {
  const [d, setD] = useState<{ t: number; city: string; max: number; min: number } | null>(null);
  const city = read<string>("nexus.weatherCity", "Paris");
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const g = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=fr&format=json`).then(r => r.json());
        const p = g?.results?.[0]; if (!p) return;
        const w = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.latitude}&longitude=${p.longitude}&current=temperature_2m&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1`).then(r => r.json());
        if (alive) setD({ t: Math.round(w.current.temperature_2m), city: p.name,
          max: Math.round(w.daily.temperature_2m_max[0]), min: Math.round(w.daily.temperature_2m_min[0]) });
      } catch { /* hors ligne */ }
    })();
    return () => { alive = false; };
  }, [city]);
  return (
    <Widget title="Météo" icon={<CloudSun size={15} />} hue="#84b6cd" onOpen={onOpen}>
      {d ? (
        <>
          <div className="flex items-baseline gap-2"><span className="nx-widget-big">{d.t}°</span><span>{d.city}</span></div>
          <p className="mt-1 text-xs">Max {d.max}° · Min {d.min}°</p>
        </>
      ) : <p className="py-2">Chargement…</p>}
    </Widget>
  );
}

// ------------------------------ ARCADE ------------------------------
function ArcadeWidget({ onOpen }: { onOpen: () => void }) {
  const g = (k: string) => Number(localStorage.getItem(k) || 0);
  const rows = [["Neon Arena", g("arcade.best.arena")], ["Serpent", g("arcade.best.snake")], ["2048", g("arcade.best.2048")]] as const;
  const best = Math.max(...rows.map((r) => r[1] as number));
  return (
    <Widget title="Arcade" icon={<Gamepad2 size={15} />} hue="#c084fc" onOpen={onOpen}
      footer={<button onClick={onOpen} className="nx-btn nx-btn-primary w-full"><Play size={13} /> Jouer</button>}>
      <div className="mb-2 flex items-baseline gap-2"><span className="nx-widget-big">{best}</span><span>meilleur score</span></div>
      <ul className="flex flex-col gap-1">
        {rows.map(([n, v]) => (
          <li key={n} className="flex justify-between"><span>{n}</span><span className="tabular-nums text-nexus-text">{v}</span></li>
        ))}
      </ul>
    </Widget>
  );
}

// ------------------------------ CALENDRIER ------------------------------
function CalendarWidget({ onOpen }: { onOpen: () => void }) {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7;
  return (
    <Widget title="Calendrier" icon={<CalendarDays size={15} />} hue="#fb6a7f" onOpen={onOpen}>
      <div className="mb-2 capitalize text-nexus-text">
        {now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center text-[11px]">
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => <span key={i} className="opacity-50">{d}</span>)}
        {Array.from({ length: offset }).map((_, i) => <span key={`o${i}`} />)}
        {Array.from({ length: days }).map((_, i) => {
          const day = i + 1, today = day === now.getDate();
          return (
            <span key={day}
              className={today ? "mx-auto flex h-5 w-5 items-center justify-center rounded-full font-semibold text-white" : ""}
              style={today ? { backgroundColor: "var(--accent)" } : undefined}>
              {day}
            </span>
          );
        })}
      </div>
    </Widget>
  );
}

// ------------------------------ MOT DU JOUR ------------------------------
const WORDS = ["éphémère", "sérendipité", "résilience", "limpide", "obstiné", "clairvoyance", "acuité", "ténacité", "sobriété", "élan"];
function WordWidget({ onOpen }: { onOpen: () => void }) {
  const word = useMemo(() => WORDS[new Date().getDate() % WORDS.length], []);
  const [def, setDef] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    fetch(`https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(word)}`)
      .then(r => r.json()).then(j => { if (alive && j?.extract) setDef(j.extract.slice(0, 130)); }).catch(() => {});
    return () => { alive = false; };
  }, [word]);
  return (
    <Widget title="Mot du jour" icon={<BookOpen size={15} />} hue="#39ddf9" onOpen={onOpen}>
      <div className="mb-1 text-lg font-medium text-nexus-text">{word}</div>
      <p className="text-xs">{def || "Ouvre le dictionnaire pour la définition complète."}</p>
    </Widget>
  );
}

// ------------------------------ CE JOUR ------------------------------
function HistoryWidget({ onOpen }: { onOpen: () => void }) {
  const [item, setItem] = useState<{ year: string; text: string } | null>(null);
  useEffect(() => {
    let alive = true; const d = new Date();
    fetch(`https://fr.wikipedia.org/api/rest_v1/feed/onthisday/events/${d.getMonth() + 1}/${d.getDate()}`)
      .then(r => r.json()).then(j => {
        const e = j?.events?.[Math.floor(Math.random() * Math.min(8, j?.events?.length || 1))];
        if (alive && e) setItem({ year: String(e.year), text: e.text });
      }).catch(() => {});
    return () => { alive = false; };
  }, []);
  return (
    <Widget title="Ce jour dans l'histoire" icon={<History size={15} />} hue="#fb923c" onOpen={onOpen} span={2}>
      {item ? (
        <p><span className="text-lg font-semibold" style={{ color: "var(--accent)" }}>{item.year}</span>
          <span className="mx-2 opacity-40">·</span>{item.text}</p>
      ) : <p className="py-2">Chargement…</p>}
    </Widget>
  );
}

// ------------------------------ IA ------------------------------
function AiWidget({ onOpen }: { onOpen: () => void }) {
  return (
    <Widget title="Intelligence artificielle" icon={<Sparkles size={15} />} hue="#906cf9" onOpen={onOpen}
      footer={<button onClick={onOpen} className="nx-btn nx-btn-primary w-full">Poser une question</button>}>
      <p>Rédiger, expliquer, résumer, résoudre un exercice — dans ton espace.</p>
    </Widget>
  );
}

// ------------- WIDGET GENERIQUE : une carte pour CHAQUE application -------------
// Avant, seules 12 applications avaient un widget ; les 28 autres etaient
// reduites a une minuscule icone. Desormais chaque espace a sa carte.
// Un widget ne sert pas seulement a OUVRIR une application : quand c'est
// possible, il embarque une version reduite mais reellement utilisable.
const MINI: Record<string, (o: () => void) => React.ReactNode> = {
  calculator: () => <MiniCalc />,
  converter: () => <MiniConvert />,
  translator: (o) => <MiniTranslate onOpen={o} />,
  qrcode: () => <MiniQr />,
  web: (o) => <MiniSearch onOpen={o} />,
  chess: (o) => <MiniChess onOpen={o} />,
  spectre: (o) => <MiniSpectre onOpen={o} />,
  links: (o) => <MiniLinks onOpen={o} />,
  terminal: (o) => <MiniTerminal onOpen={o} />,
};

function AppWidget({ app, onOpen }: { app: (typeof APPS)[number]; onOpen: () => void }) {
  const mini = MINI[app.id];
  const desc = app.keywords.split(" ").slice(0, 6).join(" · ");
  return (
    <Widget title={app.title} icon={<Icon name={app.icon} size={15} />} hue={app.hue} onOpen={onOpen}
      footer={mini ? undefined : <button onClick={onOpen} className="nx-btn nx-btn-secondary w-full">Ouvrir</button>}>
      {mini ? mini(onOpen) : <p className="line-clamp-2 text-xs capitalize">{desc}</p>}
    </Widget>
  );
}


// Slot est defini AU NIVEAU DU FICHIER, pas dans le composant.
// Avant, il etait recree a chaque rendu : React le prenait pour un composant
// different, demontait puis remontait tous les widgets, et l'animation
// d'arrivee se rejouait en boucle (toutes les secondes, a cause de l'horloge).
const DIRS = [
  ["-58vw", "-18vh", "-7deg"], ["0", "-46vh", "4deg"], ["58vw", "-16vh", "6deg"],
  ["-52vw", "16vh", "5deg"],   ["0", "46vh", "-4deg"], ["54vw", "20vh", "-6deg"],
  ["-60vw", "-2vh", "3deg"],   ["60vw", "2vh", "-3deg"],
];

const Slot = React.memo(function Slot({
  id, index, size, animate, onDropOn, onDragStartId, children,
}: {
  id: string; index: number; size: "s" | "m" | "l"; animate: boolean;
  onDropOn: (id: string) => void;
  onDragStartId: (id: string) => void;
  children: React.ReactNode;
}) {
  const d = DIRS[index % 8];
  return (
    <div
      data-widget={id}
      draggable
      onDragStart={(e) => { onDragStartId(id); e.currentTarget.classList.add("nx-dragging"); }}
      onDragEnd={(e) => e.currentTarget.classList.remove("nx-dragging")}
      onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("nx-drop-target"); }}
      onDragLeave={(e) => e.currentTarget.classList.remove("nx-drop-target")}
      onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove("nx-drop-target"); onDropOn(id); }}
      className={`group/slot relative flex nx-w-${size} ${animate ? "nx-fly nx-fly-in" : ""}`}
      style={animate ? {
        ["--fx" as string]: d[0], ["--fy" as string]: d[1], ["--fr" as string]: d[2],
        animationDelay: `${Math.min(index * 38, 620)}ms`,
      } : undefined}
    >
      {children}
      <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover/slot:opacity-100">
        <span title="Glisser pour déplacer"
          className="flex cursor-grab rounded-lg bg-black/45 p-1.5 text-white/75 backdrop-blur active:cursor-grabbing">
          <GripVertical size={12} />
        </span>
      </div>
    </div>
  );
});

// ============================== LA SALLE ==============================
type WidgetId = string;   // widgets dedies + une carte par application

// Widgets riches (contenu en direct) — ils passent en premier.
const RICH: { id: WidgetId; label: string }[] = [
  { id: "clock", label: "Horloge" }, { id: "tasks", label: "À faire" },
  { id: "notes", label: "Notes" }, { id: "messages", label: "Messages" },
  { id: "mail", label: "Boîte mail" }, { id: "music", label: "Musique" },
  { id: "weather", label: "Météo" }, { id: "arcade", label: "Arcade" },
  { id: "calendar", label: "Calendrier" }, { id: "word", label: "Mot du jour" },
  { id: "history", label: "Ce jour dans l'histoire" }, { id: "ai", label: "Intelligence artificielle" },
];
// Applications deja representees par un widget riche (on ne les double pas).
const RICH_APPS = new Set(["clock", "tasks", "notes", "messages", "mail", "focus",
  "weather", "game", "calendar", "dictionary", "onthisday", "nexus-chat"]);

// TOUTES les applications restantes recoivent aussi leur widget.
const ALL: { id: WidgetId; label: string }[] = [
  ...RICH,
  ...APPS.filter((a) => !a.hidden && !RICH_APPS.has(a.id)).map((a) => ({ id: `app:${a.id}`, label: a.title })),
];

export default function ControlRoom() {
  const openApp = useWindows((s) => s.openApp);
  const setPaletteOpen = useWindows((s) => s.setPaletteOpen);
  const userName = useSettings((s) => s.userName);
  const iconColors = useSettings((s) => s.iconColors);
  const switchEffort = useSettings((s) => s.switchEffort);

  const [shown, setShown] = useState<WidgetId[]>(() => read<WidgetId[]>("nexus.widgetsShown", ALL.map((w) => w.id)));
  const [order, setOrder] = useState<WidgetId[]>(() => read<WidgetId[]>("nexus.widgetsOrder", ALL.map((w) => w.id)));
  const [sizes, setSizes] = useState<Record<string, "s" | "m" | "l">>(() => read("nexus.widgetsSizes", {} as Record<string, "s" | "m" | "l">));
  const [aurora, setAurora] = useState<boolean>(() => read("nexus.aurora", true));
  const [menu, setMenu] = useState<{ x: number; y: number; target?: WidgetId } | null>(null);
  // Phase d'accueil facon iPadOS : on voit d'abord un ecran sobre (salut, heure,
  // recherche). Des qu'on descend un peu, les widgets se precipitent en place.
  const [revealed, setRevealed] = useState(false);
  // L'animation d'arrivee ne joue QU'UNE SEULE FOIS par session d'affichage.
  // Un verrou (useRef) garantit qu'aucun reaffichage ne peut la relancer :
  // avant, elle repartait en boucle et rendait la page illisible.
  // Une animation CSS ne se joue qu'au MOMENT ou la classe est posee. Le
  // probleme venait donc du retrait puis de la repose de cette classe.
  // Solution : une fois posee, on ne la retire JAMAIS. Elle ne peut plus
  // rejouer, quels que soient les reaffichages.
  const [animating, setAnimating] = useState(false);
  useEffect(() => {
    if (revealed && !animating) setAnimating(true);
  }, [revealed, animating]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [heroTime, setHeroTime] = useState(new Date());
  useEffect(() => {
    if (revealed) return;          // plus besoin de rafraichir : l'accueil est retire
    const i = window.setInterval(() => setHeroTime(new Date()), 1000);
    return () => window.clearInterval(i);
  }, [revealed]);
  // Navigation entre l'accueil et la salle de controle.
  //  - La barre laterale, les fenetres et les zones qui defilent NE DECLENCHENT
  //    PLUS le changement d'ecran (c'etait tres fatigant : chercher une appli
  //    dans le dock faisait basculer l'affichage).
  //  - Il faut INSISTER : on accumule le geste jusqu'a un seuil reglable.
  // Curseur 0-100 -> effort demande, de tres souple a tres ferme.
  const seuil = 90 + (Math.max(0, Math.min(100, switchEffort)) / 100) * 640;
  const accum = useRef(0);
  const lastMove = useRef(0);

  useEffect(() => {
    const atTop = () => (scrollRef.current?.scrollTop ?? 0) <= 4;

    // Le geste ne compte que s'il part de la zone d'accueil / salle de controle.
    const dansLaZone = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      if (!el || !el.closest) return false;
      if (el.closest("nav, aside, header, [data-window], .nx-context")) return false;
      return !!el.closest("[data-controlroom]");
    };

    const pousser = (delta: number, cible: EventTarget | null) => {
      if (!dansLaZone(cible)) return;
      const now = Date.now();
      // Si on s'arrete plus de 400 ms, l'elan retombe : il faut un geste franc.
      if (now - lastMove.current > 400) accum.current = 0;
      lastMove.current = now;
      // On n'accumule que dans le sens utile.
      if (revealed && !atTop()) { accum.current = 0; return; }
      if ((revealed && delta > 0) || (!revealed && delta < 0)) { accum.current = 0; return; }
      accum.current += Math.abs(delta);
      if (accum.current >= seuil) {
        accum.current = 0;
        setRevealed(!revealed);
      }
    };

    const onWheel = (e: WheelEvent) => pousser(revealed ? e.deltaY : -e.deltaY, e.target);
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t?.closest?.("input, textarea, [contenteditable='true']")) return;
      if (!revealed && ["ArrowDown", "PageDown", " ", "Enter"].includes(e.key)) setRevealed(true);
      if (revealed && atTop() && ["ArrowUp", "PageUp", "Escape"].includes(e.key)) setRevealed(false);
    };

    let ty = 0;
    const onTouchStart = (e: TouchEvent) => { ty = e.touches[0].clientY; accum.current = 0; };
    const onTouchMove = (e: TouchEvent) => {
      const dy = ty - e.touches[0].clientY;
      ty = e.touches[0].clientY;
      pousser(revealed ? -dy : dy, e.target);
    };

    let my = 0, dragging = false;
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("button, a, input, textarea, select, [draggable='true']")) return;
      if (!dansLaZone(t)) return;
      dragging = true; my = e.clientY; accum.current = 0;
    };
    const onMove = (e: MouseEvent) => {
      if (!dragging) return;
      const dy = my - e.clientY; my = e.clientY;
      pousser(revealed ? -dy : dy, e.target);
    };
    const onUp = () => { dragging = false; accum.current = 0; };

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [revealed, seuil]);
  const menuRef = useRef<HTMLDivElement>(null);
  const dragId = useRef<WidgetId | null>(null);

  const accent = useSettings((st) => st.accent);
  const setAccent = useSettings((st) => st.setAccent);
  const theme = useSettings((st) => st.theme);
  const setTheme = useSettings((st) => st.setTheme);
  const glass = useSettings((st) => st.glass);
  const setGlass = useSettings((st) => st.setGlass);

  function cycleSize(id: WidgetId) {
    const cur = sizes[id] || "s";
    const next: "s" | "m" | "l" = cur === "s" ? "m" : cur === "m" ? "l" : "s";
    const ns = { ...sizes, [id]: next }; setSizes(ns); write("nexus.widgetsSizes", ns);
  }
  function moveTo(from: WidgetId, to: WidgetId) {
    if (from === to) return;
    const list = order.filter((x) => shown.includes(x) || true);
    const a = list.indexOf(from), b = list.indexOf(to);
    if (a < 0 || b < 0) return;
    const next = list.slice(); next.splice(a, 1); next.splice(b, 0, from);
    setOrder(next); write("nexus.widgetsOrder", next);
  }

  const [welcome, setWelcome] = useState<boolean>(() => {
    try { return localStorage.getItem("nexus.welcomed") !== "1"; } catch { return false; }
  });
  function dismissWelcome() {
    try { localStorage.setItem("nexus.welcomed", "1"); } catch {}
    setWelcome(false);
  }

  // Menu du site au clic droit : ecoute au niveau du document (plus fiable
  // que le gestionnaire React sur un conteneur qui defile).
  useEffect(() => {
    const onCtx = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      // On laisse le menu du navigateur sur les champs de texte (copier/coller).
      if (t.closest("input, textarea, [contenteditable='true']")) return;
      e.preventDefault();
      const card = t.closest("[data-widget]") as HTMLElement | null;
      setMenu({ x: e.clientX, y: e.clientY, target: (card?.dataset.widget as WidgetId) || undefined });
    };
    document.addEventListener("contextmenu", onCtx);
    return () => document.removeEventListener("contextmenu", onCtx);
  }, []);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => {
      if (e.button === 2) return;  // ignore le clic droit qui vient d'ouvrir le menu
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(null);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setMenu(null); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [menu]);

  function toggle(id: WidgetId) {
    const next = shown.includes(id) ? shown.filter((x) => x !== id) : [...shown, id];
    setShown(next); write("nexus.widgetsShown", next);
  }

  const salut = useMemo(() => {
    const h = new Date().getHours();
    return h < 6 ? "Bonne nuit" : h < 12 ? "Bonjour" : h < 18 ? "Bon après-midi" : "Bonsoir";
  }, []);

  const open = (id: string, w: number, h: number) => () => openApp(id, { width: w, height: h });
  const W: Record<WidgetId, React.ReactNode> = {
    clock: <ClockWidget key="clock" onOpen={open("clock", 380, 440)} />,
    tasks: <TasksWidget key="tasks" onOpen={open("tasks", 420, 460)} />,
    notes: <NotesWidget key="notes" onOpen={open("notes", 620, 460)} />,
    messages: <MessagesWidget key="messages" onOpen={open("messages", 820, 580)} />,
    mail: <MailWidget key="mail" onOpen={open("mail", 840, 600)} />,
    music: <MusicWidget key="music" onOpen={open("focus", 480, 520)} />,
    weather: <WeatherWidget key="weather" onOpen={open("weather", 420, 460)} />,
    arcade: <ArcadeWidget key="arcade" onOpen={open("game", 760, 620)} />,
    calendar: <CalendarWidget key="calendar" onOpen={open("calendar", 400, 440)} />,
    word: <WordWidget key="word" onOpen={open("dictionary", 460, 460)} />,
    history: <HistoryWidget key="history" onOpen={open("onthisday", 460, 480)} />,
    ai: <AiWidget key="ai" onOpen={open("nexus-chat", 920, 640)} />,
  };

  function render(id: WidgetId): React.ReactNode {
    if (W[id]) return W[id];
    const app = APPS.find((a) => `app:${a.id}` === id);
    if (!app) return null;
    return <AppWidget key={id} app={app} onOpen={open(app.id, app.width, app.height)} />;
  }


  return (
    <div
      ref={scrollRef}
      data-controlroom
      className="nx-grain absolute inset-0 overflow-y-auto overflow-x-hidden px-4 py-6 sm:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {aurora && <div className="nx-aurora"><span /><span /><span /></div>}
      {/* La carte du monde reste le repere visuel de l'accueil. */}
      <div className={`nx-world ${revealed ? "nx-world-dim" : ""}`} />
      {welcome && (
        <div onClick={dismissWelcome} className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-5 backdrop-blur-md">
          <div onClick={(e) => e.stopPropagation()} className="nx-widget nexus-fade-in w-full max-w-md items-center gap-4 p-7 text-center">
            <h2 className="text-xl font-semibold text-nexus-text">Bienvenue dans Nexus</h2>
            <p className="nx-widget-body">
              Voici ta salle de contrôle : chaque espace y affiche ses informations
              et ses actions rapides, sans avoir besoin de l'ouvrir.
              <br /><span className="text-nexus-text">Clic droit</span> pour choisir tes widgets.
            </p>
            <button onClick={dismissWelcome} className="nx-btn nx-btn-primary w-full">Entrer</button>
          </div>
        </div>
      )}

      {/* ---------- ECRAN D'ACCUEIL (facon iPadOS) ---------- */}
      {!revealed && (
        <div className="nx-hero relative z-10 flex min-h-[calc(100vh-120px)] flex-col items-center justify-center gap-5 text-center">
          <div className="text-6xl font-extralight tabular-nums tracking-tight text-nexus-text sm:text-7xl">
            {heroTime.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </div>
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-nexus-muted">
            {heroTime.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-nexus-text sm:text-3xl">
            {salut}{userName ? `, ${userName}` : ""}
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-nexus-muted">
            Ton espace de travail tout-en-un : intelligences artificielles, notes,
            révisions, outils et détente — au même endroit.
          </p>
          <button onClick={() => setPaletteOpen(true)}
            className="mt-1 flex w-full max-w-md items-center gap-3 rounded-2xl border border-nexus-border bg-nexus-panel/70 px-5 py-3.5 text-left backdrop-blur-[var(--glass-blur)] transition-colors hover:bg-nexus-panel">
            <Sparkles size={17} style={{ color: "var(--accent)" }} />
            <span className="flex-1 text-sm text-nexus-muted">
              Rechercher un espace ou poser une question à l'IA…
            </span>
            <kbd className="nx-chip text-[10px] font-mono">{searchShortcutLabel()}</kbd>
          </button>
          {/* Telechargement de l'application macOS : visible par tous, des l'accueil */}
          <a
            href="/Nexus-macOS.zip" download
            className="mt-4 flex items-center gap-2.5 rounded-2xl border border-nexus-border bg-nexus-panel/70 px-4 py-2.5 text-left backdrop-blur-[var(--glass-blur)] transition-colors hover:bg-nexus-panel"
          >
            <Download size={16} style={{ color: "var(--accent)" }} />
            <span>
              <span className="block text-xs font-semibold text-nexus-text">
                Installer Nexus sur ton Mac
              </span>
              <span className="block text-[10px] text-nexus-muted">
                Fond d'écran vivant · widgets · dock · compagnon
              </span>
            </span>
          </a>

          <button onClick={() => setRevealed(true)}
            className="nx-hint mt-4 flex flex-col items-center gap-1 text-[11px] text-nexus-muted">
            <ChevronDown size={20} />
            Descends pour ouvrir ta salle de contrôle
          </button>
        </div>
      )}

      <div className={`mx-auto flex w-full min-w-0 max-w-[1400px] flex-col gap-6 ${revealed ? "" : "hidden"}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-nexus-text sm:text-3xl">
            {salut}{userName ? `, ${userName}` : ""}
          </h1>
          <div className="flex items-center gap-2">
            <button onClick={() => setPaletteOpen(true)} className="nx-btn nx-btn-secondary">
              <Sparkles size={14} style={{ color: "var(--accent)" }} /> Rechercher
            </button>
            <button onClick={(e) => setMenu({ x: e.clientX - 200, y: e.clientY + 10 })}
              className="nx-btn nx-btn-secondary" title="Choisir les widgets affichés">
              <LayoutGrid size={14} /> Widgets
            </button>
          </div>
        </div>

        {/* Grille dense : occupe vraiment l'espace disponible */}
        <div className="grid w-full min-w-0 max-w-full auto-rows-min grid-cols-2 gap-4 [grid-auto-flow:dense] md:grid-cols-4 xl:grid-cols-6">
          {order.filter((id) => shown.includes(id)).map((id, i) => (
            <Slot
              key={id} id={id} index={i}
              size={sizes[id] || "s"}
              animate={animating}
              onDragStartId={(x) => { dragId.current = x; }}
              onDropOn={(x) => { if (dragId.current) moveTo(dragId.current, x); }}
            >
              {render(id)}
            </Slot>
          ))}
        </div>

      </div>

      {/* Menu du SITE au clic droit (remplace celui du navigateur) */}
      {menu && (
        <div ref={menuRef} className="nx-context nexus-fade-in"
          style={{ left: Math.min(menu.x, window.innerWidth - 250), top: Math.min(menu.y, window.innerHeight - 480) }}>

          {/* Actions sur le widget vise */}
          {menu.target && (
            <>
              <div className="nx-context-section">{ALL.find((w) => w.id === menu.target)?.label}</div>
              <button onClick={() => { toggle(menu.target!); setMenu(null); }}>
                <EyeOff size={14} /> Masquer ce widget
              </button>
              <button onClick={() => { const first = order.filter((i) => shown.includes(i))[0];
                if (first) moveTo(menu.target!, first); setMenu(null); }}>
                <GripVertical size={14} /> Mettre en premier
              </button>
              <div className="my-1 h-px bg-white/10" />
            </>
          )}

          {/* Apparence */}
          <div className="nx-context-section">Apparence</div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5">
            {["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#38bdf8", "#a855f7", "#f472b6"].map((c) => (
              <button key={c} onClick={() => setAccent(c)} title="Couleur d'accent"
                className={`nx-swatch ${accent === c ? "nx-swatch-on" : ""}`} style={{ backgroundColor: c }} />
            ))}
          </div>
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            {theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
          </button>
          <button onClick={() => { const n = !aurora; setAurora(n); write("nexus.aurora", n); }}>
            <Waves size={14} /> {aurora ? "Desactiver le fond anime" : "Activer le fond anime"}
          </button>
          <div className="flex items-center gap-2.5 px-2.5 py-2">
            <ImageIcon size={14} className="shrink-0 text-nexus-muted" />
            <input type="range" min={0} max={100} value={glass}
              onChange={(e) => setGlass(Number(e.target.value))} className="flex-1" title="Effet verre" />
            <span className="w-8 shrink-0 text-right text-[10px] tabular-nums text-nexus-muted">{glass}%</span>
          </div>

          <div className="my-1 h-px bg-white/10" />

          {/* Widgets */}
          <div className="nx-context-section">Widgets affiches</div>
          <div className="max-h-[168px] overflow-y-auto">
            {ALL.map((w) => (
              <button key={w.id} onClick={() => toggle(w.id)}>
                {shown.includes(w.id) ? <Eye size={14} style={{ color: "var(--accent)" }} /> : <EyeOff size={14} className="opacity-40" />}
                <span className={shown.includes(w.id) ? "" : "opacity-50"}>{w.label}</span>
              </button>
            ))}
          </div>

          <div className="my-1 h-px bg-white/10" />

          {/* Actions rapides */}
          <div className="nx-context-section">Actions</div>
          <button onClick={() => { setPaletteOpen(true); setMenu(null); }}>
            <Search size={14} /> Rechercher un espace
          </button>
          <button onClick={() => { openApp("settings", { width: 460, height: 560 }); setMenu(null); }}>
            <Settings2 size={14} /> Personnalisation complete
          </button>
          <button onClick={() => {
            const all = ALL.map((w) => w.id);
            setShown(all); write("nexus.widgetsShown", all);
            setOrder(all); write("nexus.widgetsOrder", all);
            setSizes({}); write("nexus.widgetsSizes", {});
            setMenu(null);
          }}>
            <RotateCcw size={14} /> Reinitialiser la disposition
          </button>
        </div>
      )}
    </div>
  );
}

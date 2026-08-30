import { useEffect, useState, type FormEvent } from "react";
import { classer, type Verdict } from "../lib/politique";
import { Calculator, ArrowLeftRight, Languages, QrCode, Search, Terminal as TermIcon,
  Swords, Palette, Link2, Timer, ScanLine, Type } from "lucide-react";

/* ============ MINI-OUTILS DANS LES WIDGETS ============
   Un widget ne doit pas seulement OUVRIR une application : il doit permettre
   de s'en servir tout de suite. Chaque mini-outil ci-dessous est une version
   reduite mais REELLEMENT fonctionnelle de son application. */

export function MiniCalc() {
  const [v, setV] = useState("");
  const [res, setRes] = useState<string | null>(null);
  const K = ["7","8","9","/","4","5","6","*","1","2","3","-","0",".","=","+"];
  function press(k: string) {
    if (k === "=") {
      try {
        if (!/^[0-9+\-*/.() ]+$/.test(v)) { setRes("?"); return; }
        // eslint-disable-next-line no-new-func
        const r = Function(`"use strict";return (${v})`)();
        setRes(String(Number.isFinite(r) ? +Number(r).toFixed(6) : "?"));
      } catch { setRes("?"); }
    } else { setV((p) => p + k); setRes(null); }
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-lg bg-black/25 px-2.5 py-1.5 text-right">
        <div className="truncate text-xs text-nexus-muted">{v || "0"}</div>
        {res !== null && <div className="text-lg font-semibold text-nexus-text">{res}</div>}
      </div>
      <div className="grid grid-cols-4 gap-1">
        {K.map((k) => (
          <button key={k} onClick={() => press(k)}
            className="rounded-md bg-white/[0.07] py-1.5 text-xs font-medium text-nexus-text transition-colors hover:bg-white/[0.14]">
            {k}
          </button>
        ))}
        <button onClick={() => { setV(""); setRes(null); }}
          className="col-span-4 rounded-md bg-white/[0.05] py-1 text-[11px] text-nexus-muted hover:bg-white/[0.1]">
          Effacer
        </button>
      </div>
    </div>
  );
}

const UNITS: Record<string, Record<string, number>> = {
  Longueur: { m: 1, km: 1000, cm: 0.01, mi: 1609.34, ft: 0.3048 },
  Masse: { kg: 1, g: 0.001, lb: 0.453592, oz: 0.0283495 },
  Volume: { L: 1, mL: 0.001, gal: 3.78541 },
};
export function MiniConvert() {
  const [fam, setFam] = useState("Longueur");
  const [from, setFrom] = useState("m");
  const [to, setTo] = useState("km");
  const [val, setVal] = useState("1");
  const list = Object.keys(UNITS[fam]);
  const out = (() => {
    const n = parseFloat(val);
    if (!Number.isFinite(n)) return "—";
    const r = (n * UNITS[fam][from]) / UNITS[fam][to];
    return String(+r.toFixed(6));
  })();
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1">
        {Object.keys(UNITS).map((f) => (
          <button key={f} onClick={() => { setFam(f); const k = Object.keys(UNITS[f]); setFrom(k[0]); setTo(k[1]); }}
            className={`flex-1 rounded-md py-1 text-[10px] ${fam === f ? "text-white" : "text-nexus-muted"}`}
            style={fam === f ? { backgroundColor: "var(--accent)" } : { backgroundColor: "rgba(255,255,255,.07)" }}>
            {f}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <input value={val} onChange={(e) => setVal(e.target.value)} className="nx-input min-w-0 flex-1 text-xs" />
        <select value={from} onChange={(e) => setFrom(e.target.value)} className="nx-input shrink-0 text-xs">
          {list.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="min-w-0 flex-1 truncate rounded-lg bg-black/25 px-2.5 py-2 text-sm font-semibold text-nexus-text">{out}</div>
        <select value={to} onChange={(e) => setTo(e.target.value)} className="nx-input shrink-0 text-xs">
          {list.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>
    </div>
  );
}

export function MiniTranslate({ onOpen }: { onOpen: () => void }) {
  const [txt, setTxt] = useState("");
  const [lang, setLang] = useState("en");
  const [out, setOut] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function go(e: FormEvent) {
    e.preventDefault();
    if (!txt.trim()) return;
    setBusy(true); setOut(null);
    try {
      const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(txt)}&langpair=fr|${lang}`).then((x) => x.json());
      setOut(r?.responseData?.translatedText || "—");
    } catch { setOut("Traduction indisponible."); }
    finally { setBusy(false); }
  }
  return (
    <form onSubmit={go} className="flex flex-col gap-2">
      <div className="flex gap-1.5">
        <input value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="Texte en français"
          className="nx-input min-w-0 flex-1 text-xs" />
        <select value={lang} onChange={(e) => setLang(e.target.value)} className="nx-input shrink-0 text-xs">
          <option value="en">EN</option><option value="es">ES</option>
          <option value="de">DE</option><option value="it">IT</option><option value="he">HE</option>
        </select>
      </div>
      <button type="submit" disabled={busy} className="nx-btn nx-btn-primary w-full">
        {busy ? "…" : "Traduire"}
      </button>
      {out && <div className="rounded-lg bg-black/25 px-2.5 py-2 text-xs text-nexus-text">{out}</div>}
    </form>
  );
}

export function MiniQr() {
  const [v, setV] = useState("");
  const src = v.trim()
    ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&margin=6&bgcolor=0c0c0f&color=f4f4f5&data=${encodeURIComponent(v)}`
    : "";
  return (
    <div className="flex flex-col gap-2">
      <input value={v} onChange={(e) => setV(e.target.value)} placeholder="Lien ou texte…"
        className="nx-input w-full text-xs" />
      {src ? <img src={src} alt="QR" className="mx-auto h-[110px] w-[110px] rounded-lg" />
        : <p className="py-3 text-center text-[11px] text-nexus-muted/70">Le QR apparaît ici.</p>}
    </div>
  );
}

export function MiniSearch({ onOpen }: { onOpen: () => void }) {
  const [q, setQ] = useState("");
  const [r, setR] = useState<{ title: string; extract: string } | null>(null);
  const [busy, setBusy] = useState(false);
  async function go(e: FormEvent) {
    e.preventDefault(); if (!q.trim()) return;
    setBusy(true); setR(null);
    try {
      const s = await fetch(`https://fr.wikipedia.org/w/api.php?action=query&list=search&format=json&origin=*&srlimit=1&srsearch=${encodeURIComponent(q)}`).then(x => x.json());
      const t = s?.query?.search?.[0]?.title;
      if (!t) { setR({ title: "Aucun résultat", extract: "" }); return; }
      const d = await fetch(`https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(t)}`).then(x => x.json());
      setR({ title: d.title, extract: (d.extract || "").slice(0, 150) });
    } catch { setR({ title: "Hors ligne", extract: "" }); }
    finally { setBusy(false); }
  }
  return (
    <form onSubmit={go} className="flex flex-col gap-2">
      <div className="flex gap-1.5">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher…" className="nx-input min-w-0 flex-1 text-xs" />
        <button type="submit" disabled={busy} className="nx-btn nx-btn-primary shrink-0"><Search size={13} /></button>
      </div>
      {r && (
        <div className="rounded-lg bg-black/25 px-2.5 py-2">
          <div className="text-xs font-semibold text-nexus-text">{r.title}</div>
          {r.extract && <div className="mt-0.5 line-clamp-3 text-[11px] text-nexus-muted">{r.extract}…</div>}
        </div>
      )}
    </form>
  );
}

export function MiniChess({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-nexus-muted">Lancer une partie :</p>
      <div className="grid grid-cols-2 gap-1.5">
        <button onClick={onOpen} className="nx-btn nx-btn-secondary text-[11px]">2 joueurs</button>
        <button onClick={onOpen} className="nx-btn nx-btn-secondary text-[11px]">Contre l'IA</button>
        <button onClick={onOpen} className="nx-btn nx-btn-secondary text-[11px]">Facile</button>
        <button onClick={onOpen} className="nx-btn nx-btn-primary text-[11px]">Difficile</button>
      </div>
    </div>
  );
}

export function MiniSpectre({ onOpen }: { onOpen: () => void }) {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<Verdict | null>(null);
  function go(e: FormEvent) { e.preventDefault(); if (!q.trim()) return; setRes(classer(q)); }
  const couleur = res?.cote === "gauche" ? "#f87171" : res?.cote === "droite" ? "#60a5fa"
    : res?.cote === "centre" ? "#fbbf24" : "#94a3b8";
  return (
    <form onSubmit={go} className="flex flex-col gap-2">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Parti, personnalité, idée…"
        className="nx-input w-full text-xs" />
      <button type="submit" className="nx-btn nx-btn-primary w-full">Situer</button>
      {res && (
        <div className="rounded-lg bg-black/25 px-2.5 py-2">
          <div className="text-sm font-semibold" style={{ color: couleur }}>{res.libelle}</div>
          <p className="mt-1 text-[11px] leading-relaxed text-nexus-muted">{res.detail}</p>
          {res.confiance === "estimee" && (
            <p className="mt-1 text-[10px] italic text-nexus-muted/70">
              Classement estimé à partir des mots employés, pas une donnée établie.
            </p>
          )}
        </div>
      )}
    </form>
  );
}

export function MiniTimer({ onOpen }: { onOpen: () => void }) {
  const [left, setLeft] = useState(0);
  const [on, setOn] = useState(false);
  // useEffect (et non useState) : le minuteur se nettoie correctement.
  useEffect(() => {
    if (!on) return;
    const i = window.setInterval(() => setLeft((l) => (l > 1 ? l - 1 : (setOn(false), 0))), 1000);
    return () => window.clearInterval(i);
  }, [on]);
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  return (
    <div className="flex flex-col gap-2">
      <div className="text-center text-2xl font-light tabular-nums text-nexus-text">{mm}:{ss}</div>
      <div className="grid grid-cols-3 gap-1.5">
        {[5, 15, 25].map((m) => (
          <button key={m} onClick={() => { setLeft(m * 60); setOn(true); }}
            className="nx-btn nx-btn-secondary text-[11px]">{m} min</button>
        ))}
      </div>
      <button onClick={() => { setLeft(0); setOn(false); }} className="nx-btn nx-btn-secondary w-full text-[11px]">
        Réinitialiser
      </button>
    </div>
  );
}

export function MiniLinks({ onOpen }: { onOpen: () => void }) {
  const L = [
    { n: "Google Docs", u: "https://docs.google.com" },
    { n: "Drive", u: "https://drive.google.com" },
    { n: "Wikipédia", u: "https://fr.wikipedia.org" },
    { n: "DeepL", u: "https://www.deepl.com/translator" },
  ];
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {L.map((l) => (
        <a key={l.n} href={l.u} target="_blank" rel="noopener noreferrer"
          className="nx-btn nx-btn-secondary text-[11px]">
          <Link2 size={11} /> {l.n}
        </a>
      ))}
    </div>
  );
}

export function MiniTerminal({ onOpen }: { onOpen: () => void }) {
  const [line, setLine] = useState("");
  const [out, setOut] = useState<string[]>(["Nexus shell — tape « aide »"]);
  function run(e: FormEvent) {
    e.preventDefault();
    const c = line.trim().toLowerCase(); if (!c) return;
    let r = "";
    if (c === "aide") r = "Commandes : date, heure, calc <expr>, vider";
    else if (c === "date") r = new Date().toLocaleDateString("fr-FR", { dateStyle: "full" });
    else if (c === "heure") r = new Date().toLocaleTimeString("fr-FR");
    else if (c === "vider") { setOut([]); setLine(""); return; }
    else if (c.startsWith("calc ")) {
      const ex = c.slice(5);
      try { r = /^[0-9+\-*/.() ]+$/.test(ex) ? String(Function(`"use strict";return (${ex})`)()) : "expression invalide"; }
      catch { r = "erreur"; }
    } else r = `commande inconnue : ${c}`;
    setOut((p) => [...p.slice(-4), `> ${c}`, r]); setLine("");
  }
  return (
    <form onSubmit={run} className="flex flex-col gap-1.5">
      <div className="h-[74px] overflow-y-auto rounded-lg bg-black/40 p-2 font-mono text-[10px] leading-relaxed text-emerald-300">
        {out.map((l, i) => <div key={i} className="truncate">{l}</div>)}
      </div>
      <input value={line} onChange={(e) => setLine(e.target.value)} placeholder="commande…"
        className="nx-input w-full font-mono text-[11px]" />
    </form>
  );
}

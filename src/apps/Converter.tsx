import { useEffect, useState } from "react";

// Convertisseur : devises (taux en direct, gratuits) et unites courantes.
type Tab = "devises" | "unites";

const CURRENCIES = ["EUR", "USD", "GBP", "CHF", "JPY", "CAD"];

const UNIT_GROUPS: Record<string, Record<string, number>> = {
  Longueur: { m: 1, km: 1000, cm: 0.01, mile: 1609.34, pied: 0.3048 },
  Masse: { g: 1, kg: 1000, mg: 0.001, livre: 453.592, once: 28.3495 },
  Temperature: {}, // traitee a part
};

export default function Converter() {
  const [tab, setTab] = useState<Tab>("devises");
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex gap-2">
        {(["devises", "unites"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="nx-btn nx-btn-secondary flex-1 text-xs"
            style={
              tab === t
                ? { borderColor: "var(--accent)", color: "var(--accent)" }
                : { borderColor: "#27272a", color: "#a1a1aa" }
            }
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "devises" ? <Currency /> : <Units />}
    </div>
  );
}

function Currency() {
  const [amount, setAmount] = useState("1");
  const [from, setFrom] = useState("EUR");
  const [to, setTo] = useState("USD");
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`https://open.er-api.com/v6/latest/${from}`);
        const data = await res.json();
        if (data.result !== "success") throw new Error();
        setRates(data.rates);
        setError(null);
      } catch {
        setError("Taux indisponibles.");
      }
    })();
  }, [from]);

  const value =
    rates && !Number.isNaN(Number(amount))
      ? (Number(amount) * (rates[to] ?? 0)).toFixed(2)
      : "—";

  return (
    <div className="flex flex-1 flex-col gap-3">
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="nx-input text-sm"
      />
      <div className="flex items-center gap-2">
        <select
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="flex-1 rounded-lg border border-nexus-border bg-nexus-bg px-3 py-2 text-sm text-nexus-text outline-none"
        >
          {CURRENCIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <span className="text-nexus-muted">→</span>
        <select
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="flex-1 rounded-lg border border-nexus-border bg-nexus-bg px-3 py-2 text-sm text-nexus-text outline-none"
        >
          {CURRENCIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="rounded-xl border border-nexus-border bg-nexus-bg p-4 text-center">
        <span className="text-2xl font-light text-nexus-text">
          {value} {to}
        </span>
      </div>
      {error && <p className="text-xs text-nexus-muted">{error}</p>}
    </div>
  );
}

function Units() {
  const [group, setGroup] = useState("Longueur");
  const [amount, setAmount] = useState("1");
  const [from, setFrom] = useState("m");
  const [to, setTo] = useState("km");

  const isTemp = group === "Temperature";
  const units = isTemp
    ? ["C", "F", "K"]
    : Object.keys(UNIT_GROUPS[group]);

  function convert(): string {
    const n = Number(amount);
    if (Number.isNaN(n)) return "—";
    if (isTemp) {
      // Vers Celsius d'abord, puis vers la cible.
      let c = n;
      if (from === "F") c = ((n - 32) * 5) / 9;
      if (from === "K") c = n - 273.15;
      let out = c;
      if (to === "F") out = (c * 9) / 5 + 32;
      if (to === "K") out = c + 273.15;
      return out.toFixed(2);
    }
    const table = UNIT_GROUPS[group];
    return ((n * table[from]) / table[to]).toFixed(4);
  }

  function pickGroup(g: string) {
    setGroup(g);
    if (g === "Temperature") {
      setFrom("C");
      setTo("F");
    } else {
      const keys = Object.keys(UNIT_GROUPS[g]);
      setFrom(keys[0]);
      setTo(keys[1]);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {["Longueur", "Masse", "Temperature"].map((g) => (
          <button
            key={g}
            onClick={() => pickGroup(g)}
            className="rounded-full border px-2.5 py-1 text-[11px] transition-colors"
            style={
              group === g
                ? { borderColor: "var(--accent)", color: "var(--accent)" }
                : { borderColor: "#27272a", color: "#a1a1aa" }
            }
          >
            {g}
          </button>
        ))}
      </div>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="nx-input text-sm"
      />
      <div className="flex items-center gap-2">
        <select
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="flex-1 rounded-lg border border-nexus-border bg-nexus-bg px-3 py-2 text-sm text-nexus-text outline-none"
        >
          {units.map((u) => (
            <option key={u}>{u}</option>
          ))}
        </select>
        <span className="text-nexus-muted">→</span>
        <select
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="flex-1 rounded-lg border border-nexus-border bg-nexus-bg px-3 py-2 text-sm text-nexus-text outline-none"
        >
          {units.map((u) => (
            <option key={u}>{u}</option>
          ))}
        </select>
      </div>
      <div className="rounded-xl border border-nexus-border bg-nexus-bg p-4 text-center">
        <span className="text-2xl font-light text-nexus-text">
          {convert()} {to}
        </span>
      </div>
    </div>
  );
}

import { useState } from "react";
import { usePersistentState } from "../lib/persist";

// Tableur : cellules A1 a J30, formules commencant par "=". Gere les operateurs
// (+ - * /), les parentheses, les references (A1), les plages (A1:A5) et des
// fonctions : SOMME, MOYENNE, MIN, MAX, NB, PRODUIT (+ noms anglais).
const COLS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
const ROWS = 30;

type Cells = Record<string, string>;

const FUNCS: Record<string, (n: number[]) => number> = {
  SOMME: (n) => n.reduce((a, b) => a + b, 0),
  SUM: (n) => n.reduce((a, b) => a + b, 0),
  MOYENNE: (n) => (n.length ? n.reduce((a, b) => a + b, 0) / n.length : NaN),
  AVERAGE: (n) => (n.length ? n.reduce((a, b) => a + b, 0) / n.length : NaN),
  MIN: (n) => (n.length ? Math.min(...n) : NaN),
  MAX: (n) => (n.length ? Math.max(...n) : NaN),
  NB: (n) => n.length,
  COUNT: (n) => n.length,
  PRODUIT: (n) => n.reduce((a, b) => a * b, 1),
  PRODUCT: (n) => n.reduce((a, b) => a * b, 1),
};

const CELL_RE = /^[A-J](?:[1-9]|[12]\d|30)$/;

// Valeur numerique d'une cellule (recursif, avec detection de boucle).
function cellNumber(ref: string, cells: Cells, seen: Set<string>): number | "" {
  const raw = (cells[ref] ?? "").trim();
  if (raw === "") return "";
  if (seen.has(ref)) throw new Error("boucle");
  if (!raw.startsWith("=")) {
    const n = Number(raw.replace(",", "."));
    if (Number.isNaN(n)) throw new Error("texte");
    return n;
  }
  seen.add(ref);
  const v = evalFormula(raw.slice(1), cells, seen);
  seen.delete(ref);
  return v;
}

type Tok =
  | { t: "num"; v: number }
  | { t: "cell"; v: string }
  | { t: "func"; v: string }
  | { t: "op"; v: string }
  | { t: "("; }
  | { t: ")"; }
  | { t: ","; }
  | { t: ":"; };

function tokenize(s: string): Tok[] | null {
  const out: Tok[] = [];
  const src = s.toUpperCase().replace(/\s+/g, "");
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      out.push({ t: "num", v: parseFloat(src.slice(i, j)) });
      i = j;
    } else if (/[A-Z]/.test(c)) {
      let j = i;
      while (j < src.length && /[A-Z]/.test(src[j])) j++;
      let k = j;
      while (k < src.length && /[0-9]/.test(src[k])) k++;
      const word = src.slice(i, k);
      if (CELL_RE.test(word)) out.push({ t: "cell", v: word });
      else if (FUNCS[src.slice(i, j)]) out.push({ t: "func", v: src.slice(i, j) });
      else return null;
      i = k;
    } else if ("+-*/".includes(c)) {
      out.push({ t: "op", v: c });
      i++;
    } else if (c === "(") { out.push({ t: "(" }); i++; }
    else if (c === ")") { out.push({ t: ")" }); i++; }
    else if (c === ",") { out.push({ t: "," }); i++; }
    else if (c === ":") { out.push({ t: ":" }); i++; }
    else return null;
  }
  return out;
}

// Analyseur recursif (descente) : renvoie un nombre, ou leve une erreur.
class Parser {
  i = 0;
  constructor(
    public toks: Tok[],
    public cells: Cells,
    public seen: Set<string>
  ) {}
  peek() { return this.toks[this.i]; }
  next() { return this.toks[this.i++]; }
  atEnd() { return this.i >= this.toks.length; }

  expr(): number {
    let v = this.term();
    while (this.peek()?.t === "op" && "+-".includes((this.peek() as { v: string }).v)) {
      const op = (this.next() as { v: string }).v;
      const r = this.term();
      v = op === "+" ? v + r : v - r;
    }
    return v;
  }
  term(): number {
    let v = this.factor();
    while (this.peek()?.t === "op" && "*/".includes((this.peek() as { v: string }).v)) {
      const op = (this.next() as { v: string }).v;
      const r = this.factor();
      if (op === "/") { if (r === 0) throw new Error("div0"); v = v / r; }
      else v = v * r;
    }
    return v;
  }
  factor(): number {
    const tk = this.peek();
    if (!tk) throw new Error("fin");
    if (tk.t === "op" && tk.v === "-") { this.next(); return -this.factor(); }
    if (tk.t === "op" && tk.v === "+") { this.next(); return this.factor(); }
    if (tk.t === "num") { this.next(); return tk.v; }
    if (tk.t === "(") {
      this.next();
      const v = this.expr();
      if (this.next()?.t !== ")") throw new Error("paren");
      return v;
    }
    if (tk.t === "cell") {
      this.next();
      const n = cellNumber(tk.v, this.cells, this.seen);
      return n === "" ? 0 : n;
    }
    if (tk.t === "func") {
      const name = tk.v;
      this.next();
      if (this.next()?.t !== "(") throw new Error("func");
      const nums: number[] = [];
      if (this.peek()?.t !== ")") {
        do {
          this.arg(nums);
        } while (this.peek()?.t === "," && this.next());
      }
      if (this.next()?.t !== ")") throw new Error("func");
      return FUNCS[name](nums);
    }
    throw new Error("token");
  }
  // Un argument : soit une plage A1:B3, soit une expression simple.
  arg(nums: number[]) {
    const a = this.peek();
    const b = this.toks[this.i + 1];
    const c = this.toks[this.i + 2];
    if (a?.t === "cell" && b?.t === ":" && c?.t === "cell") {
      this.i += 3;
      for (const ref of expandRange(a.v, c.v)) {
        const n = cellNumber(ref, this.cells, this.seen);
        if (n !== "") nums.push(n);
      }
    } else {
      nums.push(this.expr());
    }
  }
}

function expandRange(a: string, b: string): string[] {
  const c1 = a.charCodeAt(0), r1 = parseInt(a.slice(1), 10);
  const c2 = b.charCodeAt(0), r2 = parseInt(b.slice(1), 10);
  const refs: string[] = [];
  for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++)
    for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++)
      refs.push(String.fromCharCode(c) + r);
  return refs;
}

function evalFormula(body: string, cells: Cells, seen: Set<string>): number {
  const toks = tokenize(body);
  if (!toks || toks.length === 0) throw new Error("vide");
  const p = new Parser(toks, cells, seen);
  const v = p.expr();
  if (!p.atEnd()) throw new Error("reste");
  if (Number.isNaN(v)) throw new Error("nan");
  return Math.round(v * 1e10) / 1e10;
}

// Valeur affichee d'une cellule (gere les erreurs proprement).
function display(ref: string, cells: Cells): string {
  const raw = (cells[ref] ?? "").trim();
  if (raw === "") return "";
  try {
    const v = cellNumber(ref, cells, new Set());
    return v === "" ? "" : String(v);
  } catch {
    return raw.startsWith("=") ? "#ERREUR" : raw;
  }
}

function csvEscape(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}
// Analyse une ligne CSV (gere les guillemets et les virgules echappees).
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

export default function Sheet() {
  const [cells, setCells] = usePersistentState<Cells>("nexus.sheet", {});
  const [focused, setFocused] = useState<string | null>(null);

  function setCell(key: string, value: string) {
    setCells((prev) => {
      const next = { ...prev };
      if (value === "") delete next[key];
      else next[key] = value;
      return next;
    });
  }

  // Exporte les valeurs calculees en fichier CSV (ouvrable dans Excel/Sheets).
  function exportCSV() {
    const lines: string[] = [];
    for (let r = 1; r <= ROWS; r++) {
      lines.push(COLS.map((c) => csvEscape(display(`${c}${r}`, cells))).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "tableur-nexus.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // Importe un CSV : remplit les cellules a partir de A1.
  async function importCSV(file: File) {
    const text = await file.text();
    const next: Cells = {};
    text.split(/\r?\n/).forEach((line, r) => {
      if (r >= ROWS || line === "") return;
      parseCsvLine(line).forEach((v, ci) => {
        if (ci < COLS.length && v !== "") next[`${COLS[ci]}${r + 1}`] = v;
      });
    });
    setCells(next);
  }

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-nexus-muted">
          Formules avec <kbd className="rounded border border-nexus-border px-1 py-0.5 text-[9px]">=</kbd>{" "}
          : =A1+B2, =SOMME(A1:A5), =MOYENNE(B1:B9), =MAX(...)
        </span>
        <div className="flex items-center gap-1.5">
          <label className="cursor-pointer rounded-md border border-nexus-border px-2.5 py-1 text-[11px] text-nexus-muted transition-colors hover:text-nexus-text">
            Importer CSV
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && importCSV(e.target.files[0])}
            />
          </label>
          <button
            onClick={exportCSV}
            className="rounded-md border border-nexus-border px-2.5 py-1 text-[11px] text-nexus-muted transition-colors hover:text-nexus-text"
          >
            Exporter CSV
          </button>
          <button
            onClick={() => setCells({})}
            className="rounded-md border border-nexus-border px-2.5 py-1 text-[11px] text-nexus-muted transition-colors hover:text-red-400"
          >
            Effacer
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto rounded-lg border border-nexus-border">
        <table className="border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-20 min-w-[34px] border-b border-r border-nexus-border bg-nexus-panel px-1 py-1 text-[10px] font-normal text-nexus-muted" />
              {COLS.map((c) => (
                <th
                  key={c}
                  className="sticky top-0 z-10 min-w-[76px] border-b border-r border-nexus-border bg-nexus-panel px-1 py-1 text-[10px] font-medium text-nexus-muted"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: ROWS }, (_, i) => i + 1).map((row) => (
              <tr key={row}>
                <td className="sticky left-0 z-10 border-b border-r border-nexus-border bg-nexus-panel px-1 py-0.5 text-center text-[10px] text-nexus-muted">
                  {row}
                </td>
                {COLS.map((col) => {
                  const key = `${col}${row}`;
                  const raw = cells[key] ?? "";
                  const shown = focused === key ? raw : display(key, cells);
                  const isNumber =
                    focused !== key && shown !== "" && !Number.isNaN(Number(shown));
                  return (
                    <td key={key} className="border-b border-r border-nexus-border p-0">
                      <input
                        value={shown}
                        onChange={(e) => setCell(key, e.target.value)}
                        onFocus={() => setFocused(key)}
                        onBlur={() => setFocused(null)}
                        className={`w-full min-w-[76px] bg-transparent px-1.5 py-1 text-xs text-nexus-text outline-none focus:bg-white/[0.04] ${
                          isNumber ? "text-right" : "text-left"
                        } ${shown.startsWith("#") ? "text-red-400" : ""}`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

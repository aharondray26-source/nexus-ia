import { useState } from "react";

// Calculatrice simple et fiable. On evalue nous-memes l'expression, sans jamais
// utiliser eval(), pour rester sur et previsible.
const KEYS = [
  ["7", "8", "9", "/"],
  ["4", "5", "6", "*"],
  ["1", "2", "3", "-"],
  ["0", ".", "=", "+"],
];

// Evaluation d'une expression arithmetique simple (+ - * /) avec priorites.
function evaluate(expr: string): string {
  // Un moins en tete ("-5+3") devient "0-5+3" pour rester calculable.
  const prepared = expr.startsWith("-") ? "0" + expr : expr;
  const tokens = prepared.match(/(\d+\.?\d*|[+\-*/])/g);
  if (!tokens) return "";
  const values: number[] = [];
  const ops: string[] = [];
  const prec = (o: string) => (o === "+" || o === "-" ? 1 : 2);
  const apply = () => {
    const b = values.pop();
    const a = values.pop();
    const o = ops.pop();
    if (a === undefined || b === undefined || o === undefined) return;
    if (o === "+") values.push(a + b);
    else if (o === "-") values.push(a - b);
    else if (o === "*") values.push(a * b);
    else if (o === "/") values.push(b === 0 ? NaN : a / b);
  };
  for (const t of tokens) {
    if (/\d/.test(t)) {
      values.push(parseFloat(t));
    } else {
      while (ops.length && prec(ops[ops.length - 1]) >= prec(t)) apply();
      ops.push(t);
    }
  }
  while (ops.length) apply();
  const result = values.pop();
  if (result === undefined || Number.isNaN(result)) return "Erreur";
  return String(Math.round(result * 1e10) / 1e10);
}

export default function Calculator() {
  const [expr, setExpr] = useState("");

  function press(key: string) {
    if (key === "=") {
      setExpr((e) => evaluate(e));
    } else {
      setExpr((e) => (e === "Erreur" ? key : e + key));
    }
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 truncate rounded-lg border border-nexus-border bg-nexus-bg px-3 py-3 text-right text-lg text-nexus-text">
          {expr || "0"}
        </div>
        <button
          onClick={() => setExpr("")}
          className="rounded-lg border border-nexus-border px-3 py-3 text-xs text-nexus-muted transition-colors hover:text-nexus-text"
        >
          C
        </button>
      </div>
      <div className="grid flex-1 grid-cols-4 gap-2">
        {KEYS.flat().map((k) => (
          <button
            key={k}
            onClick={() => press(k)}
            className={`rounded-lg border border-nexus-border text-sm font-medium transition-colors hover:bg-white/[0.06] ${
              k === "=" ? "bg-white/[0.08] text-nexus-text" : "text-nexus-text"
            }`}
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}

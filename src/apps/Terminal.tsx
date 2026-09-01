import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { APPS } from "../os/appsRegistry";
import { useWindows } from "../os/useWindows";
import { queryNexusAI } from "../lib/nexusBrain";

interface LogItem {
  type: "input" | "output" | "system" | "error";
  text: string;
}

export default function Terminal() {
  const openApp = useWindows((s) => s.openApp);
  const [input, setInput] = useState("");
  const [logs, setLogs] = useState<LogItem[]>([
    { type: "system", text: "NEXUS PRO OS - Kernel Terminal v3.6.0 [TTY 1]" },
    { type: "system", text: "Taper 'help' pour afficher la liste des commandes disponibles." },
  ]);
  const [theme, setTheme] = useState<"matrix" | "cyan" | "amber" | "violet">("cyan");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const themes = {
    cyan: "bg-slate-950 text-cyan-400 border-cyan-500/30",
    matrix: "bg-black text-emerald-400 border-emerald-500/30",
    amber: "bg-stone-950 text-amber-400 border-amber-500/30",
    violet: "bg-slate-950 text-purple-300 border-purple-500/30",
  };

  async function handleCommand(cmd: string) {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    const newLogs: LogItem[] = [...logs, { type: "input", text: `$ ${trimmed}` }];
    const parts = trimmed.split(" ");
    const mainCmd = parts[0].toLowerCase();
    const args = parts.slice(1).join(" ");

    switch (mainCmd) {
      case "help":
        newLogs.push({
          type: "output",
          text: `Commandes système disponibles:
  • sysinfo      - Afficher les informations du noyau Nexus OS
  • ls           - Lister les applications installées
  • open <id>    - Ouvrir une application (ex: open notes, open weather)
  • ai <texte>   - Interroger l'IA Nexus AI Pro directement
  • thème <nom>  - Changer la couleur (cyan, matrix, amber, violet)
  • matrix       - Activer l'animation Matrix
  • whoami       - Informations utilisateur
  • date         - Date et heure système
  • clear        - Effacer la console`,
        });
        break;

      case "sysinfo":
        newLogs.push({
          type: "output",
          text: `--- NEXUS OS PRO SYSTEM INFO ---
OS: Nexus OS v3.6 (Build 2026-08)
Kernel: Web-Native Client/Server Hybrid Engine
AI Core: Gemini 3.6 Flash / Dual Local Brain Engine
State: 100% Operational & PWA Ready
Uptime: ${Math.floor(performance.now() / 1000)}s`,
        });
        break;

      case "ls":
      case "dir":
        const appList = APPS.filter(a => !a.hidden).map(a => `  [${a.id}] ${a.title}`).join("\n");
        newLogs.push({
          type: "output",
          text: `Applications enregistrées dans Nexus OS :\n${appList}`,
        });
        break;

      case "open":
        if (!args) {
          newLogs.push({ type: "error", text: "Erreur: spécifiez l'ID de l'application (ex: open notes)" });
        } else {
          const target = APPS.find(a => a.id.toLowerCase() === args.toLowerCase() || a.title.toLowerCase().includes(args.toLowerCase()));
          if (target) {
            openApp(target.id, { width: target.width, height: target.height });
            newLogs.push({ type: "output", text: `Ouverture de l'application ${target.title}...` });
          } else {
            newLogs.push({ type: "error", text: `Application '${args}' introuvable. Taper 'ls' pour voir la liste.` });
          }
        }
        break;

      case "ai":
        if (!args) {
          newLogs.push({ type: "error", text: "Erreur: fournissez ta question après 'ai '" });
        } else {
          newLogs.push({ type: "system", text: "Transmission à Nexus AI Pro..." });
          setLogs(newLogs);
          setInput("");
          const reply = await queryNexusAI(args);
          setLogs(prev => [...prev, { type: "output", text: `[Nexus AI] : ${reply}` }]);
          return;
        }
        break;

      case "theme":
        if (["cyan", "matrix", "amber", "violet"].includes(args)) {
          setTheme(args as any);
          newLogs.push({ type: "output", text: `Thème changé en '${args}'.` });
        } else {
          newLogs.push({ type: "error", text: "Thèmes valides : cyan, matrix, amber, violet" });
        }
        break;

      case "whoami":
        newLogs.push({ type: "output", text: "User: Aharon Dray (Administrateur Nexus OS)" });
        break;

      case "date":
        newLogs.push({ type: "output", text: new Date().toLocaleString("fr-FR") });
        break;

      case "clear":
        setLogs([]);
        setInput("");
        return;

      case "matrix":
        newLogs.push({ type: "output", text: "01001110 01000101 01011000 01010101 01010011 00100000 01001111 01010011" });
        newLogs.push({ type: "output", text: "Welcome to the Nexus Matrix Code Engine." });
        break;

      default:
        newLogs.push({ type: "error", text: `Commande inconnue: '${mainCmd}'. Taper 'help' pour la liste.` });
        break;
    }

    setLogs(newLogs);
    setInput("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      handleCommand(input);
    }
  }

  return (
    <div className={`flex h-full flex-col font-mono text-xs p-3 rounded-lg border transition-colors ${themes[theme]}`}>
      <div className="flex items-center justify-between border-b border-current/20 pb-2 mb-2 opacity-80">
        <span className="font-bold tracking-widest uppercase">NEXUS TERMINAL CLI v3.6</span>
        <span>SH / BASH</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        {logs.map((log, i) => (
          <div
            key={i}
            className={`whitespace-pre-wrap leading-relaxed ${
              log.type === "input"
                ? "font-semibold"
                : log.type === "error"
                ? "text-rose-400"
                : log.type === "system"
                ? "opacity-60 italic"
                : "opacity-90"
            }`}
          >
            {log.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="mt-2 flex items-center gap-2 border-t border-current/20 pt-2">
        <span className="font-bold opacity-80">$</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Une commande… (help, ai, sysinfo)"
          className="flex-1 bg-transparent outline-none font-mono text-xs placeholder:opacity-40"
          autoFocus
        />
      </div>
    </div>
  );
}

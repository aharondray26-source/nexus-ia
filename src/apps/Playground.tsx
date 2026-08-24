import { useState, useEffect, useRef } from "react";
import { Play, Code, Eye, RefreshCw, Copy, Check, Sparkles, Monitor, Smartphone, Download, Layers } from "lucide-react";

interface PlaygroundProps {
  initialCode?: string;
}

const SAMPLES = {
  default: `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background-color: #090d16; color: #f8fafc; font-family: system-ui, sans-serif; }
  </style>
</head>
<body class="p-6 flex flex-col items-center justify-center min-h-screen">
  <div class="max-w-md w-full bg-slate-900/90 border border-cyan-500/30 rounded-3xl p-6 shadow-2xl backdrop-blur-xl text-center space-y-4">
    <div class="inline-flex p-3 bg-cyan-500/20 text-cyan-400 rounded-2xl border border-cyan-400/30">
      <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
      </svg>
    </div>
    <h2 class="text-xl font-bold text-white">Composant Interactif Nexus OS</h2>
    <p class="text-xs text-slate-400">Ce code est exécuté en temps réel dans le Bac à Sable haute performance de Nexus OS !</p>
    
    <div class="pt-2">
      <button id="demoBtn" class="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 hover:scale-105 active:scale-95 transition-all">
        Cliquer pour Déclencher
      </button>
    </div>
    <div id="result" class="text-xs text-cyan-300 font-mono hidden pt-2">
      ⚡ Événement déclenché avec succès !
    </div>
  </div>

  <script>
    document.getElementById('demoBtn').addEventListener('click', () => {
      const res = document.getElementById('result');
      res.classList.remove('hidden');
      res.classList.add('animate-bounce');
    });
  </script>
</body>
</html>`,
  game: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; background: #050811; color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; }
    canvas { border: 2px solid #06b6d4; border-radius: 12px; box-shadow: 0 0 20px rgba(6,182,212,0.3); }
  </style>
</head>
<body>
  <h3 style="margin-bottom:10px; color:#38bdf8;">🎮 Mini Jeu Canvas Arcade</h3>
  <canvas id="gameCanvas" width="400" height="300"></canvas>
  <p style="font-size:12px; color:#94a3b8;">Déplacez votre souris sur le canvas pour contrôler la balle !</p>

  <script>
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    let x = canvas.width / 2;
    let y = canvas.height - 30;
    let dx = 3;
    let dy = -3;
    let paddleX = (canvas.width - 75) / 2;

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      paddleX = e.clientX - rect.left - 37.5;
    });

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Balle
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#38bdf8';
      ctx.fill();
      ctx.closePath();

      // Raquette
      ctx.fillStyle = '#818cf8';
      ctx.fillRect(paddleX, canvas.height - 15, 75, 10);

      if (x + dx > canvas.width - 8 || x + dx < 8) dx = -dx;
      if (y + dy < 8) dy = -dy;
      else if (y + dy > canvas.height - 15) {
        if (x > paddleX && x < paddleX + 75) {
          dy = -dy;
        } else {
          x = canvas.width / 2;
          y = canvas.height - 30;
          dy = -3;
        }
      }

      x += dx;
      y += dy;
      requestAnimationFrame(draw);
    }
    draw();
  </script>
</body>
</html>`,
};

export default function Playground({ initialCode }: PlaygroundProps) {
  const [code, setCode] = useState<string>(initialCode || SAMPLES.default);
  const [renderedCode, setRenderedCode] = useState<string>(initialCode || SAMPLES.default);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"split" | "code" | "preview">("split");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Debounce code execution so typing doesn't reload the iframe on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setRenderedCode(code);
      if (iframeRef.current && iframeRef.current.srcdoc !== code) {
        iframeRef.current.srcdoc = code;
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [code]);

  // Listen for external trigger from Nexus Message Renderer or AI Hub
  useEffect(() => {
    const handleTrigger = (e: CustomEvent) => {
      if (e.detail?.code) {
        let codeToSet = e.detail.code;
        // If plain HTML fragment without boiler, wrap nicely with Tailwind CDN
        if (!codeToSet.includes("<html") && !codeToSet.includes("<!DOCTYPE")) {
          codeToSet = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>body { background-color: #090d16; color: white; padding: 1.5rem; font-family: system-ui, sans-serif; }</style>
</head>
<body>
${codeToSet}
</body>
</html>`;
        }
        setCode(codeToSet);
        setRenderedCode(codeToSet);
        if (iframeRef.current) {
          iframeRef.current.srcdoc = codeToSet;
        }
      }
    };

    window.addEventListener("nexus:open-playground" as any, handleTrigger);
    return () => window.removeEventListener("nexus:open-playground" as any, handleTrigger);
  }, []);

  function handleCopy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    const blob = new Blob([code], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nexus-playground-preview.html";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleForceRun() {
    setRenderedCode(code);
    if (iframeRef.current) {
      iframeRef.current.srcdoc = code;
    }
  }

  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-100 rounded-2xl overflow-hidden border border-white/10 select-none">
      {/* Top Header Bar */}
      <div className="p-3 bg-slate-900/90 border-b border-white/10 flex items-center justify-between gap-2 shrink-0 flex-wrap">
        <div className="flex items-center gap-2 text-cyan-400">
          <Sparkles className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider text-white">Bac à Sable & Testeur de Code</span>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setActiveTab("split")}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
              activeTab === "split" ? "bg-cyan-500/30 text-cyan-300 border border-cyan-500/40" : "text-slate-400 hover:text-white"
            }`}
          >
            <Play className="w-3 h-3" />
            <span>Divisé</span>
          </button>
          <button
            onClick={() => setActiveTab("code")}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
              activeTab === "code" ? "bg-cyan-500/30 text-cyan-300 border border-cyan-500/40" : "text-slate-400 hover:text-white"
            }`}
          >
            <Code className="w-3 h-3" />
            <span>Code</span>
          </button>
          <button
            onClick={() => setActiveTab("preview")}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
              activeTab === "preview" ? "bg-cyan-500/30 text-cyan-300 border border-cyan-500/40" : "text-slate-400 hover:text-white"
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>Aperçu</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleForceRun}
            className="flex items-center gap-1 px-3 py-1 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 text-white font-bold text-xs shadow-md transition-all"
            title="Exécuter immédiatement le code"
          >
            <Play className="w-3 h-3 fill-white" />
            <span>Exécuter</span>
          </button>
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-colors text-xs"
            title="Copier le code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleDownload}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-colors text-xs"
            title="Exporter HTML"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 divide-y md:divide-y-0 md:divide-x divide-white/10">
        {/* Code Editor Panel */}
        {(activeTab === "split" || activeTab === "code") && (
          <div className={`flex-1 flex flex-col bg-slate-950 p-3 min-h-0 ${activeTab === "split" ? "md:w-1/2" : "w-full"}`}>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-xs text-slate-400">
              <span className="font-mono text-[11px] text-cyan-400">Éditeur (HTML / CSS / JS / Tailwind)</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setCode(SAMPLES.game);
                    setRenderedCode(SAMPLES.game);
                  }}
                  className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1"
                >
                  <Layers className="w-3 h-3" /> Ex. Jeu 2D
                </button>
                <span className="text-[10px] bg-black/60 px-2 py-0.5 rounded text-slate-400">Direct</span>
              </div>
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Saisissez ou collez votre code HTML/JS/CSS ici..."
              className="flex-1 w-full bg-slate-900/90 text-cyan-100 font-mono text-xs p-3.5 rounded-xl border border-white/10 focus:outline-none focus:border-cyan-400/60 resize-none leading-relaxed [scrollbar-width:thin]"
            />
          </div>
        )}

        {/* Live Preview Panel */}
        {(activeTab === "split" || activeTab === "preview") && (
          <div className={`flex-1 flex flex-col bg-slate-900/50 p-3 min-h-0 ${activeTab === "split" ? "md:w-1/2" : "w-full"}`}>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-emerald-400">Rendu Visuel Actif</span>
                <button
                  onClick={handleForceRun}
                  className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white"
                  title="Rafraîchir"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>

              <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/10">
                <button
                  onClick={() => setPreviewDevice("desktop")}
                  className={`p-1 rounded ${previewDevice === "desktop" ? "bg-white/15 text-white" : "text-slate-400"}`}
                  title="Écran Large"
                >
                  <Monitor className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setPreviewDevice("mobile")}
                  className={`p-1 rounded ${previewDevice === "mobile" ? "bg-white/15 text-white" : "text-slate-400"}`}
                  title="Mobile"
                >
                  <Smartphone className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Render Canvas */}
            <div className="flex-1 bg-black rounded-xl border border-white/10 overflow-hidden flex items-center justify-center p-1 relative">
              <iframe
                ref={iframeRef}
                srcDoc={renderedCode}
                title="Nexus Code Sandbox Preview"
                sandbox="allow-scripts allow-modals allow-forms allow-popups allow-same-origin"
                className={`h-full transition-all duration-300 rounded-lg bg-slate-950 ${
                  previewDevice === "mobile" ? "w-[360px] max-w-full border-x border-white/20 shadow-2xl" : "w-full"
                }`}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

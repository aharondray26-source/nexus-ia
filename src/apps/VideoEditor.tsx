import { useEffect, useRef, useState } from "react";
import { Play, Square, Download, Plus, Film, Music, Sparkles, Filter, Trash2, ArrowUp, ArrowDown, Volume2, Sliders, Layers } from "lucide-react";

// Studio Montage Vidéo Pro : Clips, Filtres, Musique Synthétique, Titres & Multi-Formats

interface Clip {
  id: string;
  kind: "image" | "video" | "demo";
  url?: string;
  name: string;
  duration: number; // secondes affichées
  trimStart: number; // début (vidéo)
  text: string;
  filter: "none" | "cinematic" | "vintage" | "cyberpunk" | "bw" | "sepia";
  el?: HTMLImageElement | HTMLVideoElement;
  natW: number;
  natH: number;
  gradient?: [string, string]; // Pour les démos générées
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function VideoEditor() {
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16" | "1:1">("16:9");
  const [clips, setClips] = useState<Clip[]>([]);
  const [audio, setAudio] = useState<{ url: string; name: string; el: HTMLAudioElement } | null>(null);
  const [useSynthBeat, setUseSynthBeat] = useState(false);
  const [busy, setBusy] = useState<"" | "preview" | "export">("");
  const [currentTime, setCurrentTime] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cancelRef = useRef(false);
  const clipsRef = useRef<Clip[]>([]);
  clipsRef.current = clips;

  const audioCtxRef = useRef<AudioContext | null>(null);
  const destRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const sourcesRef = useRef<Map<HTMLMediaElement, MediaElementAudioSourceNode>>(new Map());

  // Dimensions dynamiques selon le ratio sélectionné
  const CW = aspectRatio === "16:9" ? 640 : aspectRatio === "9:16" ? 360 : 480;
  const CH = aspectRatio === "16:9" ? 360 : aspectRatio === "9:16" ? 640 : 480;

  function audioGraph() {
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new Ctx();
      destRef.current = audioCtxRef.current.createMediaStreamDestination();
    }
    audioCtxRef.current.resume().catch(() => {});
    return { ctx: audioCtxRef.current, dest: destRef.current! };
  }

  function connectAudio(el: HTMLMediaElement) {
    const { ctx, dest } = audioGraph();
    if (!sourcesRef.current.has(el)) {
      try {
        const s = ctx.createMediaElementSource(el);
        s.connect(dest);
        s.connect(ctx.destination);
        sourcesRef.current.set(el, s);
      } catch {
        // Déjà connecté
      }
    }
  }

  // Musique Synthétique Générée (Web Audio API) si pas de fichier audio importé
  function playSynthMusicBeat() {
    const { ctx, dest } = audioGraph();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(110, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(dest);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  }

  useEffect(() => {
    return () => {
      clipsRef.current.forEach((c) => c.url && URL.revokeObjectURL(c.url));
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  // Démo instantanée : crée 3 clips de démonstration magnifiques avec titres
  function loadDemoProject() {
    const demo1: Clip = {
      id: `demo-1-${Date.now()}`,
      kind: "demo",
      name: "Intro Cyber Nexus",
      duration: 3.5,
      trimStart: 0,
      text: "NEXUS OS — TITRE PRO",
      filter: "cyberpunk",
      natW: 640,
      natH: 360,
      gradient: ["#0f172a", "#0284c7"],
    };
    const demo2: Clip = {
      id: `demo-2-${Date.now()}`,
      kind: "demo",
      name: "Séquence Synthwave",
      duration: 4.0,
      trimStart: 0,
      text: "EFFETS & FILTRES EN DIRECT",
      filter: "cinematic",
      natW: 640,
      natH: 360,
      gradient: ["#311042", "#ec4899"],
    };
    const demo3: Clip = {
      id: `demo-3-${Date.now()}`,
      kind: "demo",
      name: "Outro Studio",
      duration: 3.0,
      trimStart: 0,
      text: "EXPORTATION WEBM RAPIDE",
      filter: "none",
      natW: 640,
      natH: 360,
      gradient: ["#064e3b", "#10b981"],
    };
    setClips([demo1, demo2, demo3]);
    setUseSynthBeat(true);
  }

  function addAudio(file: File) {
    if (audio) URL.revokeObjectURL(audio.url);
    const url = URL.createObjectURL(file);
    const el = new Audio(url);
    setAudio({ url, name: file.name, el });
    setUseSynthBeat(false);
  }

  async function addFiles(list: FileList) {
    for (const file of Array.from(list)) {
      try {
        const url = URL.createObjectURL(file);
        const id = `clip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        if (file.type.startsWith("image/")) {
          const img = new Image();
          img.src = url;
          await new Promise((res) => (img.onload = res));
          setClips((prev) => [
            ...prev,
            {
              id, kind: "image", url, name: file.name, duration: 3,
              trimStart: 0, text: "", filter: "none", el: img,
              natW: img.naturalWidth || 640, natH: img.naturalHeight || 360,
            },
          ]);
        } else if (file.type.startsWith("video/")) {
          const v = document.createElement("video");
          v.preload = "metadata";
          v.muted = true;
          v.playsInline = true;
          v.src = url;
          await new Promise((res) => (v.onloadedmetadata = res));
          setClips((prev) => [
            ...prev,
            {
              id, kind: "video", url, name: file.name,
              duration: Math.min(5, v.duration || 5), trimStart: 0, text: "",
              filter: "none", el: v, natW: v.videoWidth || 640, natH: v.videoHeight || 360,
            },
          ]);
        }
      } catch {
        // Ignorer fichier incompatible
      }
    }
  }

  function applyFilter(ctx: CanvasRenderingContext2D, filter: Clip["filter"]) {
    if (filter === "cinematic") ctx.filter = "contrast(125%) saturate(140%) sepia(20%)";
    else if (filter === "vintage") ctx.filter = "sepia(70%) contrast(90%) brightness(110%)";
    else if (filter === "cyberpunk") ctx.filter = "hue-rotate(180deg) saturate(180%) contrast(110%)";
    else if (filter === "bw") ctx.filter = "grayscale(100%) contrast(120%)";
    else if (filter === "sepia") ctx.filter = "sepia(100%)";
    else ctx.filter = "none";
  }

  function drawFrame(ctx: CanvasRenderingContext2D, clip: Clip, frameTime = 0) {
    ctx.save();
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, CW, CH);

    applyFilter(ctx, clip.filter);

    if (clip.kind === "demo") {
      // Génération de fond animé vectoriel
      const grad = ctx.createLinearGradient(0, 0, CW, CH);
      grad.addColorStop(0, clip.gradient?.[0] || "#0f172a");
      grad.addColorStop(1, clip.gradient?.[1] || "#38bdf8");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CW, CH);

      // Particules & Ondulations
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      for (let i = 0; i < 8; i++) {
        const cx = (CW / 8) * i + Math.sin(frameTime + i) * 20;
        const cy = CH / 2 + Math.cos(frameTime + i * 0.5) * 30;
        ctx.beginPath();
        ctx.arc(cx, cy, 30 + i * 5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (clip.el) {
      const scale = Math.min(CW / clip.natW, CH / clip.natH) || 1;
      const w = clip.natW * scale, h = clip.natH * scale;
      try {
        ctx.drawImage(clip.el as CanvasImageSource, (CW - w) / 2, (CH - h) / 2, w, h);
      } catch {
        // Frame non prête
      }
    }

    ctx.restore();

    // Titre / Overlay
    if (clip.text.trim()) {
      ctx.save();
      ctx.font = `700 ${Math.round(CW / 20)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.shadowColor = "rgba(0,0,0,0.9)";
      ctx.shadowBlur = 12;
      ctx.fillStyle = "#ffffff";
      ctx.fillText(clip.text, CW / 2, CH - (CH / 10));
      ctx.restore();
    }
  }

  function updateClip(id: string, patch: Partial<Clip>) {
    setClips((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function removeClip(id: string) {
    setClips((prev) => {
      const target = prev.find((x) => x.id === id);
      if (target?.url) URL.revokeObjectURL(target.url);
      return prev.filter((x) => x.id !== id);
    });
  }

  function moveClip(id: string, dir: -1 | 1) {
    setClips((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  async function runSequence(ctx: CanvasRenderingContext2D) {
    let elapsed = 0;
    for (const clip of clipsRef.current) {
      if (cancelRef.current) return;

      if (clip.kind === "video" && clip.el) {
        const v = clip.el as HTMLVideoElement;
        v.currentTime = clip.trimStart;
        v.muted = false;
        connectAudio(v);
        await v.play().catch(() => {});
        const end = clip.trimStart + clip.duration;

        await new Promise<void>((resolve) => {
          const step = () => {
            if (cancelRef.current || v.currentTime >= end || v.ended) {
              v.pause();
              resolve();
              return;
            }
            drawFrame(ctx, clip, v.currentTime);
            if (useSynthBeat && Math.floor(v.currentTime * 2) % 2 === 0) {
              playSynthMusicBeat();
            }
            requestAnimationFrame(step);
          };
          step();
        });
      } else {
        const fps = 30;
        const totalFrames = Math.floor(clip.duration * fps);
        for (let frame = 0; frame < totalFrames; frame++) {
          if (cancelRef.current) return;
          drawFrame(ctx, clip, frame / fps);
          if (useSynthBeat && frame % 15 === 0) playSynthMusicBeat();
          elapsed += 1 / fps;
          setCurrentTime(elapsed);
          await sleep(1000 / fps);
        }
      }
    }
  }

  async function preview() {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || clips.length === 0) return;
    cancelRef.current = false;
    setBusy("preview");
    if (audio) {
      connectAudio(audio.el);
      audio.el.currentTime = 0;
      audio.el.play().catch(() => {});
    }
    await runSequence(ctx);
    if (audio) audio.el.pause();
    setBusy("");
  }

  async function exportVideo() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || clips.length === 0) return;

    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";
    cancelRef.current = false;
    setBusy("export");

    const stream = canvas.captureStream(30);
    const { dest } = audioGraph();
    const track = dest.stream.getAudioTracks()[0];
    if (track) stream.addTrack(track);

    if (audio) {
      connectAudio(audio.el);
      audio.el.currentTime = 0;
      await audio.el.play().catch(() => {});
    }

    const chunks: BlobPart[] = [];
    const rec = new MediaRecorder(stream, { mimeType: mime });
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const done = new Promise<void>((resolve) => (rec.onstop = () => resolve()));

    rec.start();
    await runSequence(ctx);
    if (audio) audio.el.pause();
    rec.stop();
    await done;

    const blob = new Blob(chunks, { type: "video/webm" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `nexus-montage-${aspectRatio.replace(":", "x")}.webm`;
    a.click();
    URL.revokeObjectURL(a.href);
    setBusy("");
  }

  function stop() {
    cancelRef.current = true;
  }

  const totalDuration = clips.reduce((s, c) => s + c.duration, 0);

  return (
    <div className="flex h-full flex-col gap-3 p-1 font-sans text-xs text-slate-100 select-none">
      {/* Dynamic Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-900/80 p-2 border border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <label className="cursor-pointer flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 font-semibold text-cyan-300 hover:bg-cyan-500/20 transition-all">
            <Plus className="w-4 h-4" />
            <span>Médias</span>
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && addFiles(e.target.files)}
            />
          </label>

          <button
            onClick={loadDemoProject}
            className="flex items-center gap-1.5 rounded-lg border border-purple-500/40 bg-purple-500/10 px-3 py-1.5 font-semibold text-purple-300 hover:bg-purple-500/20 transition-all"
            title="Charger un projet complet de démonstration"
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>Démo Pro</span>
          </button>
        </div>

        {/* Aspect Ratio Switcher */}
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/10">
          {(["16:9", "9:16", "1:1"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setAspectRatio(r)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                aspectRatio === r ? "bg-cyan-500 text-slate-950 shadow-sm" : "text-slate-400 hover:text-white"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Controls & Export */}
        <div className="flex items-center gap-2">
          {busy ? (
            <button
              onClick={stop}
              className="flex items-center gap-1 rounded-lg border border-red-500/50 bg-red-500/20 px-3 py-1.5 font-bold text-red-300 hover:bg-red-500/30"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stopper</span>
            </button>
          ) : (
            <>
              <button
                onClick={preview}
                disabled={clips.length === 0}
                className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 font-bold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-40"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Aperçu</span>
              </button>
              <button
                onClick={exportVideo}
                disabled={clips.length === 0}
                className="flex items-center gap-1.5 rounded-lg border border-cyan-400 bg-cyan-500 text-slate-950 font-extrabold px-3 py-1.5 hover:bg-cyan-400 disabled:opacity-40"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exporter</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Preview Screen */}
      <div className="relative flex-1 min-h-[200px] flex items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-slate-950/90 shadow-2xl">
        <canvas
          ref={canvasRef}
          width={CW}
          height={CH}
          className="max-h-full max-w-full rounded object-contain shadow-cyan-500/10 shadow-lg"
        />

        {clips.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center p-4 bg-slate-950/80">
            <Film className="w-10 h-10 text-cyan-400/50 animate-bounce" />
            <p className="font-semibold text-slate-300">Aucun clip dans le montage</p>
            <p className="text-[11px] text-slate-500 max-w-xs">
              Glissez des images, vidéos, ou cliquez sur <span className="text-purple-300 font-bold">Démo Pro</span> pour démarrer immédiatement.
            </p>
          </div>
        )}
      </div>

      {/* Audio Track Selector */}
      <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-900/60 p-2 border border-white/5 text-[11px]">
        <div className="flex items-center gap-2">
          <Music className="w-4 h-4 text-purple-400" />
          <span className="font-semibold text-slate-300">Piste Audio :</span>
          {audio ? (
            <span className="flex items-center gap-2 bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30">
              <span className="truncate max-w-[150px]">{audio.name}</span>
              <button onClick={() => setAudio(null)} className="hover:text-red-400">✕</button>
            </span>
          ) : (
            <label className="cursor-pointer text-cyan-400 hover:underline">
              + Importer Fichier Audio
              <input type="file" accept="audio/*" className="hidden" onChange={(e) => e.target.files?.[0] && addAudio(e.target.files[0])} />
            </label>
          )}
        </div>

        <label className="flex items-center gap-1.5 cursor-pointer text-slate-400 hover:text-white">
          <input type="checkbox" checked={useSynthBeat} onChange={(e) => setUseSynthBeat(e.target.checked)} className="rounded accent-cyan-400" />
          <span>Synth Beat Intégré (Web Audio)</span>
        </label>
      </div>

      {/* Timeline Clips Track List */}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto max-h-[220px] pr-1">
        {clips.map((clip, idx) => (
          <div
            key={clip.id}
            className="flex items-center gap-2 rounded-xl bg-slate-900/90 border border-white/10 p-2.5 transition-all hover:border-cyan-500/40"
          >
            {/* Order Controls */}
            <div className="flex flex-col gap-1">
              <button
                onClick={() => moveClip(clip.id, -1)}
                disabled={idx === 0}
                className="text-slate-400 hover:text-cyan-300 disabled:opacity-20"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => moveClip(clip.id, 1)}
                disabled={idx === clips.length - 1}
                className="text-slate-400 hover:text-cyan-300 disabled:opacity-20"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Badge */}
            <span className="flex h-9 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-mono font-bold text-cyan-300">
              #{idx + 1}
            </span>

            {/* Title & Trim Controls */}
            <div className="flex flex-1 flex-col gap-1.5 min-w-0">
              <input
                value={clip.text}
                onChange={(e) => updateClip(clip.id, { text: e.target.value })}
                placeholder="Titre ou sous-titre à afficher sur le clip..."
                className="w-full rounded-lg bg-black/40 border border-white/10 px-2.5 py-1 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400"
              />

              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                <span className="truncate max-w-[120px] font-medium text-slate-300">{clip.name}</span>

                {/* Filter Selector */}
                <div className="flex items-center gap-1">
                  <Filter className="w-3 h-3 text-cyan-400" />
                  <select
                    value={clip.filter}
                    onChange={(e) => updateClip(clip.id, { filter: e.target.value as any })}
                    className="bg-black/60 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-cyan-200 outline-none"
                  >
                    <option value="none">Normal</option>
                    <option value="cinematic">Cinématique</option>
                    <option value="vintage">Vintage</option>
                    <option value="cyberpunk">Cyberpunk</option>
                    <option value="bw">Noir & Blanc</option>
                    <option value="sepia">Sépia</option>
                  </select>
                </div>

                {/* Duration */}
                <label className="flex items-center gap-1">
                  Durée :
                  <input
                    type="number"
                    min={0.5}
                    step={0.5}
                    value={clip.duration}
                    onChange={(e) => updateClip(clip.id, { duration: Math.max(0.5, Number(e.target.value)) })}
                    className="w-12 rounded bg-black/60 border border-white/10 px-1 py-0.5 text-center text-cyan-300 font-mono text-[11px]"
                  />
                  s
                </label>
              </div>
            </div>

            {/* Remove */}
            <button
              onClick={() => removeClip(clip.id)}
              className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
              title="Supprimer ce clip"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

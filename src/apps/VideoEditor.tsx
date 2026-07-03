import { useEffect, useRef, useState } from "react";

// Editeur video "leger" mais reel : on importe des clips (images/videos), on les
// ordonne, on les decoupe, on ajoute du texte, on previsualise, et on exporte
// une vraie video .webm. Tout se passe dans le navigateur, sans rien envoyer.
// (v1 : sans mixage audio — ce sera la prochaine etape.)

const CW = 640;
const CH = 360;

interface Clip {
  id: string;
  kind: "image" | "video";
  url: string;
  name: string;
  duration: number; // secondes affichees
  trimStart: number; // debut (video)
  text: string;
  el: HTMLImageElement | HTMLVideoElement;
  natW: number;
  natH: number;
}

function loadClip(file: File): Promise<Clip> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const id = `clip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    if (file.type.startsWith("image/")) {
      const img = new Image();
      img.onload = () =>
        resolve({
          id, kind: "image", url, name: file.name, duration: 3,
          trimStart: 0, text: "", el: img, natW: img.naturalWidth, natH: img.naturalHeight,
        });
      img.onerror = reject;
      img.src = url;
    } else if (file.type.startsWith("video/")) {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.muted = true;
      v.playsInline = true;
      v.onloadedmetadata = () =>
        resolve({
          id, kind: "video", url, name: file.name,
          duration: Math.min(5, v.duration || 5), trimStart: 0, text: "",
          el: v, natW: v.videoWidth, natH: v.videoHeight,
        });
      v.onerror = reject;
      v.src = url;
    } else {
      reject(new Error("type non supporte"));
    }
  });
}

// Dessine un media en "contain" (fond noir, ratio conserve) + texte eventuel.
function drawFrame(ctx: CanvasRenderingContext2D, clip: Clip) {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, CW, CH);
  const scale = Math.min(CW / clip.natW, CH / clip.natH) || 1;
  const w = clip.natW * scale, h = clip.natH * scale;
  try {
    ctx.drawImage(clip.el as CanvasImageSource, (CW - w) / 2, (CH - h) / 2, w, h);
  } catch {
    // Frame video pas encore prete : on ignore.
  }
  if (clip.text.trim()) {
    ctx.font = "600 30px -apple-system, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 8;
    ctx.fillStyle = "#fff";
    ctx.fillText(clip.text, CW / 2, CH - 28);
    ctx.shadowBlur = 0;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function VideoEditor() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [audio, setAudio] = useState<{ url: string; name: string; el: HTMLAudioElement } | null>(null);
  const [busy, setBusy] = useState<"" | "preview" | "export">("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cancelRef = useRef(false);
  const clipsRef = useRef<Clip[]>([]);
  clipsRef.current = clips;

  // Moteur audio : route le son des videos (et de la musique de fond) a la fois
  // vers les enceintes (apercu) et vers l'enregistrement (export).
  const audioCtxRef = useRef<AudioContext | null>(null);
  const destRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const sourcesRef = useRef<Map<HTMLMediaElement, MediaElementAudioSourceNode>>(
    new Map()
  );

  function audioGraph() {
    if (!audioCtxRef.current) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
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
        // Deja connecte : rien a faire.
      }
    }
  }

  useEffect(() => {
    // Libere les URLs et ferme le moteur audio quand on ferme l'editeur.
    return () => {
      clipsRef.current.forEach((c) => URL.revokeObjectURL(c.url));
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  function addAudio(file: File) {
    if (audio) URL.revokeObjectURL(audio.url);
    const url = URL.createObjectURL(file);
    const el = new Audio(url);
    el.loop = false;
    setAudio({ url, name: file.name, el });
  }

  async function addFiles(list: FileList) {
    for (const f of Array.from(list)) {
      try {
        const clip = await loadClip(f);
        setClips((prev) => [...prev, clip]);
      } catch {
        // Fichier illisible : ignore.
      }
    }
  }

  function update(id: string, patch: Partial<Clip>) {
    setClips((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }
  function remove(id: string) {
    setClips((prev) => {
      const c = prev.find((x) => x.id === id);
      if (c) URL.revokeObjectURL(c.url);
      return prev.filter((x) => x.id !== id);
    });
  }
  function move(id: string, dir: -1 | 1) {
    setClips((prev) => {
      const i = prev.findIndex((c) => c.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  // Joue toute la sequence sur le canvas (utilise pour l'apercu ET l'export).
  async function runSequence(ctx: CanvasRenderingContext2D) {
    for (const clip of clipsRef.current) {
      if (cancelRef.current) return;
      if (clip.kind === "image") {
        drawFrame(ctx, clip);
        await sleep(clip.duration * 1000);
      } else {
        const v = clip.el as HTMLVideoElement;
        v.currentTime = clip.trimStart;
        v.muted = false; // on garde le son d'origine de la video
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
            drawFrame(ctx, clip);
            requestAnimationFrame(step);
          };
          step();
        });
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
    const type = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";
    cancelRef.current = false;
    setBusy("export");
    const stream = canvas.captureStream(30);
    // Piste audio combinee (son des videos + musique de fond) via le moteur audio.
    const { dest } = audioGraph();
    const track = dest.stream.getAudioTracks()[0];
    if (track) stream.addTrack(track);
    if (audio) {
      connectAudio(audio.el);
      audio.el.currentTime = 0;
      await audio.el.play().catch(() => {});
    }
    const chunks: BlobPart[] = [];
    const rec = new MediaRecorder(stream, { mimeType: type });
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
    a.download = "montage-nexus.webm";
    a.click();
    URL.revokeObjectURL(a.href);
    setBusy("");
  }

  function stop() {
    cancelRef.current = true;
  }

  const totalDuration = clips.reduce((s, c) => s + c.duration, 0);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="overflow-hidden rounded-lg border border-nexus-border bg-black">
        <canvas
          ref={canvasRef}
          width={CW}
          height={CH}
          className="aspect-video w-full"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="cursor-pointer rounded-lg border border-nexus-border bg-white/[0.04] px-3 py-1.5 text-xs text-nexus-text transition-colors hover:bg-white/[0.08]">
          + Importer
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />
        </label>
        {busy ? (
          <button
            onClick={stop}
            className="rounded-lg border border-nexus-border px-3 py-1.5 text-xs text-nexus-muted transition-colors hover:text-red-400"
          >
            Arreter
          </button>
        ) : (
          <>
            <button
              onClick={preview}
              disabled={clips.length === 0}
              className="rounded-lg border border-nexus-border px-3 py-1.5 text-xs text-nexus-text transition-colors hover:bg-white/[0.06] disabled:opacity-40"
            >
              ▶ Apercu
            </button>
            <button
              onClick={exportVideo}
              disabled={clips.length === 0}
              className="rounded-lg border px-3 py-1.5 text-xs disabled:opacity-40"
              style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
            >
              Exporter la video
            </button>
          </>
        )}
        <span className="ml-auto text-[11px] text-nexus-muted">
          {clips.length} clip{clips.length > 1 ? "s" : ""} · {totalDuration.toFixed(1)}s
        </span>
      </div>

      {/* Piste audio de fond : superposee aux images/videos. */}
      <div className="flex items-center gap-2 text-[11px] text-nexus-muted">
        <label className="cursor-pointer rounded-md border border-nexus-border px-2.5 py-1 text-nexus-text transition-colors hover:bg-white/[0.06]">
          ♪ Audio de fond
          <input
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && addAudio(e.target.files[0])}
          />
        </label>
        {audio ? (
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-nexus-text">{audio.name}</span>
            <button
              onClick={() => {
                URL.revokeObjectURL(audio.url);
                setAudio(null);
              }}
              className="shrink-0 transition-colors hover:text-red-400"
              aria-label="Retirer l'audio"
            >
              ✕
            </button>
          </span>
        ) : (
          <span className="text-nexus-muted/60">aucune musique</span>
        )}
      </div>

      <ul className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {clips.map((c, i) => (
          <li
            key={c.id}
            className="flex items-center gap-2 rounded-lg border border-nexus-border bg-nexus-bg px-2.5 py-2"
          >
            <div className="flex flex-col">
              <button
                onClick={() => move(c.id, -1)}
                disabled={i === 0}
                className="text-[10px] text-nexus-muted disabled:opacity-30"
                aria-label="Monter"
              >
                ▲
              </button>
              <button
                onClick={() => move(c.id, 1)}
                disabled={i === clips.length - 1}
                className="text-[10px] text-nexus-muted disabled:opacity-30"
                aria-label="Descendre"
              >
                ▼
              </button>
            </div>
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-nexus-border text-[9px] font-semibold"
              style={{ color: c.kind === "video" ? "#f472b6" : "#38bdf8" }}
            >
              {c.kind === "video" ? "VID" : "IMG"}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <input
                value={c.text}
                onChange={(e) => update(c.id, { text: e.target.value })}
                placeholder="Texte a afficher (option)"
                className="w-full rounded border border-nexus-border bg-nexus-panel px-2 py-1 text-[11px] text-nexus-text outline-none focus:border-white/30"
              />
              <div className="flex items-center gap-2 text-[10px] text-nexus-muted">
                <span className="truncate">{c.name}</span>
                <label className="ml-auto flex items-center gap-1">
                  duree
                  <input
                    type="number"
                    min={0.5}
                    step={0.5}
                    value={c.duration}
                    onChange={(e) =>
                      update(c.id, { duration: Math.max(0.5, Number(e.target.value)) })
                    }
                    className="w-12 rounded border border-nexus-border bg-nexus-panel px-1 py-0.5 text-center text-nexus-text outline-none"
                  />
                  s
                </label>
                {c.kind === "video" && (
                  <label className="flex items-center gap-1">
                    debut
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={c.trimStart}
                      onChange={(e) =>
                        update(c.id, { trimStart: Math.max(0, Number(e.target.value)) })
                      }
                      className="w-12 rounded border border-nexus-border bg-nexus-panel px-1 py-0.5 text-center text-nexus-text outline-none"
                    />
                    s
                  </label>
                )}
              </div>
            </div>
            <button
              onClick={() => remove(c.id)}
              aria-label={`Supprimer ${c.name}`}
              className="text-nexus-muted transition-colors hover:text-red-400"
            >
              ✕
            </button>
          </li>
        ))}
        {clips.length === 0 && (
          <li className="flex flex-1 items-center justify-center text-center text-[11px] text-nexus-muted/70">
            Importe des images ou des videos pour commencer ton montage.
          </li>
        )}
      </ul>
    </div>
  );
}

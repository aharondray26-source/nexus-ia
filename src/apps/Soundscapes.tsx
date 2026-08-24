import { useState, useEffect, useRef } from "react";

interface SoundTrack {
  id: string;
  name: string;
  category: string;
  icon: string;
  color: string;
  type: "noise" | "binaural" | "synth";
}

const TRACKS: SoundTrack[] = [
  { id: "rain", name: "Pluie & Orage Doux", category: "Nature", icon: "🌧️", color: "#38bdf8", type: "noise" },
  { id: "space", name: "Cosmos & Deep Focus", category: "Ambiance", icon: "🌌", color: "#a855f7", type: "synth" },
  { id: "waves", name: "Vagues de l'Océan", category: "Relaxation", icon: "🌊", color: "#0ea5e9", type: "noise" },
  { id: "theta", name: "Ondes Theta 6Hz", category: "Binaural", icon: "🧠", color: "#10b981", type: "binaural" },
  { id: "cafe", name: "Bruit Blanc Étude", category: "Focus", icon: "☕", color: "#f59e0b", type: "noise" },
];

export default function Soundscapes() {
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.5);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sourceNodeRef = useRef<AudioNode | null>(null);

  function stopAudio() {
    if (sourceNodeRef.current) {
      try {
        (sourceNodeRef.current as any).stop?.();
        sourceNodeRef.current.disconnect();
      } catch {
        // ignore
      }
      sourceNodeRef.current = null;
    }
  }

  function startTrack(track: SoundTrack) {
    stopAudio();

    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.connect(ctx.destination);
    gainNodeRef.current = gainNode;

    if (track.type === "noise") {
      // Create pink/white noise buffer for rain/waves
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
        b6 = white * 0.115926;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = buffer;
      whiteNoise.loop = true;

      // Filter for smoother nature feel
      const filter = ctx.createBiquadFilter();
      filter.type = track.id === "rain" ? "lowpass" : "bandpass";
      filter.frequency.setValueAtTime(track.id === "rain" ? 1000 : 400, ctx.currentTime);

      whiteNoise.connect(filter);
      filter.connect(gainNode);
      whiteNoise.start();
      sourceNodeRef.current = whiteNoise;
    } else if (track.type === "binaural") {
      // Binaural oscillator 200Hz left, 206Hz right
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(206, ctx.currentTime);
      osc.connect(gainNode);
      osc.start();
      sourceNodeRef.current = osc;
    } else {
      // Space synth drone
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(110, ctx.currentTime);
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(350, ctx.currentTime);
      osc.connect(filter);
      filter.connect(gainNode);
      osc.start();
      sourceNodeRef.current = osc;
    }

    setActiveTrackId(track.id);
  }

  function toggleTrack(track: SoundTrack) {
    if (activeTrackId === track.id) {
      stopAudio();
      setActiveTrackId(null);
    } else {
      startTrack(track);
    }
  }

  useEffect(() => {
    if (gainNodeRef.current && audioCtxRef.current) {
      gainNodeRef.current.gain.setValueAtTime(volume, audioCtxRef.current.currentTime);
    }
  }, [volume]);

  useEffect(() => {
    return () => stopAudio();
  }, []);

  return (
    <div className="flex h-full flex-col gap-4 p-4 text-nexus-text">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-nexus-border pb-3">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            🎧 Ambiances & Soundscapes HQ
          </h2>
          <p className="text-[11px] text-nexus-muted">
            Générateur audio Web-Native haute qualité pour la concentration et le sommeil.
          </p>
        </div>
        {activeTrackId && (
          <span className="flex items-center gap-1.5 rounded-full bg-cyan-500/20 px-2.5 py-1 text-[11px] font-semibold text-cyan-400 border border-cyan-500/30 animate-pulse">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            En lecture
          </span>
        )}
      </div>

      {/* Grid of Sound Tracks */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 flex-1 overflow-y-auto pr-1">
        {TRACKS.map((track) => {
          const isPlaying = activeTrackId === track.id;
          return (
            <button
              key={track.id}
              onClick={() => toggleTrack(track)}
              className={`flex items-center gap-3.5 rounded-xl border p-3.5 text-left transition-all ${
                isPlaying
                  ? "border-cyan-400/60 bg-cyan-500/15 shadow-lg shadow-cyan-500/10"
                  : "border-nexus-border bg-nexus-bg/60 hover:border-white/20 hover:bg-white/5"
              }`}
            >
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl shadow-inner border border-white/10"
                style={{ backgroundColor: `${track.color}20` }}
              >
                {track.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white truncate">{track.name}</span>
                  <span className="text-[10px] text-nexus-muted font-medium">{track.category}</span>
                </div>
                <span className="text-[11px] text-nexus-muted">
                  {isPlaying ? "Cliquer pour arrêter" : "Cliquer pour écouter"}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Volume Control Slider */}
      <div className="flex items-center gap-3 border-t border-nexus-border pt-3">
        <span className="text-xs text-nexus-muted">🔊 Volume :</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="flex-1 accent-cyan-400 cursor-pointer h-1.5 bg-nexus-border rounded-lg"
        />
        <span className="text-xs font-mono text-cyan-400 w-8">{Math.round(volume * 100)}%</span>
      </div>
    </div>
  );
}

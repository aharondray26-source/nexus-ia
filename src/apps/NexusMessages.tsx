import { useEffect, useRef, useState, type FormEvent } from "react";
import { Send, Phone, PhoneOff, Video, Users, Copy, Check } from "lucide-react";
import { watchNexusUser, type NexusUser } from "../lib/nexusAccount";
import { watchMessages, sendMessage, joinRoom, type ChatMessage, type Member } from "../lib/nexusRoom";
import { startCall, joinCall, type CallHandles } from "../lib/nexusCall";

// Salon Nexus : vrai chat en direct + vrais appels audio/video, entre comptes Nexus.
// Pas besoin de Google : chacun cree son compte avec son e-mail et rejoint le salon.
export default function NexusMessages() {
  const [me, setMe] = useState<NexusUser | null>(null);
  const [room, setRoom] = useState(() => localStorage.getItem("nexus.room") || "general");
  const [roomInput, setRoomInput] = useState(room);
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [call, setCall] = useState<CallHandles | null>(null);
  const [callState, setCallState] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);
  const remoteAudio = useRef<HTMLAudioElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const [withVideo, setWithVideo] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => watchNexusUser(setMe), []);

  useEffect(() => {
    if (!me) return;
    localStorage.setItem("nexus.room", room);
    const un1 = watchMessages(room, setMsgs, setError);
    const un2 = joinRoom(room, setMembers, setError);
    return () => { un1(); un2(); };
  }, [me, room]);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  function attachRemote(stream: MediaStream) {
    if (remoteAudio.current) remoteAudio.current.srcObject = stream;
    if (remoteVideo.current) remoteVideo.current.srcObject = stream;
  }

  async function onSend(e: FormEvent) {
    e.preventDefault();
    const t = text;
    setText("");
    try { await sendMessage(room, t); }
    catch (err: any) { setError(err?.message || "Envoi impossible."); setText(t); }
  }

  async function onStartCall(video: boolean) {
    setError(null); setWithVideo(video);
    try {
      const h = await startCall(video, attachRemote, setCallState);
      setCall(h);
      await sendMessage(room, `Appel ${video ? "video" : "audio"} lance. Code : ${h.callId}`);
    } catch (err: any) { setError(err?.message || "Appel impossible."); }
  }

  async function onJoinCall() {
    setError(null);
    try {
      const h = await joinCall(joinCode, withVideo, attachRemote, setCallState);
      setCall(h); setJoinCode("");
    } catch (err: any) { setError(err?.message || "Impossible de rejoindre."); }
  }

  async function onHangUp() {
    await call?.hangUp();
    setCall(null); setCallState("");
  }

  if (!me) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
        <Users size={26} className="text-nexus-muted" />
        <p className="text-sm text-nexus-text">Connecte-toi a ton compte Nexus</p>
        <p className="max-w-xs text-[11px] leading-relaxed text-nexus-muted">
          Clique sur « Compte » en haut a droite. Ton ami fait pareil de son cote,
          vous rejoignez le meme salon, et vous pouvez discuter et vous appeler.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-2.5">
      {/* Salon + personnes presentes */}
      <div className="flex items-center gap-2">
        <form
          onSubmit={(e) => { e.preventDefault(); setRoom(roomInput.trim() || "general"); }}
          className="flex flex-1 items-center gap-1.5"
        >
          <span className="text-[11px] text-nexus-muted">Salon</span>
          <input
            value={roomInput}
            onChange={(e) => setRoomInput(e.target.value)}
            placeholder="ma-classe"
            className="min-w-0 flex-1 rounded-lg border border-nexus-border bg-nexus-bg px-2.5 py-1 text-xs text-nexus-text outline-none focus:border-white/30"
          />
          <button type="submit" className="rounded-lg border border-nexus-border px-2.5 py-1 text-[11px] text-nexus-muted hover:text-nexus-text">
            Rejoindre
          </button>
        </form>
        <span className="flex shrink-0 items-center gap-1 text-[11px] text-nexus-muted" title={members.map((m) => m.name).join(", ")}>
          <Users size={12} /> {members.length}
        </span>
      </div>

      {/* Appel en cours */}
      {call ? (
        <div className="rounded-xl border p-2.5" style={{ borderColor: "var(--accent)" }}>
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[11px] text-nexus-text">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: "var(--accent)" }} />
              {callState === "connected" ? "En communication" : "Connexion..."}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="rounded-md border border-nexus-border px-2 py-0.5 font-mono text-xs tracking-widest text-nexus-text">
                {call.callId}
              </span>
              <button
                onClick={() => { navigator.clipboard.writeText(call.callId); setCopied(true); setTimeout(() => setCopied(false), 1400); }}
                title="Copier le code"
                className="rounded-md border border-nexus-border p-1 text-nexus-muted hover:text-nexus-text"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
              </button>
              <button onClick={onHangUp} title="Raccrocher" className="rounded-md border border-red-500/40 p-1 text-red-400 hover:bg-red-500/10">
                <PhoneOff size={12} />
              </button>
            </span>
          </div>
          {withVideo && <video ref={remoteVideo} autoPlay playsInline className="mt-2 w-full rounded-lg bg-black" />}
          <p className="mt-1.5 text-[10px] text-nexus-muted">
            Donne ce code a ton ami : il le colle ci-dessous pour te rejoindre.
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <button onClick={() => onStartCall(false)} className="flex items-center gap-1.5 rounded-lg border border-nexus-border px-2.5 py-1 text-[11px] text-nexus-text hover:bg-white/[0.06]">
            <Phone size={12} /> Appel audio
          </button>
          <button onClick={() => onStartCall(true)} className="flex items-center gap-1.5 rounded-lg border border-nexus-border px-2.5 py-1 text-[11px] text-nexus-text hover:bg-white/[0.06]">
            <Video size={12} /> Video
          </button>
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="Code recu"
            className="w-24 rounded-lg border border-nexus-border bg-nexus-bg px-2 py-1 text-center font-mono text-xs tracking-widest text-nexus-text outline-none focus:border-white/30"
          />
          <button onClick={onJoinCall} disabled={!joinCode.trim()} className="rounded-lg border px-2.5 py-1 text-[11px] disabled:opacity-40" style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>
            Rejoindre
          </button>
        </div>
      )}
      <audio ref={remoteAudio} autoPlay />

      {error && (
        <p className="rounded-lg bg-red-500/10 px-2.5 py-1.5 text-[11px] leading-relaxed text-red-300">{error}</p>
      )}

      {/* Messages */}
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto rounded-xl border border-nexus-border bg-nexus-bg/40 p-2.5">
        {msgs.length === 0 && (
          <p className="m-auto text-center text-[11px] text-nexus-muted/70">
            Aucun message. Ecris le premier !
          </p>
        )}
        {msgs.map((m) => {
          const mine = m.uid === me.uid;
          return (
            <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
              {!mine && <span className="px-1 text-[10px] text-nexus-muted">{m.author}</span>}
              <span
                className="max-w-[80%] break-words rounded-2xl px-3 py-1.5 text-xs"
                style={
                  mine
                    ? { backgroundColor: "color-mix(in srgb, var(--accent) 26%, transparent)", color: "var(--nexus-text)" }
                    : { backgroundColor: "rgba(255,255,255,0.06)", color: "var(--nexus-text)" }
                }
              >
                {m.text}
              </span>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>

      <form onSubmit={onSend} className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ecris un message..."
          className="min-w-0 flex-1 rounded-lg border border-nexus-border bg-nexus-bg px-3 py-2 text-xs text-nexus-text outline-none focus:border-white/30"
        />
        <button type="submit" disabled={!text.trim()} className="rounded-lg border px-3 py-2 disabled:opacity-40" style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}

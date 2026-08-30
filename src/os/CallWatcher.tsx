import { useEffect, useState } from "react";
import { Phone, PhoneOff, Video } from "lucide-react";
import { watchIncomingCalls, answerCall, declineCall, type IncomingCall, type CallHandles } from "../lib/nexusCall";
import { watchNexusUser } from "../lib/nexusAccount";
import { showIncomingCall, startRinging, stopRinging, notifyReady, askNotifyPermission } from "../lib/nexusNotify";

/* Surveillance GLOBALE des appels : elle tourne partout dans Nexus, meme si
   la messagerie n'est pas ouverte. Tu es prevenu par une notification systeme,
   une sonnerie, et une banniere par-dessus l'interface. */
export default function CallWatcher() {
  const [connected, setConnected] = useState(false);
  const [call, setCall] = useState<IncomingCall | null>(null);
  const [active, setActive] = useState<CallHandles | null>(null);
  const [state, setState] = useState("");

  useEffect(() => watchNexusUser((u) => setConnected(!!u)), []);
  useEffect(() => { if (connected) askNotifyPermission(); }, [connected]);

  useEffect(() => {
    if (!connected) return;
    return watchIncomingCalls((c) => {
      setCall(c);
      if (c) {
        startRinging();
        if (notifyReady()) showIncomingCall(c.from, c.video);
      } else {
        stopRinging();
      }
    });
  }, [connected]);

  async function repondre() {
    if (!call) return;
    stopRinging();
    try {
      const h = await answerCall(call.id, call.video, (s) => {
        const el = document.getElementById("nx-remote-audio") as HTMLAudioElement | null;
        if (el) el.srcObject = s;
      }, setState);
      setActive(h);
      setCall(null);
    } catch { /* affiche dans la messagerie */ }
  }
  async function raccrocher() {
    await active?.hangUp();
    setActive(null); setState("");
  }

  if (!call && !active) return <audio id="nx-remote-audio" autoPlay />;

  return (
    <>
      <audio id="nx-remote-audio" autoPlay />
      <div className="nexus-fade-in fixed left-1/2 top-14 z-[1000030] w-[min(420px,calc(100vw-24px))] -translate-x-1/2">
        <div className="nx-widget flex-row items-center gap-3 !p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: "color-mix(in srgb, var(--accent) 24%, transparent)", color: "var(--accent)" }}>
            {call?.video ? <Video size={16} /> : <Phone size={16} />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-nexus-text">
              {active ? (state === "connected" ? "En communication" : "Connexion…") : `${call?.from.split("@")[0]} t'appelle`}
            </div>
            <div className="truncate text-[11px] text-nexus-muted">
              {active ? "Appel Nexus en cours" : call?.video ? "Appel vidéo" : "Appel audio"}
            </div>
          </div>
          {active ? (
            <button onClick={raccrocher} className="nx-btn nx-btn-danger shrink-0">
              <PhoneOff size={14} /> Raccrocher
            </button>
          ) : (
            <>
              <button onClick={repondre} className="nx-btn nx-btn-primary shrink-0">Répondre</button>
              <button onClick={() => { stopRinging(); if (call) declineCall(call.id); setCall(null); }}
                className="nx-btn nx-btn-danger shrink-0">Refuser</button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

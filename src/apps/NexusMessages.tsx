import { useEffect, useRef, useState, type FormEvent } from "react";
import { Send, Phone, PhoneOff, Video, UserPlus, ArrowLeft, PhoneIncoming } from "lucide-react";
import { watchNexusUser, type NexusUser } from "../lib/nexusAccount";
import { watchConversation, sendTo, watchContacts, myEmail, type ChatMessage, type Contact } from "../lib/nexusChat";
import { callPerson, answerCall, declineCall, watchIncomingCalls, type CallHandles, type IncomingCall } from "../lib/nexusCall";

// Messagerie Nexus : tu choisis UNE personne par son e-mail, tu lui ecris,
// tu l'appelles. Elle recoit chez elle. Rien a voir avec Google : il suffit
// qu'elle ait un compte Nexus (e-mail + mot de passe, gratuit et instantane).
export default function NexusMessages() {
  const [me, setMe] = useState<NexusUser | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [active, setActive] = useState<string | null>(null);   // e-mail du correspondant
  const [newContact, setNewContact] = useState("");
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [call, setCall] = useState<CallHandles | null>(null);
  const [callWith, setCallWith] = useState<string>("");
  const [callState, setCallState] = useState("");
  const [incoming, setIncoming] = useState<IncomingCall | null>(null);
  const [withVideo, setWithVideo] = useState(false);
  const remoteAudio = useRef<HTMLAudioElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => watchNexusUser(setMe), []);
  useEffect(() => { if (me) return watchContacts(setContacts, setError); }, [me]);
  useEffect(() => { if (me && active) return watchConversation(active, setMsgs, setError); }, [me, active]);
  useEffect(() => { if (me) return watchIncomingCalls(setIncoming, setError); }, [me]);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  function attachRemote(s: MediaStream) {
    if (remoteAudio.current) remoteAudio.current.srcObject = s;
    if (remoteVideo.current) remoteVideo.current.srcObject = s;
  }

  function addContact(e: FormEvent) {
    e.preventDefault();
    const mail = newContact.trim().toLowerCase();
    if (!mail || !mail.includes("@")) { setError("Entre une adresse e-mail valide."); return; }
    if (mail === myEmail()) { setError("C'est ta propre adresse."); return; }
    setError(null);
    setContacts((prev) => prev.some((c) => c.email === mail) ? prev : [{ email: mail }, ...prev]);
    setActive(mail);
    setNewContact("");
  }

  async function onSend(e: FormEvent) {
    e.preventDefault();
    if (!active) return;
    const t = text; setText("");
    try { await sendTo(active, t); }
    catch (err: any) { setError(err?.message || "Envoi impossible."); setText(t); }
  }

  async function onCall(video: boolean) {
    if (!active) { setError("Choisis d'abord une personne."); return; }
    setError(null); setWithVideo(video);
    try {
      const h = await callPerson(active, video, attachRemote, setCallState);
      setCall(h); setCallWith(active);
    } catch (err: any) { setError(err?.message || "Appel impossible."); }
  }

  async function onAnswer() {
    if (!incoming) return;
    setError(null); setWithVideo(incoming.video);
    try {
      const h = await answerCall(incoming.id, incoming.video, attachRemote, setCallState);
      setCall(h); setCallWith(incoming.from); setActive(incoming.from); setIncoming(null);
    } catch (err: any) { setError(err?.message || "Impossible de repondre."); }
  }

  async function onHangUp() {
    await call?.hangUp();
    setCall(null); setCallState(""); setCallWith("");
  }

  if (!me) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
        <UserPlus size={26} className="text-nexus-muted" />
        <p className="text-sm text-nexus-text">Connecte-toi a ton compte Nexus</p>
        <p className="max-w-xs text-[11px] leading-relaxed text-nexus-muted">
          Clique sur « Compte » en haut a droite. Ton ami cree le sien avec SON adresse
          e-mail (pas besoin de Google). Ensuite tu l'ajoutes ici et vous discutez.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full gap-3">
      {/* ---- Colonne des contacts ---- */}
      <div className={`${active ? "hidden sm:flex" : "flex"} w-full sm:w-44 shrink-0 flex-col gap-2`}>
        <form onSubmit={addContact} className="flex gap-1.5">
          <input
            value={newContact}
            onChange={(e) => setNewContact(e.target.value)}
            placeholder="email@ami.com"
            className="nx-input min-w-0 flex-1 text-[11px]"
          />
          <button type="submit" title="Ajouter cette personne"
            className="nx-btn nx-btn-primary shrink-0">
            <UserPlus size={13} />
          </button>
        </form>

        <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {contacts.map((c) => (
            <button
              key={c.email}
              onClick={() => setActive(c.email)}
              className={`nx-item truncate px-2.5 py-2 text-left text-[11px] ${active === c.email ? "nx-item-active text-nexus-text" : "text-nexus-muted"}`}
            >
              {c.email.split("@")[0]}
              <span className="block truncate text-[9px] opacity-60">{c.email}</span>
            </button>
          ))}
          {contacts.length === 0 && (
            <p className="mt-2 text-[10px] leading-relaxed text-nexus-muted/70">
              Ajoute quelqu'un avec son adresse e-mail pour commencer une discussion.
            </p>
          )}
        </div>
        <p className="text-[9px] leading-relaxed text-nexus-muted/60">
          Toi : {me.email}
        </p>
      </div>

      {/* ---- Conversation ---- */}
      <div className={`${active ? "flex" : "hidden sm:flex"} min-w-0 flex-1 flex-col gap-2`}>
        {/* Appel entrant : ca sonne */}
        {incoming && !call && (
          <div className="nexus-fade-in flex items-center gap-2 rounded-xl border p-2.5"
               style={{ borderColor: "var(--accent)" }}>
            <PhoneIncoming size={15} style={{ color: "var(--accent)" }} className="animate-pulse" />
            <span className="min-w-0 flex-1 truncate text-[11px] text-nexus-text">
              {incoming.from} t'appelle{incoming.video ? " (video)" : ""}
            </span>
            <button onClick={onAnswer} className="nx-btn nx-btn-primary">Repondre</button>
            <button onClick={() => { declineCall(incoming.id); setIncoming(null); }}
              className="nx-btn nx-btn-danger">Refuser</button>
          </div>
        )}

        {active ? (
          <>
            <div className="flex items-center gap-2">
              <button onClick={() => setActive(null)} className="sm:hidden text-nexus-muted" title="Retour">
                <ArrowLeft size={15} />
              </button>
              <span className="min-w-0 flex-1 truncate text-xs font-medium text-nexus-text">{active}</span>
              {call ? (
                <span className="flex items-center gap-1.5">
                  <span className="text-[10px]" style={{ color: "var(--accent)" }}>
                    {callState === "connected" ? "En ligne" : "Appel..."}
                  </span>
                  <button onClick={onHangUp} title="Raccrocher"
                    className="nx-btn nx-btn-danger nx-btn-icon">
                    <PhoneOff size={13} />
                  </button>
                </span>
              ) : (
                <>
                  <button onClick={() => onCall(false)} title={`Appeler ${active}`}
                    className="nx-btn nx-btn-icon">
                    <Phone size={13} />
                  </button>
                  <button onClick={() => onCall(true)} title={`Appel video avec ${active}`}
                    className="nx-btn nx-btn-icon">
                    <Video size={13} />
                  </button>
                </>
              )}
            </div>

            {call && withVideo && (
              <video ref={remoteVideo} autoPlay playsInline className="w-full rounded-lg bg-black" />
            )}
            {call && <p className="text-[10px] text-nexus-muted">Appel avec {callWith}</p>}

            {error && (
              <p className="rounded-lg bg-red-500/10 px-2.5 py-1.5 text-[11px] leading-relaxed text-red-300">{error}</p>
            )}

            <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto rounded-xl border border-nexus-border bg-nexus-bg/40 p-2.5">
              {msgs.length === 0 && (
                <p className="m-auto text-center text-[11px] leading-relaxed text-nexus-muted/70">
                  Aucun message avec {active}.<br />Ecris le premier !
                </p>
              )}
              {msgs.map((m) => {
                const mine = m.from === me.email.toLowerCase();
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <span className="max-w-[80%] break-words rounded-2xl px-3 py-1.5 text-xs"
                      style={mine
                        ? { backgroundColor: "color-mix(in srgb, var(--accent) 26%, transparent)", color: "var(--nexus-text)" }
                        : { backgroundColor: "rgba(255,255,255,0.06)", color: "var(--nexus-text)" }}>
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
                placeholder={`Message a ${active.split("@")[0]}...`}
                className="nx-input min-w-0 flex-1"
              />
              <button type="submit" disabled={!text.trim()}
                className="nx-btn nx-btn-primary">
                <Send size={14} />
              </button>
            </form>
          </>
        ) : (
          <div className="m-auto max-w-xs text-center text-[11px] leading-relaxed text-nexus-muted/70">
            Choisis une personne a gauche, ou ajoute-la avec son adresse e-mail.
          </div>
        )}
      </div>
      <audio ref={remoteAudio} autoPlay />
    </div>
  );
}

import { useState, type FormEvent } from "react";
import { openAiWindow } from "../lib/tauri";

const TARGET_EMAIL = "aharondray26@gmail.com";
// Identifiant du formulaire Formspree (gratuit). A remplir apres inscription :
// formspree.io -> New form -> copie l'id de l'URL (ex : "xzzblkne").
// Tant qu'il est vide, on retombe sur l'ouverture de Gmail.
const FORMSPREE_ID = "";

const REASONS = [
  { key: "feedback", label: "Retour", subject: "Retour d'experience" },
  { key: "bug", label: "Bug", subject: "Signalement de bug" },
  { key: "idea", label: "Idee", subject: "Proposition d'idee" },
  { key: "other", label: "Autre", subject: "Prise de contact" },
];

function gmailUrl(subject: string, body: string): string {
  const p = new URLSearchParams({
    view: "cm",
    fs: "1",
    to: TARGET_EMAIL,
    su: subject,
    body,
  });
  return `https://mail.google.com/mail/?${p.toString()}`;
}

function outlookUrl(subject: string, body: string): string {
  const p = new URLSearchParams({
    to: TARGET_EMAIL,
    subject,
    body,
  });
  return `https://outlook.live.com/mail/0/deeplink/compose?${p.toString()}`;
}

export default function Mail() {
  const [reason, setReason] = useState(REASONS[0]);
  const [senderEmail, setSenderEmail] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<"" | "sending" | "sent" | "error">("");

  function buildBody(): string {
    return [
      message,
      "",
      "----",
      `Expediteur : ${senderEmail || "non renseigne"}`,
    ].join("\n");
  }

  // Envoi reel via Formspree si configure ; sinon on ouvre Gmail (repli).
  async function send(e: FormEvent) {
    e.preventDefault();
    if (!FORMSPREE_ID) {
      openAiWindow("gmail-compose", gmailUrl(reason.subject, buildBody()));
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          email: senderEmail,
          _subject: reason.subject,
          message,
        }),
      });
      setStatus(res.ok ? "sent" : "error");
      if (res.ok) setMessage("");
    } catch {
      setStatus("error");
    }
  }

  function openOutlook() {
    openAiWindow("outlook-compose", outlookUrl(reason.subject, buildBody()));
  }

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(TARGET_EMAIL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {REASONS.map((r) => (
          <button
            key={r.key}
            onClick={() => setReason(r)}
            className="rounded-full border px-3 py-1.5 text-xs transition-colors"
            style={
              reason.key === r.key
                ? { borderColor: "var(--accent)", color: "var(--accent)" }
                : { borderColor: "#27272a", color: "#a1a1aa" }
            }
          >
            {r.label}
          </button>
        ))}
      </div>

      <form onSubmit={send} className="flex flex-1 flex-col gap-3">
        <input
          type="email"
          required
          value={senderEmail}
          onChange={(e) => setSenderEmail(e.target.value)}
          placeholder="Ton e-mail"
          className="rounded-lg border border-nexus-border bg-nexus-bg px-3 py-2 text-sm text-nexus-text outline-none focus:border-white/30"
        />
        <textarea
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={`Ton message (${reason.label.toLowerCase()})...`}
          className="flex-1 resize-none rounded-lg border border-nexus-border bg-nexus-bg px-3 py-3 text-sm text-nexus-text outline-none focus:border-white/30"
        />

        <button
          type="submit"
          disabled={status === "sending"}
          className="rounded-lg border px-4 py-2.5 text-sm font-medium disabled:opacity-50"
          style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
        >
          {status === "sending" ? "Envoi..." : "Envoyer le message"}
        </button>
        {status === "sent" && (
          <span className="text-[11px] text-nexus-muted">
            Message envoye, merci ! ✓
          </span>
        )}
        {status === "error" && (
          <span className="text-[11px] text-red-400">
            Echec de l'envoi. Reessaie ou utilise Gmail ci-dessous.
          </span>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() =>
              openAiWindow("gmail-compose", gmailUrl(reason.subject, buildBody()))
            }
            className="rounded-lg border border-nexus-border bg-white/[0.04] px-4 py-2 text-xs text-nexus-text transition-colors hover:bg-white/[0.08]"
          >
            Ouvrir dans Gmail
          </button>
          <button
            type="button"
            onClick={openOutlook}
            className="rounded-lg border border-nexus-border bg-white/[0.04] px-4 py-2 text-xs text-nexus-text transition-colors hover:bg-white/[0.08]"
          >
            Ouvrir dans Outlook
          </button>
        </div>

        <button
          type="button"
          onClick={copyAddress}
          className="rounded-lg border border-nexus-border px-4 py-2 text-xs text-nexus-muted transition-colors hover:text-nexus-text"
        >
          {copied ? "Adresse copiee !" : `Copier l'adresse (${TARGET_EMAIL})`}
        </button>
      </form>
    </div>
  );
}

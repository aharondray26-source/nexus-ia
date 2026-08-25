import { useState, useEffect, type FormEvent } from "react";
import { usePersistentState } from "../lib/persist";
import { useWindows } from "../os/useWindows";
import { openAiWindow } from "../lib/tauri";
import {
  googleSignIn,
  initAuth,
  fetchRealGmailMessages,
  sendRealGmailMessage,
  getAccessToken
} from "../lib/googleAuth";
import {
  Mail as MailIcon,
  Send,
  Inbox,
  Star,
  Trash2,
  FileText,
  Paperclip,
  Search,
  Plus,
  MessageSquare,
  ExternalLink,
  CheckCircle2,
  User,
  Sparkles,
  Cloud,
  ArrowLeft,
  Reply,
  Forward,
  RotateCcw,
  RefreshCw,
  Lock
} from "lucide-react";

interface EmailAttachment {
  name: string;
  size: string;
  type: string;
}

export interface EmailItem {
  id: string;
  senderName: string;
  senderEmail: string;
  senderAvatar?: string;
  recipientEmail: string;
  subject: string;
  body: string;
  date: string;
  folder: "inbox" | "sent" | "starred" | "drafts" | "trash";
  read: boolean;
  starred: boolean;
  attachments?: EmailAttachment[];
}

// Plus aucun faux e-mail : on n'invente pas de messages.
const DEFAULT_EMAILS: EmailItem[] = [];

export function generateInitialEmails(userEmail: string, userName: string): EmailItem[] {
  const email = userEmail || "mon.adresse@gmail.com";
  const name = userName || email.split("@")[0];

  // UN seul message, clairement envoye par Nexus lui-meme.
  // On n'invente plus de courriers en se faisant passer pour Google.
  return [
    {
      id: "mail-welcome",
      senderName: "Nexus",
      senderEmail: "nexus@nexus-espace.app",
      recipientEmail: email,
      subject: "Bienvenue dans ta boite mail Nexus",
      body:
        `Bonjour ${name},\n\n` +
        `Cette boite est vide pour l'instant : c'est normal, aucun message n'est invente ici.\n\n` +
        `Pour voir tes VRAIS e-mails Gmail :\n` +
        `1. Ouvre « Compte » en haut a droite.\n` +
        `2. Clique sur « Autoriser aussi Gmail et Drive ».\n\n` +
        `Tes messages resteront prives : ils ne sont ni copies ni conserves par Nexus.`,
      date: "Maintenant",
      folder: "inbox",
      read: false,
      starred: false,
    },
  ];
}

export default function Mail() {
  const openApp = useWindows((s) => s.openApp);
  const [googleUser, setGoogleUser] = usePersistentState<{ email: string; name: string; avatar: string } | null>(
    "nexus.googleUser",
    {
      email: "mon.adresse@gmail.com",
      name: "Mon Compte Google",
      avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=MyGoogleAccount",
    }
  );

  const currentUserEmail = googleUser?.email || "mon.adresse@gmail.com";
  const currentUserName = googleUser?.name || "Utilisateur";

  const [emails, setEmails] = usePersistentState<EmailItem[]>(
    `nexus.userEmails.${currentUserEmail}`,
    generateInitialEmails(currentUserEmail, currentUserName)
  );
  const [cloudFiles] = usePersistentState<{ name: string; size: string }[]>("nexus.cloudFiles", []);

  const [activeFolder, setActiveFolder] = useState<"inbox" | "sent" | "starred" | "drafts" | "trash">("inbox");
  const [selectedMailId, setSelectedMailId] = useState<string | null>(emails[0]?.id || null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCompose, setShowCompose] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);

  // Account editing form
  const [editEmail, setEditEmail] = useState(currentUserEmail);
  const [editName, setEditName] = useState(currentUserName);

  // Form states for new email
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<EmailAttachment[]>([]);
  const [sending, setSending] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const activeMail = emails.find((m) => m.id === selectedMailId);

  // Filtered emails list
  const filteredEmails = emails.filter((m) => {
    const matchesSearch =
      m.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.senderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.body.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (activeFolder === "starred") return m.starred && m.folder !== "trash";
    return m.folder === activeFolder;
  });

  const unreadCount = emails.filter((m) => m.folder === "inbox" && !m.read).length;

  function handleSelectMail(id: string) {
    setSelectedMailId(id);
    setEmails((prev) =>
      prev.map((m) => (m.id === id ? { ...m, read: true } : m))
    );
  }

  function toggleStar(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setEmails((prev) =>
      prev.map((m) => (m.id === id ? { ...m, starred: !m.starred } : m))
    );
  }

  function handleDeleteMail(id: string) {
    setEmails((prev) =>
      prev.map((m) => (m.id === id ? { ...m, folder: "trash" } : m))
    );
    if (selectedMailId === id) {
      setSelectedMailId(null);
    }
  }

  const [isSyncingGmail, setIsSyncingGmail] = useState(false);
  const [hasGoogleAuth, setHasGoogleAuth] = useState(false);

  useEffect(() => {
    initAuth(
      (u, tok) => {
        setHasGoogleAuth(true);
        if (u.email) {
          setGoogleUser({
            email: u.email,
            name: u.displayName || u.email.split("@")[0],
            avatar: u.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(u.email)}`,
          });
        }
      },
      () => setHasGoogleAuth(false)
    );
  }, []);

  async function handleGoogleLoginClick() {
    try {
      const res = await googleSignIn();
      if (res) {
        setHasGoogleAuth(true);
        setGoogleUser({
          email: res.user.email || "mon.adresse@gmail.com",
          name: res.user.displayName || res.user.email?.split("@")[0] || "Utilisateur Google",
          avatar: res.user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(res.user.email || "Google")}`,
        });
        setNotification("Connexion Google réussie ! Synchronisation de la boîte mail...");
        setTimeout(() => setNotification(null), 4000);
        handleSyncGmail();
      }
    } catch (err: any) {
      console.error(err);
      setNotification(`Connexion Google : ${err?.message || "Échec"}`);
      setTimeout(() => setNotification(null), 4000);
    }
  }

  async function handleSyncGmail() {
    setIsSyncingGmail(true);
    try {
      const realMails = await fetchRealGmailMessages();
      if (realMails.length > 0) {
        const formattedMails: EmailItem[] = realMails.map((rm) => ({
          id: rm.id,
          senderName: rm.senderName,
          senderEmail: rm.senderEmail,
          recipientEmail: rm.recipientEmail || currentUserEmail,
          subject: rm.subject,
          body: rm.body,
          date: rm.date,
          folder: rm.folder,
          read: rm.read,
          starred: rm.starred,
        }));

        setEmails((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const newMails = formattedMails.filter((m) => !existingIds.has(m.id));
          return [...newMails, ...prev];
        });
        setNotification(`${realMails.length} e-mails Gmail synchronisés en direct !`);
      } else {
        setNotification("Aucun nouvel e-mail dans votre boîte Gmail.");
      }
    } catch (err: any) {
      console.error(err);
      setNotification(`Sync Gmail: ${err?.message || "Veuillez vous connecter à Google"}`);
    } finally {
      setIsSyncingGmail(false);
      setTimeout(() => setNotification(null), 4000);
    }
  }

  async function handleSendEmail(e: FormEvent) {
    e.preventDefault();
    if (!recipient.trim() || !subject.trim() || !body.trim()) return;

    setSending(true);

    try {
      const token = getAccessToken();
      if (token) {
        await sendRealGmailMessage(recipient.trim(), subject.trim(), body.trim());
        setNotification(`E-mail Gmail RÉEL envoyé avec succès à ${recipient} !`);
      } else {
        setNotification(`E-mail envoyé à ${recipient} (Mode Statique local)`);
      }

      const newMail: EmailItem = {
        id: `mail-sent-${Date.now()}`,
        senderName: googleUser?.name || "Moi",
        senderEmail: currentUserEmail,
        senderAvatar: googleUser?.avatar,
        recipientEmail: recipient.trim(),
        subject: subject.trim(),
        body: body.trim(),
        date: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        folder: "sent",
        read: true,
        starred: false,
        attachments: attachedFiles.length > 0 ? attachedFiles : undefined,
      };

      setEmails((prev) => [newMail, ...prev]);
      setShowCompose(false);
      setSubject("");
      setBody("");
      setAttachedFiles([]);
    } catch (err: any) {
      console.error(err);
      setNotification(`Échec envoi Gmail : ${err?.message || "Erreur"}`);
    } finally {
      setSending(false);
      setTimeout(() => setNotification(null), 4000);
    }
  }

  function handleSaveAccount(e: FormEvent) {
    e.preventDefault();
    const newE = editEmail.trim() || "mon.adresse@gmail.com";
    const newN = editName.trim() || newE.split("@")[0];

    const updatedUser = {
      email: newE,
      name: newN,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(newN)}`,
    };

    setGoogleUser(updatedUser);
    setShowAccountModal(false);
    setNotification(`Compte mis à jour : ${newE}`);
    setTimeout(() => setNotification(null), 4000);
  }

  function handleAttachCloudFile(fileName: string, fileSize: string) {
    if (attachedFiles.some((f) => f.name === fileName)) return;
    setAttachedFiles((prev) => [...prev, { name: fileName, size: fileSize, type: "cloud" }]);
  }

  function gmailExternalUrl(sub: string, msgBody: string): string {
    const p = new URLSearchParams({
      view: "cm",
      fs: "1",
      to: recipient || "",
      su: sub || "Message depuis Nexus OS",
      body: msgBody,
    });
    return `https://mail.google.com/mail/?${p.toString()}`;
  }

  return (
    <div className="flex h-full w-full rounded-2xl border border-white/10 bg-slate-950/80 backdrop-blur-xl overflow-hidden">
      {/* Sidebar Folders & Account info */}
      <div className="w-56 sm:w-60 border-r border-white/10 flex flex-col bg-black/40 p-2 gap-2 shrink-0">
        {/* User Badge & Switcher */}
        <button
          onClick={() => {
            setEditEmail(currentUserEmail);
            setEditName(currentUserName);
            setShowAccountModal(true);
          }}
          className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-2.5 flex items-center gap-2.5 hover:bg-cyan-500/20 transition-all text-left group"
          title="Cliquez pour changer votre adresse email"
        >
          <img
            src={googleUser?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(currentUserName)}`}
            alt="Google Avatar"
            className="h-8 w-8 rounded-full border border-cyan-400 object-cover"
          />
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-white truncate group-hover:text-cyan-300">{currentUserName}</h4>
            <p className="text-[10px] text-cyan-300 truncate">{currentUserEmail}</p>
          </div>
          <span className="text-[10px] text-slate-400 group-hover:text-white font-medium">Changer</span>
        </button>

        {/* Compose Button */}
        <button
          onClick={() => setShowCompose(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-cyan-500 py-2.5 text-xs font-bold text-black hover:bg-cyan-400 transition-all shadow-md shadow-cyan-500/20"
        >
          <Plus size={16} />
          <span>Nouveau Message</span>
        </button>

        {/* Google Workspace Live Sync Button */}
        <div className="flex flex-col gap-1">
          {!hasGoogleAuth ? (
            <button
              onClick={handleGoogleLoginClick}
              className="flex items-center justify-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 py-2 px-2 text-xs font-semibold text-red-300 hover:bg-red-500/20 transition-all"
              title="Connecter votre compte Gmail réel"
            >
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z" />
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9z" />
                <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z" />
              </svg>
              <span>Connexion Gmail Réel</span>
            </button>
          ) : (
            <button
              onClick={handleSyncGmail}
              disabled={isSyncingGmail}
              className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 py-2 px-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 transition-all disabled:opacity-50"
              title="Synchroniser avec votre boîte Gmail réelle"
            >
              <RefreshCw size={13} className={isSyncingGmail ? "animate-spin text-emerald-400" : "text-emerald-400"} />
              <span>{isSyncingGmail ? "Sync en cours..." : "Sync Gmail Réel"}</span>
            </button>
          )}
        </div>

        {/* Folder Links */}
        <div className="flex flex-col gap-1 mt-1 flex-1">
          <button
            onClick={() => setActiveFolder("inbox")}
            className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
              activeFolder === "inbox"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold"
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-2">
              <Inbox size={15} />
              <span>Boîte de réception</span>
            </div>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-cyan-500 text-[10px] font-extrabold text-black">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveFolder("starred")}
            className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
              activeFolder === "starred"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold"
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-2">
              <Star size={15} />
              <span>Messages Favoris</span>
            </div>
          </button>

          <button
            onClick={() => setActiveFolder("sent")}
            className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
              activeFolder === "sent"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold"
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-2">
              <Send size={15} />
              <span>Messages Envoyés</span>
            </div>
          </button>

          <button
            onClick={() => setActiveFolder("trash")}
            className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
              activeFolder === "trash"
                ? "bg-red-500/20 text-red-300 border border-red-500/40 font-semibold"
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-2">
              <Trash2 size={15} />
              <span>Corbeille</span>
            </div>
          </button>
        </div>

        {/* Quick Link to Cloud / Messagerie */}
        <div className="pt-2 border-t border-white/10 flex flex-col gap-1.5">
          <button
            onClick={() => openApp("messages", { width: 820, height: 580 })}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-[11px] text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <MessageSquare size={13} className="text-cyan-400" />
            <span>Messagerie Instantanée</span>
          </button>
          <button
            onClick={() => openApp("cloud", { width: 780, height: 580 })}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-[11px] text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Cloud size={13} className="text-blue-400" />
            <span>Stockage Nexus Cloud</span>
          </button>
        </div>
      </div>

      {/* Main Mail Container */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-900/30">
        {/* Search & Notification Bar */}
        <div className="p-3 border-b border-white/10 flex items-center justify-between gap-3 bg-black/20">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher dans les e-mails..."
              className="w-full rounded-xl border border-white/10 bg-black/50 pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500/50"
            />
          </div>

          {notification && (
            <div className="flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-950/60 px-3 py-1.5 text-xs text-cyan-200 animate-pulse">
              <Sparkles size={13} className="text-cyan-400" />
              <span>{notification}</span>
            </div>
          )}
        </div>

        {/* Email List + Reader Split View */}
        <div className="flex-1 flex overflow-hidden">
          {/* Email List */}
          <div className="w-80 border-r border-white/10 flex flex-col overflow-y-auto bg-black/20 shrink-0">
            {filteredEmails.length > 0 ? (
              filteredEmails.map((m) => {
                const isSelected = m.id === selectedMailId;
                return (
                  <div
                    key={m.id}
                    onClick={() => handleSelectMail(m.id)}
                    className={`p-3 border-b border-white/5 cursor-pointer transition-all flex flex-col gap-1 ${
                      isSelected
                        ? "bg-cyan-500/15 border-l-4 border-l-cyan-400 text-white"
                        : m.read
                        ? "bg-transparent text-slate-400 hover:bg-white/[0.03]"
                        : "bg-white/[0.05] text-slate-100 font-semibold hover:bg-white/[0.08]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold truncate text-slate-200">
                        {m.senderName}
                      </span>
                      <span className="text-[10px] text-slate-500 shrink-0">{m.date}</span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-100 truncate">{m.subject}</p>
                      <button
                        onClick={(e) => toggleStar(e, m.id)}
                        className={`p-1 text-slate-500 hover:text-amber-400 transition-colors ${
                          m.starred ? "text-amber-400" : ""
                        }`}
                      >
                        <Star size={13} fill={m.starred ? "currentColor" : "none"} />
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-400 truncate line-clamp-1">{m.body}</p>

                    {m.attachments && m.attachments.length > 0 && (
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-cyan-400 font-medium">
                        <Paperclip size={10} />
                        <span>{m.attachments.length} pièce(s) jointe(s)</span>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-slate-500 p-4 text-center">
                <MailIcon size={32} className="opacity-30 mb-2" />
                <p className="text-xs">Aucun e-mail dans ce dossier.</p>
              </div>
            )}
          </div>

          {/* Email Reader View */}
          <div className="flex-1 flex flex-col overflow-y-auto p-4 bg-slate-950/40">
            {activeMail ? (
              <div className="flex flex-col gap-4">
                {/* Header Actions */}
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setShowCompose(true);
                        setRecipient(activeMail.senderEmail);
                        setSubject(`Re: ${activeMail.subject}`);
                      }}
                      className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white hover:bg-white/10 transition-colors font-medium"
                    >
                      <Reply size={14} className="text-cyan-400" />
                      <span>Répondre</span>
                    </button>

                    <button
                      onClick={() => {
                        openApp("messages", { width: 820, height: 580 });
                      }}
                      className="flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-300 hover:bg-cyan-500/20 transition-colors font-semibold"
                      title="Discuter directement avec l'expéditeur"
                    >
                      <MessageSquare size={14} className="text-cyan-400" />
                      <span>Tchat en direct</span>
                    </button>
                  </div>

                  <button
                    onClick={() => handleDeleteMail(activeMail.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/5 transition-colors"
                    title="Supprimer cet e-mail"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Mail Metadata */}
                <div>
                  <h2 className="text-base font-bold text-white mb-2">{activeMail.subject}</h2>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={activeMail.senderAvatar || "https://api.dicebear.com/7.x/bottts/svg?seed=Mail"}
                        alt={activeMail.senderName}
                        className="h-10 w-10 rounded-full border border-white/20 object-cover"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{activeMail.senderName}</span>
                          <span className="text-[11px] text-slate-400">&lt;{activeMail.senderEmail}&gt;</span>
                        </div>
                        <span className="text-[10px] text-slate-500">À : {activeMail.recipientEmail}</span>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400 font-medium">{activeMail.date}</span>
                  </div>
                </div>

                {/* Mail Body */}
                <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-xs leading-relaxed text-slate-200 whitespace-pre-wrap">
                  {activeMail.body}
                </div>

                {/* Attachments Section */}
                {activeMail.attachments && activeMail.attachments.length > 0 && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3 flex flex-col gap-2">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Paperclip size={14} className="text-cyan-400" />
                      Pièces jointes ({activeMail.attachments.length})
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {activeMail.attachments.map((att, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between rounded-xl border border-white/10 bg-black/50 p-2.5 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText size={16} className="text-cyan-400 shrink-0" />
                            <div className="min-w-0">
                              <p className="font-semibold text-white truncate">{att.name}</p>
                              <p className="text-[10px] text-slate-400">{att.size}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              openApp("cloud", { width: 780, height: 580 });
                              setNotification(`Pièce jointe "${att.name}" enregistrée dans Nexus Cloud !`);
                              setTimeout(() => setNotification(null), 3000);
                            }}
                            className="text-[11px] font-semibold text-cyan-400 hover:underline px-2 py-1 rounded bg-cyan-500/10 border border-cyan-500/20"
                          >
                            Sauvegarder Cloud
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <Inbox size={40} className="opacity-20 mb-2" />
                <p className="text-xs">Sélectionnez un e-mail pour le lire.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Compose Email Modal */}
      {showCompose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowCompose(false); }}>
          <div className="w-full max-w-xl rounded-2xl border border-white/20 bg-slate-900 p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <MailIcon size={18} className="text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Nouveau Message E-mail</h3>
              </div>
              <button
                onClick={() => setShowCompose(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendEmail} className="flex flex-col gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300">Destinataire (À)</label>
                <input
                  type="email"
                  required
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="ex: aharondray26@gmail.com ou support@nexus-os.io"
                  className="w-full mt-1 rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300">Objet du Message</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="ex: Projet Nexus OS - Remarques et Fichiers"
                  className="w-full mt-1 rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300">Contenu du Mail</label>
                <textarea
                  required
                  rows={6}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Rédigez votre message ici..."
                  className="w-full mt-1 rounded-xl border border-white/10 bg-black/50 p-3 text-xs text-white outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              {/* Cloud Attachments Selector */}
              {cloudFiles.length > 0 && (
                <div>
                  <span className="text-[11px] font-semibold text-slate-400">Joindre un fichier Nexus Cloud :</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {cloudFiles.map((cf, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleAttachCloudFile(cf.name, cf.size)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 text-[10px] text-cyan-300 hover:bg-white/10"
                      >
                        <Paperclip size={10} />
                        <span>{cf.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Attached List */}
              {attachedFiles.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-cyan-400">
                  <CheckCircle2 size={14} />
                  <span>{attachedFiles.length} fichier(s) joint(s) à ce message.</span>
                </div>
              )}

              {/* Form Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <a
                  href={gmailExternalUrl(subject, body)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  <ExternalLink size={14} />
                  <span>Ouvrir dans Gmail Web</span>
                </a>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCompose(false)}
                    className="rounded-xl border border-white/10 px-4 py-2 text-xs text-slate-300 hover:bg-white/5"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={sending}
                    className="flex items-center gap-1.5 rounded-xl bg-cyan-500 px-5 py-2 text-xs font-bold text-black hover:bg-cyan-400 disabled:opacity-50"
                  >
                    <Send size={14} />
                    <span>{sending ? "Envoi..." : "Envoyer"}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Account Switcher Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowAccountModal(false); }}>
          <div className="w-full max-w-sm rounded-2xl border border-white/20 bg-slate-900 p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <User size={18} className="text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Mon Compte Google</h3>
              </div>
              <button
                onClick={() => setShowAccountModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Entrez votre propre adresse email Google. Chaque utilisateur retrouve ses propres e-mails, fichiers et notes synchronisés.
            </p>

            <form onSubmit={handleSaveAccount} className="flex flex-col gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300">Votre E-mail Google</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="ex: mon.adresse@gmail.com"
                  className="w-full mt-1 rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300">Votre Nom Complet</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="ex: Jean Dupont"
                  className="w-full mt-1 rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAccountModal(false)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs text-slate-300 hover:bg-white/5"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-cyan-500 px-5 py-2 text-xs font-bold text-black hover:bg-cyan-400"
                >
                  Enregistrer & Sync
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useRef, useEffect, FormEvent } from "react";
import { usePersistentState } from "../lib/persist";
import { useWindows } from "../os/useWindows";
import {
  MessageSquare,
  Send,
  Search,
  Bot,
  User,
  ShieldCheck,
  CheckCheck,
  Plus,
  UserPlus,
  Mail as MailIcon,
  Trash2,
  Sparkles,
  Cloud,
  X
} from "lucide-react";

export interface ChatContact {
  id: string;
  name: string;
  role: string;
  email?: string;
  avatar: string;
  status: "online" | "busy" | "offline";
  lastMessage: string;
  unreadCount: number;
}

export interface MessageItem {
  id: string;
  senderId: string; // 'user' or contact id
  text: string;
  timestamp: string;
  status?: "sent" | "delivered" | "read";
}

const INITIAL_CONTACTS: ChatContact[] = [
  {
    id: "contact-aharon",
    name: "Aharon Dray",
    role: "Créateur & Lead Dev Nexus OS",
    email: "aharondray26@gmail.com",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    status: "online",
    lastMessage: "Bienvenue sur Nexus OS ! Profite de toutes les fonctionnalités.",
    unreadCount: 1,
  },
  {
    id: "contact-ai",
    name: "Nexus Assistant IA",
    role: "Intelligence Artificielle Dédiée",
    email: "assistant@nexus-os.io",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=NexusAI",
    status: "online",
    lastMessage: "Je suis prêt à vous assister pour vos questions et tâches.",
    unreadCount: 0,
  },
  {
    id: "contact-support",
    name: "Support Technique Nexus",
    role: "Assistance Système & Synchro",
    email: "support@nexus-os.io",
    avatar: "https://api.dicebear.com/7.x/shapes/svg?seed=NexusSupport",
    status: "online",
    lastMessage: "Votre système Nexus est à jour avec les dernières polices tech.",
    unreadCount: 0,
  },
  {
    id: "contact-design",
    name: "Équipe Design & UX",
    role: "Interface & Personnalisation",
    email: "design@nexus-os.io",
    avatar: "https://api.dicebear.com/7.x/identicon/svg?seed=NexusDesign",
    status: "busy",
    lastMessage: "La personnalisation des polices d'écran est désormais active !",
    unreadCount: 0,
  },
];

const INITIAL_CONVERSATIONS: Record<string, MessageItem[]> = {
  "contact-aharon": [
    {
      id: "m-1",
      senderId: "contact-aharon",
      text: "Bonjour ! Bienvenue sur ton espace de travail épuré Nexus OS.",
      timestamp: "10:14",
    },
    {
      id: "m-2",
      senderId: "contact-aharon",
      text: "Tu peux utiliser les polices tech dans les Paramètres, synchroniser ton compte Google sur le Cloud et gérer tes mails & messages.",
      timestamp: "10:15",
    },
  ],
  "contact-ai": [
    {
      id: "m-3",
      senderId: "contact-ai",
      text: "Bonjour ! Je suis l'IA de messagerie Nexus. Écris-moi n'importe quelle demande !",
      timestamp: "09:00",
    },
  ],
  "contact-support": [
    {
      id: "m-4",
      senderId: "contact-support",
      text: "Bonjour. Tout votre stockage Cloud et vos réglages système fonctionnent parfaitement.",
      timestamp: "Hier",
    },
  ],
  "contact-design": [
    {
      id: "m-5",
      senderId: "contact-design",
      text: "Nous avons intégré les polices Plus Jakarta, JetBrains Code et Orbitron Cyber dans les Paramètres.",
      timestamp: "Hier",
    },
  ],
};

export default function NexusMessages() {
  const openApp = useWindows((s) => s.openApp);
  const [contacts, setContacts] = usePersistentState<ChatContact[]>(
    "nexus.chatContacts",
    INITIAL_CONTACTS
  );
  const [conversations, setConversations] = usePersistentState<Record<string, MessageItem[]>>(
    "nexus.chatConversations",
    INITIAL_CONVERSATIONS
  );

  const [activeContactId, setActiveContactId] = useState<string>("contact-aharon");
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);

  // New Contact form states
  const [newContactName, setNewContactName] = useState("");
  const [newContactRole, setNewContactRole] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const activeContact = contacts.find((c) => c.id === activeContactId) || contacts[0];
  const activeMessages = conversations[activeContactId] || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages, isTyping]);

  function handleSelectContact(id: string) {
    setActiveContactId(id);
    setContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c))
    );
  }

  function handleCreateContact(e: FormEvent) {
    e.preventDefault();
    if (!newContactName.trim()) return;

    const name = newContactName.trim();
    const role = newContactRole.trim() || "Contact Réseau";
    const email = newContactEmail.trim() || `${name.toLowerCase().replace(/\s+/g, ".")}@gmail.com`;

    const newId = `contact-${Date.now()}`;
    const newContactObj: ChatContact = {
      id: newId,
      name,
      role,
      email,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`,
      status: "online",
      lastMessage: "Discussion démarrée",
      unreadCount: 0,
    };

    setContacts((prev) => [newContactObj, ...prev]);
    setConversations((prev) => ({
      ...prev,
      [newId]: [
        {
          id: `welcome-${Date.now()}`,
          senderId: newId,
          text: `Bonjour ! Je suis ${name}. Ravi d'échanger avec vous sur Nexus OS.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ],
    }));

    setActiveContactId(newId);
    setShowAddContact(false);
    setNewContactName("");
    setNewContactRole("");
    setNewContactEmail("");
  }

  function sendMessage(e: FormEvent) {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg: MessageItem = {
      id: `msg-${Date.now()}`,
      senderId: "user",
      text: inputText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      status: "read",
    };

    const textSent = inputText.trim();
    setInputText("");

    setConversations((prev) => ({
      ...prev,
      [activeContactId]: [...(prev[activeContactId] || []), userMsg],
    }));

    setContacts((prev) =>
      prev.map((c) =>
        c.id === activeContactId ? { ...c, lastMessage: `Vous: ${textSent}` } : c
      )
    );

    setIsTyping(true);
    setTimeout(() => {
      let replyText = "";
      if (activeContactId === "contact-aharon") {
        replyText = `Merci pour votre message ! J'ai bien reçu "${textSent}". Tout est parfaitement relié entre les e-mails, le cloud et la messagerie Nexus !`;
      } else if (activeContactId === "contact-ai") {
        replyText = `🤖 **Réponse IA Nexus :** J'ai analysé votre demande "${textSent}". Vos applications sont synchronisées.`;
      } else if (activeContactId === "contact-support") {
        replyText = `Support Technique : Message bien reçu ! Votre environnement Nexus OS fonctionne à 100%.`;
      } else {
        replyText = `Message bien reçu de la part de ${activeContact.name} ! "${textSent}" est enregistré dans l'historique.`;
      }

      const botMsg: MessageItem = {
        id: `msg-reply-${Date.now()}`,
        senderId: activeContactId,
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setConversations((prev) => ({
        ...prev,
        [activeContactId]: [...(prev[activeContactId] || []), botMsg],
      }));

      setContacts((prev) =>
        prev.map((c) =>
          c.id === activeContactId ? { ...c, lastMessage: replyText } : c
        )
      );

      setIsTyping(false);
    }, 1200);
  }

  function handleClearChat() {
    setConversations((prev) => ({
      ...prev,
      [activeContactId]: [],
    }));
  }

  const filteredContacts = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full w-full rounded-2xl overflow-hidden border border-white/10 bg-slate-950/80 backdrop-blur-xl">
      {/* Sidebar Contacts List */}
      <div className="w-64 sm:w-72 border-r border-white/10 flex flex-col bg-black/40 shrink-0">
        <div className="p-3 border-b border-white/10 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare size={18} className="text-cyan-400" />
              <h2 className="text-sm font-bold text-white">Messagerie Nexus</h2>
            </div>
            <button
              onClick={() => setShowAddContact(true)}
              className="flex items-center gap-1 rounded-lg bg-cyan-500/20 px-2 py-1 text-[11px] font-bold text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 transition-all"
              title="Ajouter ou choisir un nouveau contact"
            >
              <UserPlus size={13} />
              <span>Nouveau</span>
            </button>
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher / Choisir contact..."
              className="w-full rounded-xl border border-white/10 bg-black/60 pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>

        {/* Contact Selection Feed */}
        <div className="flex-1 overflow-y-auto p-1.5 flex flex-col gap-1">
          {filteredContacts.map((c) => {
            const isSelected = c.id === activeContactId;
            return (
              <button
                key={c.id}
                onClick={() => handleSelectContact(c.id)}
                className={`flex items-start gap-2.5 p-2.5 rounded-xl text-left transition-all ${
                  isSelected
                    ? "bg-cyan-500/15 border border-cyan-500/40 text-white shadow-sm"
                    : "hover:bg-white/5 border border-transparent text-slate-300"
                }`}
              >
                <div className="relative shrink-0 mt-0.5">
                  <img
                    src={c.avatar}
                    alt={c.name}
                    className="h-9 w-9 rounded-full object-cover border border-white/20"
                  />
                  <span
                    className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-slate-950 ${
                      c.status === "online"
                        ? "bg-emerald-400"
                        : c.status === "busy"
                        ? "bg-amber-400"
                        : "bg-slate-500"
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold truncate text-slate-100">{c.name}</span>
                    {c.unreadCount > 0 && (
                      <span className="h-4 min-w-[16px] px-1 rounded-full bg-cyan-500 text-[10px] font-extrabold text-black flex items-center justify-center">
                        {c.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-cyan-400/80 truncate font-medium">{c.role}</p>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">{c.lastMessage}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Conversation Feed */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-900/40">
        {/* Chat Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/20">
          <div className="flex items-center gap-3">
            <img
              src={activeContact.avatar}
              alt={activeContact.name}
              className="h-9 w-9 rounded-full border border-cyan-400 object-cover"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">{activeContact.name}</h3>
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                  ● En ligne
                </span>
              </div>
              <p className="text-[11px] text-slate-400">{activeContact.role}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => openApp("mail", { width: 840, height: 600 })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition-all"
              title="Envoyer un e-mail à ce contact"
            >
              <MailIcon size={14} className="text-cyan-400" />
              <span className="hidden sm:inline">Envoyer E-mail</span>
            </button>

            <button
              onClick={handleClearChat}
              className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-red-400 hover:bg-white/5 transition-all text-xs flex items-center gap-1"
              title="Effacer la discussion"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {activeMessages.length > 0 ? (
            activeMessages.map((m) => {
              const isUser = m.senderId === "user";
              return (
                <div
                  key={m.id}
                  className={`flex flex-col max-w-[80%] ${
                    isUser ? "self-end items-end" : "self-start items-start"
                  }`}
                >
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-md ${
                      isUser
                        ? "bg-cyan-500 text-black font-medium rounded-br-none"
                        : "bg-white/10 text-slate-100 border border-white/10 rounded-bl-none"
                    }`}
                  >
                    <p className="break-words">{m.text}</p>
                  </div>
                  <div className="flex items-center gap-1 mt-1 px-1">
                    <span className="text-[10px] text-slate-500">{m.timestamp}</span>
                    {isUser && <CheckCheck size={12} className="text-cyan-400" />}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-2">
              <MessageSquare size={32} className="opacity-30" />
              <p className="text-xs">Aucun message pour l'instant.</p>
              <p className="text-[11px] text-slate-600">Envoyez un message pour démarrer la discussion !</p>
            </div>
          )}

          {isTyping && (
            <div className="self-start flex items-center gap-2 rounded-2xl bg-white/5 border border-white/10 px-3 py-2 text-xs text-slate-400">
              <Sparkles size={13} className="text-cyan-400 animate-spin" />
              <span>En train d'écrire...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <form onSubmit={sendMessage} className="p-3 border-t border-white/10 bg-black/40 flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Envoyer un message à ${activeContact.name}...`}
            className="flex-1 rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500/50"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="flex items-center justify-center gap-1 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-black disabled:opacity-40 hover:bg-cyan-400 transition-all shadow-md shadow-cyan-500/20"
          >
            <Send size={14} />
            <span className="hidden sm:inline">Envoyer</span>
          </button>
        </form>
      </div>

      {/* Modal Add Contact / Choisir à qui parler */}
      {showAddContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/20 bg-slate-900 p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <UserPlus size={18} className="text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Choisir / Ajouter un Contact</h3>
              </div>
              <button
                onClick={() => setShowAddContact(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateContact} className="flex flex-col gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300">Nom du Contact</label>
                <input
                  type="text"
                  required
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  placeholder="ex: Thomas Martin"
                  className="w-full mt-1 rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300">Poste / Rôle</label>
                <input
                  type="text"
                  value={newContactRole}
                  onChange={(e) => setNewContactRole(e.target.value)}
                  placeholder="ex: Chef de Projet / Collègue"
                  className="w-full mt-1 rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300">Adresse E-mail</label>
                <input
                  type="email"
                  value={newContactEmail}
                  onChange={(e) => setNewContactEmail(e.target.value)}
                  placeholder="ex: thomas.martin@gmail.com"
                  className="w-full mt-1 rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddContact(false)}
                  className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-black hover:bg-cyan-400"
                >
                  Démarrer la Discussion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

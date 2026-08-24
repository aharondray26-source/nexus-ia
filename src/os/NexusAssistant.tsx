import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useAnimation } from "motion/react";
import {
  Sparkles,
  Send,
  X,
  Wand2,
  ShieldCheck,
  Calculator,
  BookOpen,
  Paperclip,
  Plus,
  FileText,
  PanelRightClose,
  PanelRightOpen,
  Image as ImageIcon,
  Trash2,
  Key,
  ArrowDown,
  Sliders,
} from "lucide-react";
import { useWindows } from "./useWindows";
import { generateNexusResponse, queryNexusAIObject } from "../lib/nexusBrain";
import { addNexusTask } from "../lib/persist";
import { NexusMessageRenderer } from "./NexusMessageRenderer";

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  isStreaming?: boolean;
  modelUsed?: string;
  attachments?: { name: string; type: string }[];
}

interface AttachedFile {
  id: string;
  name: string;
  type: string;
  content: string;
}

// Word-by-word streaming component for Apple Intelligence feel
const WordByWordText: React.FC<{ text: string; isNew?: boolean }> = ({ text, isNew }) => {
  const [displayedWordCount, setDisplayedWordCount] = useState(isNew ? 0 : 999999);
  const words = text.split(" ");

  useEffect(() => {
    if (!isNew) {
      setDisplayedWordCount(words.length);
      return;
    }

    setDisplayedWordCount(0);
    let current = 0;
    const interval = setInterval(() => {
      current += 2;
      setDisplayedWordCount(current);
      if (current >= words.length) {
        clearInterval(interval);
      }
    }, 28);

    return () => clearInterval(interval);
  }, [text, isNew]);

  if (!isNew || displayedWordCount >= words.length) {
    return <NexusMessageRenderer content={text} isAssistant={true} />;
  }

  const visibleText = words.slice(0, displayedWordCount).join(" ");

  return (
    <div>
      <NexusMessageRenderer content={visibleText} isAssistant={true} />
      <span className="inline-block w-2 h-3.5 ml-1 bg-cyan-400 rounded animate-pulse align-middle" />
    </div>
  );
};

export default function NexusAssistant() {
  const pillControls = useAnimation();
  const [open, setOpen] = useState(false);
  const [isDocked, setIsDocked] = useState(false); // Mode "Se caster sur le côté / mur"
  const [pillSize, setPillSize] = useState<"compact" | "normal" | "expanded">("normal");
  const isDraggingRef = useRef(false);
  const [input, setInput] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init-1",
      role: "assistant",
      text: "Bonjour ! Je suis **Nexus AI Pro** avec intelligence intégrée et recherche Web. Vous pouvez me poser vos questions, **glisser-déposer vos fichiers** ou basculer en **mode latéral (ancré au mur)**.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [thinkingPhase, setThinkingPhase] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const openApp = useWindows((s) => s.openApp);
  const windows = useWindows((s) => s.windows);
  const activeWindowsCount = windows.filter((w) => !w.minimized).length;

  const scrollToBottom = (smooth = true) => {
    chatEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  };

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isFarFromBottom = scrollHeight - scrollTop - clientHeight > 80;
    setShowScrollBottom(isFarFromBottom);
  };

  useEffect(() => {
    scrollToBottom(true);
  }, [messages, open, loading, thinkingPhase, attachedFiles]);

  // Adapter automatiquement la taille de la bulle AI selon le nombre de fenetres actives (0 -> grand, 1 -> moyen, 2+ -> compact)
  useEffect(() => {
    if (activeWindowsCount === 0) {
      setPillSize("expanded");
    } else if (activeWindowsCount === 1) {
      setPillSize("normal");
    } else {
      setPillSize("compact");
    }
  }, [activeWindowsCount]);

  useEffect(() => {
    const handleOpenAi = () => {
      setOpen(true);
      window.dispatchEvent(new CustomEvent("nexus:ai-active", { detail: { active: true } }));
    };
    const handleAiQuery = (e: CustomEvent) => {
      const q = e.detail?.query;
      setOpen(true);
      window.dispatchEvent(new CustomEvent("nexus:ai-active", { detail: { active: true } }));
      if (q) {
        setTimeout(() => {
          handleSend(undefined, q);
        }, 100);
      }
    };

    window.addEventListener("nexus:open-ai", handleOpenAi as EventListener);
    window.addEventListener("nexus:ai-query", handleAiQuery as EventListener);
    return () => {
      window.removeEventListener("nexus:open-ai", handleOpenAi as EventListener);
      window.removeEventListener("nexus:ai-query", handleAiQuery as EventListener);
    };
  }, []);

  const handleToggle = () => {
    const nextState = !open;
    setOpen(nextState);
    window.dispatchEvent(new CustomEvent("nexus:ai-active", { detail: { active: nextState } }));
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setOpen(true);
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const textContent = (e.target?.result as string) || "";
        setAttachedFiles((prev) => [
          ...prev,
          {
            id: `file-${Date.now()}-${Math.random()}`,
            name: file.name,
            type: file.type || "file",
            content: textContent,
          },
        ]);
      };
      if (file.type.startsWith("image/")) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const removeAttachment = (id: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  async function handleSend(e?: React.FormEvent, customText?: string) {
    if (e) e.preventDefault();
    const rawText = (customText || input).trim();
    if ((!rawText && attachedFiles.length === 0) || loading) return;

    if (!customText) setInput("");
    
    // Format message text with file contexts if present
    let fullQuery = rawText;
    if (attachedFiles.length > 0) {
      const filesSummary = attachedFiles
        .map((f) => `--- Fichier joint: ${f.name} ---\n${f.content.slice(0, 3000)}`)
        .join("\n\n");
      fullQuery = `${rawText}\n\n[Contenu des fichiers joints]:\n${filesSummary}`;
    }

    const fileAttachmentsList = attachedFiles.map((f) => ({ name: f.name, type: f.type }));
    setAttachedFiles([]);

    const userMsgId = `usr-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: "user", text: rawText || "Analyse des fichiers joints", attachments: fileAttachmentsList },
    ]);
    
    setLoading(true);
    setThinkingPhase(true);

    window.dispatchEvent(new CustomEvent("nexus:ai-active", { detail: { active: true, thinking: true } }));

    // System Execution & Active Control Engine
    const lower = fullQuery.toLowerCase();
    let overrideSystemReply: string | null = null;

    // Is this an explicit navigation or system command to open a specific OS app?
    // We strictly check for explicit system app intent to avoid false triggers on general AI prompts.
    const isExplicitSystemCommand =
      (lower.startsWith("ouvre l'app") ||
       lower.startsWith("lance l'app") ||
       lower.startsWith("ouvre le terminal") ||
       lower.startsWith("lance le terminal") ||
       lower.startsWith("ouvre le bac à sable") ||
       lower.startsWith("lance le bac à sable") ||
       lower.startsWith("ouvre les réglages") ||
       lower.startsWith("ouvre les paramètres") ||
       lower.startsWith("ouvre les parametres") ||
       lower.startsWith("lance le jeu") ||
       lower.startsWith("ouvre le jeu") ||
       lower.startsWith("lance la musique") ||
       lower.startsWith("joue la musique") ||
       lower.startsWith("mets la musique") ||
       lower.startsWith("change le fond")) &&
      !lower.includes("rôle") &&
      !lower.includes("role") &&
      !lower.includes("exemple") &&
      !lower.includes("explication") &&
      !lower.includes("rédaction");

    // 1. MUSIC & SINGER CONTROL (explicit play or music request)
    if (
      isExplicitSystemCommand &&
      (lower.includes("musique") || lower.includes("chanson") || lower.includes("chanteur") || lower.includes("joue") || lower.includes("écoute") || lower.includes("radio"))
    ) {
      openApp("focus", { width: 480, height: 520 });

      let songToPlay = "";
      if (lower.includes("pif") || lower.includes("au hasard") || lower.includes("aléatoire") || lower.includes("un chanteur")) {
        const randomHits = [
          "Daft Punk - One More Time",
          "The Weeknd - Blinding Lights",
          "Lofi Hip Hop Radio Beats",
          "Coldplay - Viva La Vida",
          "Imagine Dragons - Radioactive",
          "Jul - Tchip",
          "Michael Jackson - Billie Jean",
          "Gorillaz - Feel Good Inc",
          "Kavinsky - Nightcall",
          "Daft Punk - Get Lucky"
        ];
        songToPlay = randomHits[Math.floor(Math.random() * randomHits.length)];
      } else {
        const match = fullQuery.match(/(?:joue|écoute|écouter|lance|mets?|chanteur|chanson|titre|musique)\s+(?:de\s+|sur\s+|du\s+|un\s+)?([^.?!]+)/i);
        songToPlay = match ? match[1].trim() : "Daft Punk - One More Time";
      }

      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("nexus:play-music", { detail: { query: songToPlay } }));
      }, 150);

      overrideSystemReply = `🎵 **Système Nexus : Commande Exécutée !**\n\nJ'ai ouvert l'application **Musique & Concentration** et lancé la lecture de **"${songToPlay}"** ! 🎧`;
    }
    // 2. EXPLICIT TERMINAL OPENING
    else if (isExplicitSystemCommand && (lower.includes("terminal") || lower.includes("console") || lower.includes("bash") || lower.includes("cmd"))) {
      openApp("terminal", { width: 620, height: 440 });
      overrideSystemReply = `💻 **Système Nexus : Terminal CLI Ouvert !**\n\nVotre terminal virtuel interactif est prêt. Vous pouvez y exécuter des commandes comme \`help\`, \`matrix\`, \`clear\`, \`date\`, ou \`calc\`.`;
    }
    // 3. EXPLICIT PLAYGROUND OPENING
    else if (isExplicitSystemCommand && (lower.includes("bac à sable") || lower.includes("playground"))) {
      openApp("playground", { width: 780, height: 560 });
      overrideSystemReply = `⚡ **Système Nexus : Bac à Sable Ouvert !**\n\nVotre studio de test web interactif est prêt. Vous pouvez y exécuter ou tester du code HTML/JS/CSS en direct.`;
    }
    // 4. EXPLICIT SETTINGS OPENING
    else if (isExplicitSystemCommand && (lower.includes("paramètre") || lower.includes("reglage") || lower.includes("réglage") || lower.includes("police") || lower.includes("font") || lower.includes("fond d'écran"))) {
      openApp("settings", { width: 420, height: 480 });
      overrideSystemReply = `⚙️ **Système Nexus : Personnalisation Ouverte !**\n\nJ'ai ouvert l'espace **Réglages**. Vous pouvez y choisir votre police d'écran tech et vos préférences.`;
    }
    // 4b. CLOUD & GOOGLE ACCOUNT OPENING
    else if (lower.includes("cloud") || lower.includes("google drive") || lower.includes("google account") || lower.includes("compte google") || lower.includes("sauvegarde cloud")) {
      openApp("cloud", { width: 780, height: 580 });
      overrideSystemReply = `☁️ **Nexus Cloud & Compte Google !**\n\nL'application **Nexus Cloud** est ouverte. Vous pouvez y gérer votre compte Google, vos fichiers et sauvegarder votre système.`;
    }
    // 4c. MESSAGING OPENING
    else if (lower.includes("messagerie") || lower.includes("message") || lower.includes("tchat") || lower.includes("discussion")) {
      openApp("messages", { width: 820, height: 580 });
      overrideSystemReply = `💬 **Messagerie Instantanée Nexus !**\n\nL'application **Messagerie** est lancée. Discutez en direct avec l'équipe et choisissez à qui parler.`;
    }
    // 4d. MAIL OPENING
    else if (lower.includes("mail") || lower.includes("e-mail") || lower.includes("email") || lower.includes("gmail") || lower.includes("boite mail")) {
      openApp("mail", { width: 840, height: 600 });
      overrideSystemReply = `📧 **Boîte Mail Nexus & Google Gmail !**\n\nVotre client **Nexus Mail** est ouvert. Consultez votre boîte de réception, vos pièces jointes Cloud et envoyez des messages.`;
    }
    // 5. EXPLICIT GAMES OPENING
    else if (isExplicitSystemCommand && (lower.includes("jeu") || lower.includes("échec") || lower.includes("arcade"))) {
      openApp("game", { width: 760, height: 620 });
      overrideSystemReply = `🎮 **Système Nexus : Espace Arcade Lancé !**\n\nL'application de jeu est ouverte !`;
    }
    // 6. CREATION DE RAPPEL & TÂCHE
    else if (
      lower.includes("rappel") ||
      lower.includes("rappelle") ||
      lower.includes("ajoute une tâche") ||
      lower.includes("ajoute une tache") ||
      lower.includes("ajoute la tâche") ||
      lower.includes("ajoute la tache") ||
      lower.includes("n'oublie pas de")
    ) {
      let timeText = "";
      const timeMatch = fullQuery.match(/(?:à|pour|vers|demain à)\s+(\d{1,2}(?:h|:\d{2}|h\d{2})|\d{1,2}\s*heures?)/i);
      if (timeMatch) {
        timeText = timeMatch[0].trim();
      }

      let taskText = fullQuery
        .replace(/^.*?(?:rappelle[- ]moi(?: de| d'| que)?|rappel(?: pour| de| d')?|mets? un rappel(?: pour| de| d')?|ajoute (?:un rappel|une tâche|une tache)(?: de| d'| pour)?|n'oublie pas de me rappeler(?: de| d')?)\s+/i, "")
        .replace(/[.!?]+$/, "")
        .trim();

      if (!taskText || taskText.length < 2) {
        taskText = fullQuery;
      }
      taskText = taskText.charAt(0).toUpperCase() + taskText.slice(1);

      addNexusTask(taskText, timeText || undefined);
      openApp("tasks", { width: 520, height: 500 });

      overrideSystemReply = `⏰ **Rappel Enregistré dans l'Application Tâches & Rappels !**\n\nJ'ai créé votre rappel avec succès dans l'application **Tâches & Rappels** et sur votre widget de bureau.\n\n- **Contenu du rappel :** ${taskText}\n${timeText ? `- **Horaire spécifié :** ${timeText}\n` : ""}- **Statut :** Enregistré et Actif\n\n*L'application Tâches a été ouverte automatiquement pour vous permettre de le consulter !*`;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
    setThinkingPhase(false);

    try {
      let reply = "";
      let modelUsed = "Moteur Local Nexus";
      if (overrideSystemReply) {
        reply = overrideSystemReply;
        modelUsed = "Système Nexus";
      } else {
        const aiRes = await queryNexusAIObject(fullQuery, messages);
        reply = aiRes.reply;
        modelUsed = aiRes.modelUsed;
      }

      const assistantMsgId = `ast-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          role: "assistant",
          text: reply,
          modelUsed,
          isStreaming: true,
        },
      ]);
    } catch (err) {
      console.warn("Using Nexus AI client brain fallback:", err);
      const fallbackReply = overrideSystemReply || generateNexusResponse(fullQuery, messages);
      const assistantMsgId = `ast-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          role: "assistant",
          text: fallbackReply,
          modelUsed: "Moteur Local Nexus",
          isStreaming: true,
        },
      ]);
    } finally {
      setLoading(false);
      window.dispatchEvent(new CustomEvent("nexus:ai-active", { detail: { active: true, thinking: false } }));
    }
  }

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        multiple
        accept="image/*,.pdf,.doc,.docx,.txt,.js,.ts,.tsx,.json,.html,.css"
        onChange={(e) => handleFileSelect(e.target.files)}
      />

      {/* AI Panel Chat Drawer */}
      <AnimatePresence>
        {open && (
          <div
            className={`fixed select-none font-sans z-[99990] ${
              isDocked
                ? "top-11 bottom-0 right-0 left-0 sm:left-auto w-full sm:w-[420px] max-w-full"
                : "bottom-14 sm:bottom-16 right-2 sm:right-6 left-2 sm:left-auto flex flex-col items-end pointer-events-auto"
            }`}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.15, scaleY: 0.2, y: isDocked ? 0 : 80, x: isDocked ? 120 : 20, filter: "blur(12px)" }}
              animate={{ opacity: 1, scale: 1, scaleY: 1, y: 0, x: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.15, scaleY: 0.2, y: isDocked ? 0 : 80, x: isDocked ? 120 : 20, filter: "blur(12px)" }}
              transition={{ type: "spring", stiffness: 360, damping: 25, mass: 0.8 }}
              style={{ transformOrigin: "bottom right" }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`bg-nexus-panel text-nexus-text backdrop-blur-3xl border border-nexus-border p-3 sm:p-4 shadow-[0_0_60px_rgba(56,189,248,0.25)] flex flex-col justify-between relative overflow-hidden transition-all duration-300 ${
                isDocked
                  ? "h-full w-full rounded-none sm:rounded-l-3xl border-y-0 border-r-0 sm:border-l"
                  : "mb-2 sm:mb-3 w-full sm:w-[420px] h-[calc(100vh-80px)] sm:h-[520px] rounded-2xl sm:rounded-3xl"
              }`}
            >
              {/* Apple Intelligence Glowing Edge Line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 via-purple-500 via-cyan-400 to-indigo-500 animate-pulse" />

            {/* Drag & Drop Highlight Overlay */}
            {isDragging && (
              <div className="absolute inset-0 z-50 bg-cyan-950/90 border-2 border-dashed border-cyan-400 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                <Paperclip className="w-10 h-10 text-cyan-300 mb-2 animate-bounce" />
                <p className="text-sm font-bold text-white">Déposez vos fichiers ici</p>
                <p className="text-xs text-cyan-200 mt-1">Analyse automatique par Nexus AI Pro</p>
              </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between border-b border-nexus-border pb-3 pt-1">
              <div className="flex items-center gap-2.5">
                <div className="relative flex items-center justify-center h-7 w-7 rounded-full bg-gradient-to-tr from-cyan-500 via-purple-500 to-pink-500 p-0.5 shadow-md">
                  <div className="h-full w-full rounded-full bg-nexus-panel flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-nexus-text tracking-wide flex items-center gap-1.5">
                    Nexus AI Pro
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      Nexus Intelligence
                    </span>
                  </h3>
                  <p className="text-[10px] text-nexus-muted">Assistant intelligent & Fichiers</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* Toggle Dock / Side Panel Mode Button */}
                <button
                  onClick={() => setIsDocked(!isDocked)}
                  title={isDocked ? "Détacher en bulle flottante" : "Ancrer sur le côté de l'écran"}
                  className="p-1.5 rounded-full text-slate-400 hover:text-cyan-300 hover:bg-white/10 transition-colors flex items-center gap-1 text-[10px]"
                >
                  {isDocked ? <PanelRightOpen className="w-4 h-4" /> : <PanelRightClose className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleToggle}
                  className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="relative flex-1 min-h-0 flex flex-col">
              <div
                ref={messagesContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto my-2 space-y-3.5 pr-1 text-xs [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.2)_transparent]"
              >
                {messages.map((m, idx) => {
                  const isLatestAssistant = m.role === "assistant" && idx === messages.length - 1 && m.isStreaming;

                  return (
                    <motion.div
                      key={m.id || idx}
                      initial={{ opacity: 0, y: 10, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 28 }}
                      className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[88%] rounded-2xl p-3.5 shadow-md ${
                          m.role === "user"
                            ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-br-none font-medium shadow-cyan-600/20"
                            : "bg-slate-900/90 text-slate-100 border border-white/10 rounded-bl-none shadow-black/40"
                        }`}
                      >
                        {/* Attached file badges in user message */}
                        {m.attachments && m.attachments.length > 0 && (
                          <div className="mb-2 flex flex-wrap gap-1">
                            {m.attachments.map((att, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-black/40 border border-white/20 text-[10px] font-mono text-cyan-200"
                              >
                                <FileText className="w-3 h-3 text-cyan-300" />
                                <span className="truncate max-w-[120px]">{att.name}</span>
                              </span>
                            ))}
                          </div>
                        )}

                        {m.role === "user" ? (
                          <div className="text-xs leading-relaxed whitespace-pre-wrap font-medium">{m.text}</div>
                        ) : (
                          <>
                            <WordByWordText text={m.text} isNew={isLatestAssistant} />
                            {m.modelUsed && (
                              <div className="mt-2.5 pt-1.5 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400">
                                <span className="inline-flex items-center gap-1 font-mono">
                                  <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
                                  <span className={m.modelUsed.includes("3.6") ? "text-cyan-300 font-semibold" : "text-amber-300 font-semibold"}>
                                    {m.modelUsed}
                                  </span>
                                </span>
                                {m.modelUsed.includes("3.6") ? (
                                  <span className="text-[9px] bg-cyan-500/10 text-cyan-300 px-1.5 py-0.2 rounded border border-cyan-500/20 font-mono">
                                    Flagship
                                  </span>
                                ) : m.modelUsed.includes("Local") ? (
                                  <span className="text-[9px] bg-emerald-500/10 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-500/20 font-mono">
                                    Offline
                                  </span>
                                ) : (
                                  <span className="text-[9px] bg-amber-500/10 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/20 font-mono">
                                    Quota Fallback
                                  </span>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </motion.div>
                  );
                })}

                {/* Reflection / Thinking Animation Phase */}
                {loading && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                  >
                    <div className="rounded-2xl bg-slate-900/90 border border-cyan-500/30 p-3.5 text-slate-200 text-xs flex items-center gap-3 shadow-lg">
                      <div className="relative flex items-center justify-center">
                        <span className="absolute h-6 w-6 rounded-full bg-cyan-400/30 animate-ping" />
                        <span className="relative h-3 w-3 rounded-full bg-gradient-to-r from-pink-500 to-cyan-400 animate-spin" />
                      </div>
                      <span className="text-[11px] font-medium text-cyan-200">
                        {thinkingPhase ? "Analyse contextuelle & Fichiers..." : "Recherche Web & Rédaction..."}
                      </span>
                    </div>
                  </motion.div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Floating Ultra-Sleek Scroll-to-Bottom Button */}
              <AnimatePresence>
                {showScrollBottom && (
                  <motion.button
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.9 }}
                    onClick={() => scrollToBottom(true)}
                    className="absolute bottom-3 right-3 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/95 border border-cyan-500/40 text-cyan-300 text-[11px] font-semibold shadow-2xl backdrop-blur-md hover:bg-cyan-950 hover:border-cyan-400 hover:text-white transition-all active:scale-95 group"
                    title="Défiler tout en bas de la conversation"
                  >
                    <span>En bas</span>
                    <ArrowDown className="w-3.5 h-3.5 text-cyan-400 group-hover:translate-y-0.5 transition-transform" />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* Attached File Chips Bar */}
            {attachedFiles.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto py-1.5 px-2 bg-slate-900/80 rounded-xl border border-white/10 mb-2">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Joints:</span>
                {attachedFiles.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-cyan-950/80 border border-cyan-500/30 text-[10px] text-cyan-200 shrink-0"
                  >
                    <FileText className="w-3 h-3 text-cyan-400" />
                    <span className="max-w-[100px] truncate font-mono">{f.name}</span>
                    <button
                      onClick={() => removeAttachment(f.id)}
                      className="p-0.5 rounded hover:bg-cyan-900 text-slate-400 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Suggestions Chips */}
            <div className="flex gap-1.5 overflow-x-auto py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                onClick={() => handleSend(undefined, "!apikey")}
                className="whitespace-nowrap rounded-xl bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 text-[10px] text-amber-200 hover:bg-amber-500/25 transition-all font-semibold flex items-center gap-1 shrink-0"
              >
                <Key className="w-3 h-3 text-amber-300" />
                <span>🔑 Guide Clé API (Gratuit)</span>
              </button>
              <button
                onClick={() => handleSend(undefined, "Qui t'a créé ?")}
                className="whitespace-nowrap rounded-xl bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 text-[10px] text-cyan-200 hover:bg-cyan-500/20 transition-all font-semibold flex items-center gap-1 shrink-0"
              >
                <Wand2 className="w-3 h-3 text-cyan-300" />
                <span>Créateur & Idée</span>
              </button>
              <button
                onClick={() => handleSend(undefined, "Aide-moi pour un devoir de maths / résolution d'équation.")}
                className="whitespace-nowrap rounded-xl bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 text-[10px] text-purple-200 hover:bg-purple-500/20 transition-all font-semibold flex items-center gap-1 shrink-0"
              >
                <Calculator className="w-3 h-3 text-purple-300" />
                <span>Maths & Devoirs</span>
              </button>
              <button
                onClick={() => handleSend(undefined, "Explique-moi les failles de sécurité Web courantes.")}
                className="whitespace-nowrap rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[10px] text-emerald-200 hover:bg-emerald-500/20 transition-all font-semibold flex items-center gap-1 shrink-0"
              >
                <ShieldCheck className="w-3 h-3 text-emerald-300" />
                <span>Cyber-Sécurité</span>
              </button>
              <button
                onClick={() => handleSend(undefined, "Donne-moi un plan de dissertation de Français.")}
                className="whitespace-nowrap rounded-xl bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] text-slate-300 hover:bg-white/15 transition-all flex items-center gap-1 shrink-0"
              >
                <BookOpen className="w-3 h-3 text-amber-300" />
                <span>Français & Plan</span>
              </button>
            </div>

            {/* Integrated Input Bar */}
            <form onSubmit={(e) => handleSend(e)} className="pt-2 border-t border-white/10">
              <div className="flex items-center gap-1.5 rounded-2xl border border-white/15 bg-black/60 px-2 py-1.5 focus-within:border-cyan-400/80 focus-within:ring-1 focus-within:ring-cyan-400/40 transition-all">
                {/* Plus button inside the input bar */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Ajouter une photo ou un fichier"
                  className="p-1.5 rounded-xl text-slate-400 hover:text-cyan-300 hover:bg-white/10 transition-colors shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </button>

                {/* Text input */}
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Posez une question ou ajoutez une photo..."
                  className="flex-1 bg-transparent px-1 py-1 text-xs text-white placeholder-slate-400 focus:outline-none border-none"
                />

                {/* Paper plane Send button inside the input bar */}
                <button
                  type="submit"
                  disabled={loading || (!input.trim() && attachedFiles.length === 0)}
                  title="Envoyer le message"
                  className="p-1.5 rounded-xl text-cyan-400 hover:text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-25 disabled:hover:bg-transparent transition-all shrink-0 active:scale-90"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    {/* Floating Trigger Pill - Fully Draggable with Magnetic Side Snapping & No Overshoot */}
    {!isDocked && (
      <motion.div
        drag
        animate={pillControls}
        dragMomentum={false}
        dragElastic={0}
        dragConstraints={{
          left: -((typeof window !== "undefined" ? window.innerWidth : 1000) - 120),
          right: 10,
          top: -((typeof window !== "undefined" ? window.innerHeight : 800) - 120),
          bottom: 10,
        }}
        onDragEnd={(_event, info) => {
          const screenW = typeof window !== "undefined" ? window.innerWidth : 1000;
          const pointX = info.point?.x ?? screenW;
          const offsetX = info.offset?.x ?? 0;

          // Snap cleanly to left or right edge so it never stays awkwardly in the middle
          if (pointX < screenW / 2 || offsetX < -(screenW / 2.5)) {
            pillControls.start({
              x: -(screenW - 140),
              transition: { type: "spring", stiffness: 450, damping: 30 },
            });
          } else {
            pillControls.start({
              x: 0,
              transition: { type: "spring", stiffness: 450, damping: 30 },
            });
          }
        }}
        whileDrag={{ scale: 1.06, boxShadow: "0 20px 50px rgba(56,189,248,0.5)" }}
        whileHover={{ scale: 1.03 }}
        className="fixed bottom-14 sm:bottom-16 right-3 sm:right-6 z-[999999] touch-none cursor-grab active:cursor-grabbing select-none"
      >
        <div className="flex items-center gap-1 p-1 rounded-full bg-slate-950/95 border border-cyan-400/50 backdrop-blur-3xl shadow-[0_10px_40px_rgba(56,189,248,0.35)] hover:border-cyan-300 transition-colors group">
          {/* Stage 0: Compact Orb mode */}
          {pillSize === "compact" ? (
            <motion.div
              onTap={() => handleToggle()}
              className="relative flex items-center justify-center h-10 w-10 rounded-full bg-slate-900 border border-cyan-400/40 p-1 cursor-pointer group-hover:scale-110 transition-transform"
              title="Nexus IA Pro — Cliquer pour ouvrir"
            >
              <span className="absolute inset-0 rounded-full bg-cyan-400/20 animate-ping" />
              <Sparkles className="w-5 h-5 text-cyan-300 relative z-10" />
            </motion.div>
          ) : pillSize === "normal" ? (
            /* Stage 1: Standard Pill mode */
            <motion.div
              onTap={() => handleToggle()}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-xs font-bold cursor-pointer"
            >
              <div className="relative flex items-center justify-center h-3 w-3">
                <span className="absolute h-full w-full rounded-full bg-cyan-400 animate-ping opacity-75" />
                <span className="relative h-2.5 w-2.5 rounded-full bg-gradient-to-tr from-pink-500 via-purple-500 to-cyan-400" />
              </div>
              <span className="tracking-tight text-white font-extrabold text-xs">Nexus IA Pro</span>
              <span className="shrink-0 text-[10px] text-cyan-300 bg-cyan-500/20 px-2 py-0.5 rounded-full font-semibold border border-cyan-500/30">
                {open ? "Fermer" : "Lancer"}
              </span>
            </motion.div>
          ) : (
            /* Stage 2: Expanded Pro mode with quick actions in pill */
            <div className="flex items-center gap-1 px-2 py-1 text-xs">
              <motion.div
                onTap={() => handleToggle()}
                className="flex items-center gap-2 px-2 py-1 rounded-full text-white font-bold hover:bg-white/10 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-cyan-300 animate-pulse" />
                <span className="tracking-tight text-white font-extrabold text-xs">Nexus IA</span>
              </motion.div>
              <div className="h-4 w-px bg-white/20" />
              <motion.div
                onTap={() => fileInputRef.current?.click()}
                className="px-2 py-0.5 rounded-lg text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 font-semibold cursor-pointer"
              >
                + Fichier
              </motion.div>
              <motion.div
                onTap={() => handleSend(undefined, "!apikey")}
                className="px-2 py-0.5 rounded-lg text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 font-semibold cursor-pointer"
              >
                🔑 Clé API
              </motion.div>
            </div>
          )}

          {/* Sizing Switcher Button (cycles compact -> normal -> expanded) */}
          <motion.div
            onTap={(e) => {
              e.stopPropagation();
              setPillSize((prev) => (prev === "compact" ? "normal" : prev === "normal" ? "expanded" : "compact"));
            }}
            title="Ajuster la taille du bouton (3 modes)"
            className="p-1 rounded-full text-slate-400 hover:text-cyan-300 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
          </motion.div>
        </div>
      </motion.div>
    )}
  </>
);
}

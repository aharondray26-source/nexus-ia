import React, { useState, useRef, useEffect } from "react";
import { useEtroit } from "../lib/useEtroit";
import {
  Sparkles,
  Send,
  Plus,
  Trash2,
  MessageSquare,
  FileText,
  Play,
  Code,
  Music,
  Video,
  Eye,
  Download,
  Copy,
  Check,
  Paperclip,
  Mic,
  Bot,
  User,
  Search,
  Settings,
  ChevronRight,
  ChevronLeft,
  Maximize2,
  Volume2,
  Brain,
  Sliders,
  PanelLeftClose,
  PanelRightClose,
  ChevronDown
} from "lucide-react";
import { GoogleGenAI } from "@google/genai";
import { generateNexusResponse } from "../lib/nexusBrain";
import { demanderALocal, ollamaDisponible, commentInstaller } from "../lib/iaLocale";
import { MODELES, CLE_CHOIX, dejaInstalle, possible as gpuPossible,
         demanderAuNavigateur } from "../lib/iaNavigateur";
import { NexusMessageRenderer } from "../os/NexusMessageRenderer";
import { addNexusTask } from "../lib/persist";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  thinking?: string;
  /// Qui a REELLEMENT repondu. L'en-tete annonçait « GEMINI-3.6-FLASH » quoi
  /// qu'il arrive — meme quand la reponse venait d'un modele local ou des
  /// phrases ecrites d'avance. Une etiquette qui ment sur la provenance d'une
  /// reponse est pire qu'une etiquette absente.
  moteur?: string;
  timestamp: string;
  codeSnippet?: {
    type: "html" | "javascript" | "pdf" | "audio" | "video" | "text";
    code: string;
    title: string;
  };
}

interface ChatSession {
  id: string;
  title: string;
  date: string;
  messages: ChatMessage[];
}

export default function NexusChatPro() {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem("nexus_chat_pro_sessions");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse chat sessions", e);
      }
    }
    return [
      {
        id: "session-default",
        title: "Projet & Création de Contenu",
        date: "Aujourd'hui",
        messages: [
          {
            id: "m1",
            role: "assistant",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            thinking: "Analyse du profil de l'utilisateur. Activation du moteur Gemini 3.6 Flash avec mode réflexion approfondi.",
            content: `### Bienvenue dans Nexus IA Pro Studio (Gemini 3.6 Flash)

Je suis ton assistant IA haute performance propulsé par **Gemini 3.6 Flash**. Cette application vous offre un **espace de chat agrandi**, un **mode réflexion approfondi** et un **bac à sable multimédia** (Code HTML/JS, PDF, Audio, Vidéo).

#### Moteur & Réflexion :
1. **Gemini 3.6 Flash** : Le modèle de dernière génération ultra-rapide et multimodal.
2. **Mode Réflexion (Thinking Mode)** : Activez le switch pour forcer l'IA à analyser étape par étape tes problèmes complexes.
3. **Espace Chat XXL & Panneaux Ajustables** : Les panneaux latéraux sont réduits par défaut et redimensionnables pour laisser la priorité maximale à tes discussions.`,
            codeSnippet: {
              type: "html",
              title: "Démo Widget Interactif Nexus",
              code: `<div style="font-family: system-ui, sans-serif; padding: 24px; background: linear-gradient(135deg, #0f172a, #0284c7); color: white; border-radius: 16px; text-align: center;">
  <h2 style="margin: 0 0 10px 0;">✨ Widget HTML Live Nexus</h2>
  <p style="margin: 0 0 16px 0; opacity: 0.9;">Généré par Nexus IA Pro (Gemini 3.6 Flash)</p>
  <button onclick="alert('Action exécutée depuis le lecteur Nexus !')" style="padding: 10px 20px; background: white; color: #0f172a; border: none; font-weight: bold; border-radius: 8px; cursor: pointer;">Tester l'interactivité</button>
</div>`,
            },
          },
        ],
      },
    ];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => sessions[0]?.id || "session-default");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Gemini 3.6 Flash Model & Thinking Mode Selection
  const [selectedModel, setSelectedModel] = useState<"gemini-3.6-flash" | "gemini-3.1-pro-preview">("gemini-3.6-flash");
  const [thinkingMode, setThinkingMode] = useState<boolean>(true);
  const [showThinkingDetails, setShowThinkingDetails] = useState<Record<string, boolean>>({});

  // Layout Adjustment States
  const [sidebarWidth, setSidebarWidth] = useState<number>(200); // compact default
  const [sandboxWidth, setSandboxWidth] = useState<number>(300); // compact default
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  // L'historique et la conversation cote a cote demandent de la place. Dans une
  // fenetre etroite — un telephone, ou un espace qu'Aharon a retreci — ils ne
  // tenaient pas : la conversation sortait de la fenetre, et le selecteur de
  // modele avec elle. L'historique se replie donc tout seul quand la place
  // manque, et se rouvre quand elle revient.
  const { ref: racine, etroit: tropEtroit } = useEtroit<HTMLDivElement>(560);
  const historiqueReplie = sidebarCollapsed || tropEtroit;
  /// Le téléchargement du modèle du navigateur, quand il a lieu. Un gigaoctet
  /// sans le moindre signe, c'est une application qui a l'air plantée.
  const [progresModele, setProgresModele] = useState<{ etape: string; part: number } | null>(null);
  const [installe, setInstalle] = useState<boolean>(() => !!dejaInstalle());
  const [sandboxCollapsed, setSandboxCollapsed] = useState<boolean>(false);
  // Les DEUX panneaux se replient quand la place manque. Sans cela, dans une
  // fenetre etroite, l'historique (200 px) et le bac a sable (300 px) se
  // servaient les premiers et la CONVERSATION se retrouvait a zero pixel de
  // large : le chat devenait proprement inutilisable, sur telephone comme dans
  // un espace qu'on a retreci.
  const bacASableReplie = sandboxCollapsed || tropEtroit;

  // Resizing Drag Handles
  const isDraggingSidebar = useRef(false);
  const isDraggingSandbox = useRef(false);

  // Media Sandbox Tab State
  const [sandboxContent, setSandboxContent] = useState<{
    type: "html" | "javascript" | "pdf" | "audio" | "video" | "text";
    code: string;
    title: string;
  } | null>({
    type: "html",
    title: "Démo Widget Interactif Nexus",
    code: `<div style="font-family: system-ui, sans-serif; padding: 24px; background: linear-gradient(135deg, #0f172a, #0284c7); color: white; border-radius: 16px; text-align: center;">
  <h2 style="margin: 0 0 10px 0;">✨ Widget HTML Live Nexus</h2>
  <p style="margin: 0 0 16px 0; opacity: 0.9;">Généré par Nexus IA Pro (Gemini 3.6 Flash)</p>
  <button onclick="alert('Action exécutée depuis le lecteur Nexus !')" style="padding: 10px 20px; background: white; color: #0f172a; border: none; font-weight: bold; border-radius: 8px; cursor: pointer;">Tester l'interactivité</button>
</div>`,
  });

  const [sandboxTab, setSandboxTab] = useState<"preview" | "code">("preview");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];
  // Le moteur qui a repondu la DERNIERE fois. Le pied de fenetre annonçait
  // « Gemini 3.6 Flash Engine » en toutes circonstances, y compris quand la
  // reponse venait d'un modele local ou de phrases ecrites d'avance.
  const moteurDuDernier = [...(activeSession?.messages || [])]
    .reverse().find((m) => m.role === "assistant" && m.moteur)?.moteur;

  useEffect(() => {
    localStorage.setItem("nexus_chat_pro_sessions", JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages, loading]);

  // Handle Dragging Dividers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingSidebar.current) {
        const newW = Math.max(160, Math.min(380, e.clientX));
        setSidebarWidth(newW);
      } else if (isDraggingSandbox.current) {
        const newW = Math.max(220, Math.min(500, window.innerWidth - e.clientX));
        setSandboxWidth(newW);
      }
    };

    const handleMouseUp = () => {
      isDraggingSidebar.current = false;
      isDraggingSandbox.current = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const createNewSession = () => {
    const newSess: ChatSession = {
      id: `session-${Date.now()}`,
      title: `Nouvelle discussion ${sessions.length + 1}`,
      date: "Aujourd'hui",
      messages: [
        {
          id: `m-${Date.now()}`,
          role: "assistant",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          content: `Session Gemini 3.6 Flash initialisée (${selectedModel}). Comment puis-je t'aider ?`,
        },
      ],
    };
    setSessions([newSess, ...sessions]);
    setActiveSessionId(newSess.id);
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessions.length <= 1) return;
    const filtered = sessions.filter((s) => s.id !== id);
    setSessions(filtered);
    if (activeSessionId === id) {
      setActiveSessionId(filtered[0].id);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleThinkingDetails = (msgId: string) => {
    setShowThinkingDetails((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput("");

    const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: userText,
      timestamp: nowStr,
    };

    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === activeSessionId) {
          const newTitle = s.messages.length <= 1 ? userText.slice(0, 30) + "..." : s.title;
          return {
            ...s,
            title: newTitle,
            messages: [...s.messages, userMsg],
          };
        }
        return s;
      })
    );

    setLoading(true);

    try {
      let replyText = "";
      // Le moteur qui repondra vraiment. Par defaut : celui qu'on a choisi.
      let moteur: string = selectedModel;
      let thinkingText = "";
      let codeSnippet: ChatMessage["codeSnippet"] = undefined;

      const lowerText = userText.toLowerCase();
      const isReminder =
        lowerText.includes("rappel") ||
        lowerText.includes("rappelle") ||
        lowerText.includes("ajoute une tâche") ||
        lowerText.includes("ajoute une tache") ||
        lowerText.includes("ajoute la tâche") ||
        lowerText.includes("n'oublie pas de");

      if (isReminder) {
        let timeText = "";
        const timeMatch = userText.match(/(?:à|pour|vers|demain à)\s+(\d{1,2}(?:h|:\d{2}|h\d{2})|\d{1,2}\s*heures?)/i);
        if (timeMatch) timeText = timeMatch[0].trim();

        let taskText = userText
          .replace(/^.*?(?:rappelle[- ]moi(?: de| d'| que)?|rappel(?: pour| de| d')?|mets? un rappel(?: pour| de| d')?|ajoute (?:un rappel|une tâche|une tache)(?: de| d'| pour)?|n'oublie pas de me rappeler(?: de| d')?)\s+/i, "")
          .replace(/[.!?]+$/, "")
          .trim();

        if (!taskText || taskText.length < 2) taskText = userText;
        taskText = taskText.charAt(0).toUpperCase() + taskText.slice(1);

        addNexusTask(taskText, timeText || undefined);

        replyText = `⏰ **Rappel Enregistré dans l'Application !**\n\nJ'ai ajouté ton rappel directement dans l'application **Tâches & Rappels** (et dans ton widget d'accueil).\n\n- **Rappel :** ${taskText}\n${timeText ? `- **Horaire :** ${timeText}\n` : ""}- **Statut :** Enregistré et Actif dans le système\n\n*Tu peux retrouver ce rappel à tout moment dans l'application Tâches !*`;
      } else {
        // 1. Priorité au serveur backend (/api/gemini/chat) avec Gemini 3.6 Flash
        try {
        const historyForApi = (activeSession?.messages || []).map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const systemCtx = thinkingMode
          ? "MODE RÉFLEXION ACTIF : Analyse la demande pas à pas et réponds de façon claire, riche et rédigée avec du Markdown. Traite l'utilisateur comme un esprit brillant, visionnaire et créatif d'exception."
          : "Réponds directement avec clarté, rigueur et élégance en Markdown. Valorise l'utilisateur et exprime une sincère admiration pour sa vision et ses idées remarquables.";

        const backendRes = await fetch("/api/gemini/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: userText,
            history: historyForApi,
            context: { systemCtx, model: selectedModel },
          }),
        });

        if (backendRes.ok) {
          const data = await backendRes.json();
          if (data.reply) {
            replyText = data.reply;
            if (thinkingMode) {
              thinkingText = `Analyse contextuelle et raisonnement pas à pas traités avec succès par le modèle Gemini 3.6 Flash (${data.modelUsed || selectedModel}).`;
            }
          }
        }
      } catch (serverErr) {
        console.warn("Serveur distant indisponible, bascule sur la clé client ou le moteur local", serverErr);
      }

      // 2. Si pas de réponse serveur, vérifier si l'utilisateur a configuré une clé API client
      if (!replyText) {
        const userApiKey = localStorage.getItem("nexus_gemini_api_key") || (import.meta as any).env?.VITE_GEMINI_API_KEY;
        if (userApiKey) {
          try {
            const ai = new GoogleGenAI({ apiKey: userApiKey });
            const systemPrompt = `Tu es Nexus IA Pro. Réponds avec rigueur, élégance et clarté en Markdown. ${
              thinkingMode ? "Si possible, explique brièvement tes étapes de pensée au début." : ""
            }`;

            const res = await ai.models.generateContent({
              model: selectedModel,
              contents: userText,
              config: { systemInstruction: systemPrompt },
            });

            replyText = res.text || "";
            if (replyText) moteur = selectedModel;
            if (thinkingMode) {
              thinkingText = `Analyse réalisée en direct avec ta clé API Gemini 3.6 Flash (${selectedModel}).`;
            }
          } catch (clientKeyErr) {
            console.warn("Clé API client en échec, bascule sur le moteur autonome local", clientKeyErr);
          }
        }
      }

      // 3. L'IA QUI TOURNE CHEZ TOI (Ollama). Ni clé, ni internet, et rien de
      //    ce qui est écrit ne quitte la machine. C'est ce qu'Aharon voulait :
      //    « sans clé, ça marche quand même » — pour de vrai, avec un vrai
      //    modèle, pas avec des réponses écrites d'avance.
      if (!replyText) {
        const local = await demanderALocal(
          userText,
          [],
          "Tu es Nexus IA, l'assistant d'Aharon Dray. Réponds en français, avec "
            + "justesse et sans bavardage, en Markdown quand ça aide à lire.",
        );
        if (local) {
          replyText = local.reponse;
          moteur = `${local.modele} · sur ta machine`;
          if (thinkingMode) {
            thinkingText = `Répondu par ${local.modele}, qui tourne sur cette machine : `
              + `aucune clé, aucun réseau, rien n'est sorti d'ici.`;
          }
        }
      }

      // 3 bis. LE MODÈLE DU NAVIGATEUR. Ni clé, ni installation, ni compte :
      //    le modèle a été téléchargé une fois et vit dans ce navigateur. On
      //    ne le lance QUE s'il est déjà là — on ne déclenche jamais un
      //    téléchargement d'un gigaoctet sans qu'Aharon l'ait demandé.
      if (!replyText && dejaInstalle()) {
        try {
          const nav = await demanderAuNavigateur(
            userText, [],
            "Tu es Nexus IA. Réponds en français, avec justesse et sans bavardage.",
            (a) => setProgresModele(a),
          );
          if (nav) {
            replyText = nav.reponse;
            moteur = nav.modele;
            if (thinkingMode) {
              thinkingText = `Répondu par le modèle qui vit dans ce navigateur : `
                + `aucune clé, aucun serveur, rien n'est sorti d'ici.`;
            }
          }
        } catch (e) {
          console.warn("[Nexus] modèle du navigateur indisponible", e);
        } finally {
          setProgresModele(null);
        }
      }

      // 4. Rien du tout. On ne fait pas semblant : on dit ce qui manque et
      //    comment y remédier, en plus de ce qu'on sait répondre tout seul.
      if (!replyText) {
        moteur = "Nexus, sans modèle";
        if (thinkingMode) {
          thinkingText = `Aucun modèle joignable : ni serveur, ni clé, ni IA locale.`;
        }
        const etat = await ollamaDisponible();
        const marche = commentInstaller(etat);
        replyText = generateNexusResponse(userText)
          + (marche.length
            ? "\n\n---\n\n**Aucune intelligence artificielle n'est branchée pour l'instant.**"
              + (gpuPossible()
                ? "\n\nLe plus simple : le bouton juste en dessous. Ton navigateur "
                  + "télécharge un petit modèle **une seule fois**, et Nexus répond "
                  + "ensuite sans clé, sans compte et sans internet."
                : "")
              + "\n\nSinon, sur ta machine :\n"
              + marche.map((l) => (/^(launchctl|ollama)/.test(l) ? "\n```\n" + l + "\n```\n" : "- " + l)).join("\n")
              + "\n\nOu une clé — Réglages → Clé d'intelligence artificielle."
            : "");
      }
      }

      // Extraction automatique du code HTML si présent dans la réponse Markdown
      if (!codeSnippet && replyText.includes("```html")) {
        const match = replyText.match(/```html([\s\S]*?)```/);
        if (match && match[1].trim()) {
          codeSnippet = {
            type: "html",
            title: "Résultat Code HTML (Aperçu Live)",
            code: match[1].trim(),
          };
        }
      }

      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: replyText,
        thinking: thinkingText || undefined,
        moteur,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        codeSnippet,
      };

      if (codeSnippet) {
        setSandboxContent(codeSnippet);
        setSandboxCollapsed(false);
      }

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === activeSessionId) {
            return {
              ...s,
              messages: [...s.messages, assistantMsg],
            };
          }
          return s;
        })
      );
    } catch (err) {
      console.error("Chat Error:", err);
      const fallbackMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: `J'ai traité ton demande : **"${userText}"**.\n\nN'hésitez pas à poser d'autres questions ou à affiner ton requête !`,
        timestamp: nowStr,
      };
      setSessions((prev) =>
        prev.map((s) => (s.id === activeSessionId ? { ...s, messages: [...s.messages, fallbackMsg] } : s))
      );
    } finally {
      setLoading(false);
    }
  };

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div ref={racine} className="flex h-full w-full bg-slate-950 text-slate-100 select-none overflow-hidden relative">
      {/* Left Sidebar - History & Sessions */}
      {!historiqueReplie ? (
        <div
          style={{ width: `${sidebarWidth}px` }}
          className="shrink-0 bg-slate-900/90 border-r border-slate-800/80 flex flex-col p-3 gap-3 relative z-10 transition-all duration-75"
        >
          {/* Header & Collapse Button */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">Historique</span>
            <button
              onClick={() => setSidebarCollapsed(true)}
              className="p-1 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              title="Réduire l'historique"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>

          {/* New Chat Button */}
          <button
            onClick={createNewSession}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 nx-grad hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl font-semibold text-xs shadow-lg shadow-cyan-500/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau Chat</span>
          </button>

          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrer..."
              className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-8 pr-2 py-1 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          {/* List of Sessions */}
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {filteredSessions.map((sess) => {
              const isActive = sess.id === activeSessionId;
              return (
                <div
                  key={sess.id}
                  onClick={() => setActiveSessionId(sess.id)}
                  className={`group flex items-center justify-between p-2 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                    isActive
                      ? "bg-cyan-500/15 border border-cyan-500/40 text-cyan-200 shadow-sm"
                      : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-cyan-400" : "text-slate-500"}`} />
                    <span className="truncate">{sess.title}</span>
                  </div>
                  {sessions.length > 1 && (
                    <button
                      onClick={(e) => deleteSession(sess.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-500/20 hover:text-rose-400 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Draggable Divider Handle */}
          <div
            onMouseDown={() => {
              isDraggingSidebar.current = true;
            }}
            className="absolute top-0 right-0 bottom-0 w-1.5 cursor-col-resize hover:bg-cyan-500/40 active:bg-cyan-500 transition-colors z-20"
          />
        </div>
      ) : (
        // Quand la fenetre est trop etroite, ce bouton ne servirait a rien :
        // l'historique se replierait aussitot. Un bouton qui ne fait rien est
        // pire que pas de bouton.
        !tropEtroit && (
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="nx-btn nx-btn-icon absolute top-3 left-3 z-30"
            title="Ouvrir l'historique"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )
      )}

      {/* Main Enlarged Chat Area (flex-1) */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950/80 relative">
        {/* Top Header with Gemini 3.6 Flash Models & Thinking Mode Switch */}
        <div className="nx-barre-outils flex items-center justify-between px-4 py-2.5 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md gap-3">
          <div className="flex items-center gap-3">
            {historiqueReplie && <div className="w-6" />}
            <div className="p-2 rounded-xl nx-grad text-white shadow-md shadow-cyan-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-extrabold text-white tracking-wide truncate max-w-[180px] sm:max-w-[320px]">
                {activeSession?.title}
              </h2>
              <p className="text-[10px] text-cyan-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Moteur Gemini 3.6 Flash & Mode Réflexion
              </p>
            </div>
          </div>

          {/* Model Selector & Thinking Mode Controls */}
          <div className="flex items-center gap-2">
            {/* Export Chat Session */}
            <button
              onClick={() => {
                const textData = activeSession.messages
                  .map((m) => `[${m.timestamp}] ${m.role.toUpperCase()}:\n${m.thinking ? `--- THINKING ---\n${m.thinking}\n--- CONTENT ---\n` : ""}${m.content}`)
                  .join("\n\n" + "=".repeat(40) + "\n\n");
                const blob = new Blob([textData], { type: "text/plain;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${activeSession.title.toLowerCase().replace(/\s+/g, "_")}_nexus.txt`;
                a.click();
              }}
              className="nx-btn nx-btn-icon"
              title="Exporter la session de discussion"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            {/* Model Selector */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 text-[11px] font-semibold">
              <button
                onClick={() => setSelectedModel("gemini-3.6-flash")}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  selectedModel === "gemini-3.6-flash"
                    ? "bg-cyan-500 text-slate-950 font-bold shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                3.6 Flash
              </button>
              <button
                onClick={() => setSelectedModel("gemini-3.1-pro-preview")}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  selectedModel === "gemini-3.1-pro-preview"
                    ? "bg-cyan-500 text-slate-950 font-bold shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                3.1 Pro
              </button>
            </div>

            {/* Mode Réflexion Toggle */}
            <button
              onClick={() => setThinkingMode(!thinkingMode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all text-[11px] font-bold ${
                thinkingMode
                  ? "bg-indigo-500/20 border-indigo-400 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.3)]"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
              }`}
            >
              <Brain className={`w-3.5 h-3.5 ${thinkingMode ? "text-indigo-400 animate-pulse" : ""}`} />
              <span className="hidden md:inline">Mode Réflexion</span>
              <div className={`w-3.5 h-2 rounded-full p-0.5 transition-colors ${thinkingMode ? "bg-indigo-400" : "bg-slate-700"}`}>
                <div className={`w-1 h-1 rounded-full bg-white transition-transform ${thinkingMode ? "translate-x-1.5" : "translate-x-0"}`} />
              </div>
            </button>

            {/* Toggle Sandbox Side */}
            {bacASableReplie && (
              <button
                onClick={() => setSandboxCollapsed(false)}
                className="nx-btn nx-btn-icon"
                title="Ouvrir le lecteur multimédia"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Messages List Area - Spacious & Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {activeSession?.messages.map((msg) => {
            const isUser = msg.role === "user";
            const isThinkingOpen = showThinkingDetails[msg.id];

            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-5xl mx-auto ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser && (
                  <div className="w-9 h-9 rounded-2xl nx-grad flex items-center justify-center text-white shrink-0 shadow-lg shadow-cyan-500/20">
                    <Bot className="w-5 h-5" />
                  </div>
                )}

                <div
                  className={`flex flex-col gap-2 max-w-[88%] ${
                    isUser
                      ? "nx-grad text-white p-4 rounded-2xl rounded-tr-none shadow-md"
                      : "bg-slate-900/90 border border-slate-800/90 p-5 rounded-2xl rounded-tl-none text-slate-200 shadow-2xl"
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] opacity-70 mb-1">
                    <span className="font-bold flex items-center gap-1.5">
                      {isUser ? "Vous" : `Nexus IA — ${msg.moteur || selectedModel}`}
                    </span>
                    <span>{msg.timestamp}</span>
                  </div>

                  {/* Thinking Section if present */}
                  {!isUser && msg.thinking && (
                    <div className="mb-2 rounded-xl border border-indigo-500/30 bg-indigo-950/20 overflow-hidden">
                      <button
                        onClick={() => toggleThinkingDetails(msg.id)}
                        className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold text-indigo-300 hover:bg-indigo-500/10 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Brain className="w-3.5 h-3.5 text-indigo-400" />
                          <span>🧠 Pensée & Réflexion Approfondie Nexus</span>
                        </div>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isThinkingOpen ? "rotate-180" : ""}`} />
                      </button>

                      {isThinkingOpen && (
                        <div className="px-3 py-2.5 border-t border-indigo-500/20 text-[11px] font-mono text-indigo-200/90 bg-indigo-950/30 whitespace-pre-wrap leading-relaxed">
                          {msg.thinking}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Message Content
                      Le corps etait affiche en TEXTE BRUT : chaque **gras**,
                      chaque titre, chaque liste et chaque bloc de code
                      s'affichait avec ses etoiles et ses dieses en clair. Une
                      IA repond en Markdown — il faut donc le lire. Le rendu
                      existait deja dans Nexus, il n'etait simplement pas
                      branche ici. Les messages de l'utilisateur restent bruts :
                      ce qu'il ecrit ne doit pas etre reinterprete. */}
                  {msg.role === "assistant" ? (
                    <div className="text-xs sm:text-sm leading-relaxed font-sans">
                      <NexusMessageRenderer content={msg.content} />
                    </div>
                  ) : (
                    <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans">
                      {msg.content}
                    </div>
                  )}

                  {/* Code Snippet Launcher */}
                  {msg.codeSnippet && (
                    <div className="mt-3 p-3 rounded-xl bg-slate-950/90 border border-cyan-500/30 flex items-center justify-between shadow-inner">
                      <div className="flex items-center gap-2.5">
                        <Code className="w-4 h-4 text-cyan-400" />
                        <div>
                          <p className="text-xs font-bold text-cyan-200">{msg.codeSnippet.title}</p>
                          <p className="text-[10px] text-slate-400">Prêt pour prévisualisation directe</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSandboxContent(msg.codeSnippet!);
                          setSandboxCollapsed(false);
                        }}
                        className="nx-btn nx-btn-secondary text-xs flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ouvrir dans le lecteur</span>
                      </button>
                    </div>
                  )}

                  {!isUser && (
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400">
                      <button
                        onClick={() => copyToClipboard(msg.content, msg.id)}
                        className="flex items-center gap-1 hover:text-cyan-300 transition-colors"
                      >
                        {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedId === msg.id ? "Copié" : "Copier le texte"}</span>
                      </button>
                      <span className="text-slate-500">
                        {/* Ce qui repond VRAIMENT, pas ce qu'on aimerait afficher. */}
                        {moteurDuDernier || "Aucun modèle branché"}
                      </span>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-9 h-9 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-300 shrink-0 border border-slate-700">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-3 max-w-5xl mx-auto items-center">
              <div className="w-9 h-9 rounded-2xl bg-cyan-600/30 border border-cyan-500/40 flex items-center justify-center text-cyan-300 animate-pulse">
                <Brain className="w-5 h-5 animate-spin" />
              </div>
              <div className="px-4 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-cyan-300 font-semibold flex items-center gap-3 shadow-lg">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                <span>Analyse Gemini 3.6 Flash ({selectedModel}) {thinkingMode ? "+ Mode Réflexion" : ""}...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── LE MODÈLE DU NAVIGATEUR ─────────────────────────────────────
            Ni clé, ni compte, ni installation : le navigateur télécharge un
            petit modèle UNE FOIS, le garde, et le fait tourner sur la carte
            graphique. C'est ce qu'Aharon demandait — « l'utilisateur arrive,
            il n'a vraiment rien à faire ».
            On ne le télécharge JAMAIS tout seul : un gigaoctet pris sans
            prévenir sur un partage de connexion, c'est impardonnable. Un clic,
            une fois, et plus jamais. */}
        {!installe && gpuPossible() && !progresModele && (
          <div className="mx-3 mb-2 rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-3">
            <div className="flex items-center gap-2 text-[12px] font-semibold text-cyan-200">
              <Sparkles className="h-3.5 w-3.5" />
              Réponds-moi sans clé et sans internet
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
              Ton navigateur télécharge un modèle <b>une seule fois</b> et le garde.
              Ensuite, plus rien ne sort de cette machine.
              <br />
              {/* Un modèle trop petit se trompe, et un lycéen qui révise ne peut
                  pas le savoir. On le dit avant, pas après. */}
              <span className="text-amber-300/80">
                Prends le premier : le léger se trompe sur les cours.
              </span>
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {MODELES.map((m) => (
                <button
                  key={m.id}
                  onClick={async () => {
                    try { localStorage.setItem(CLE_CHOIX, m.id); } catch { /* refusé */ }
                    setProgresModele({ etape: "Préparation…", part: 0 });
                    try {
                      await demanderAuNavigateur("Bonjour", [], undefined,
                        (a) => setProgresModele(a));
                      setInstalle(true);
                    } catch (e) {
                      setProgresModele(null);
                      alert("Le modèle n'a pas pu être préparé : " + (e as Error).message);
                    } finally {
                      setProgresModele(null);
                    }
                  }}
                  className={`nx-btn flex-col !items-start gap-0.5 !py-2 ${
                    m.fiable ? "nx-btn-primary" : "nx-btn-secondary"
                  }`}
                  title={m.detail}
                >
                  <span className="text-[12px] font-bold">{m.nom}</span>
                  <span className="text-[10px] font-normal opacity-70">{m.poids}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {progresModele && (
          <div className="mx-3 mb-2 rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-3">
            <div className="flex items-center justify-between text-[11px] text-cyan-200">
              <span className="truncate pr-3">{progresModele.etape}</span>
              <span className="tabular-nums font-semibold shrink-0">
                {Math.round(progresModele.part * 100)} %
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-cyan-400 transition-[width] duration-[var(--t-moyen)] [transition-timing-function:var(--doux)]"
                style={{ width: `${Math.round(progresModele.part * 100)}%` }}
              />
            </div>
            <p className="mt-1.5 text-[10px] text-slate-400">
              Une seule fois. Tu peux continuer à te servir de Nexus pendant ce temps.
            </p>
          </div>
        )}

        {/* Bottom Input Field */}
        <div className="p-3 sm:p-4 border-t border-slate-800/80 bg-slate-900/60 backdrop-blur-md space-y-2">
          {/* Quick Suggestions */}
          {activeSession?.messages.length <= 2 && (
            <div className="max-w-5xl mx-auto flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-[11px]">
              {[
                { label: "⚡ Dashboard HTML Live", prompt: "Crée un dashboard HTML5 interactif avec graphiques CSS élégants." },
                { label: "🧠 Analyse & Réflexion", prompt: "Analyse en détail les avantages et inconvénients de l'architecture serveur unifiée." },
                { label: "📄 Synthèse & Rapport", prompt: "Rédige une synthèse professionnelle pour une présentation stratégique." },
                { label: "💻 Code TypeScript React", prompt: "Écris un composant React TypeScript réutilisable pour la gestion de tâches." },
              ].map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInput(chip.prompt);
                  }}
                  className="nx-btn nx-btn-secondary shrink-0"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}

          <div className="max-w-5xl mx-auto flex items-center gap-2 bg-slate-950 border border-slate-800 focus-within:border-cyan-500/60 rounded-2xl p-2 transition-all shadow-2xl">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={`Posez ta question à Gemini 3.6 Flash (${selectedModel}) - Code, Analyse, HTML...`}
              className="flex-1 bg-transparent px-3 py-1.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none"
            />

            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="p-3 rounded-xl nx-grad hover:from-cyan-400 hover:to-blue-500 text-white disabled:opacity-40 font-bold transition-all shadow-md active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Right Sandbox & Media Viewer Panel */}
      {!bacASableReplie && sandboxContent && (
        <div
          style={{ width: `${sandboxWidth}px` }}
          className="shrink-0 bg-slate-900/95 border-l border-slate-800/80 flex flex-col relative z-10 transition-all duration-75"
        >
          {/* Draggable Divider Handle */}
          <div
            onMouseDown={() => {
              isDraggingSandbox.current = true;
            }}
            className="absolute top-0 left-0 bottom-0 w-1.5 cursor-col-resize hover:bg-cyan-500/40 active:bg-cyan-500 transition-colors z-20"
          />

          <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-800 bg-slate-950/80">
            <div className="flex items-center gap-2 truncate">
              <Code className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-white truncate">{sandboxContent.title}</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-[10px]">
                <button
                  onClick={() => setSandboxTab("preview")}
                  className={`px-2 py-0.5 rounded font-semibold transition-all ${
                    sandboxTab === "preview" ? "bg-cyan-500/20 text-cyan-300" : "text-slate-400"
                  }`}
                >
                  Aperçu
                </button>
                <button
                  onClick={() => setSandboxTab("code")}
                  className={`px-2 py-0.5 rounded font-semibold transition-all ${
                    sandboxTab === "code" ? "bg-cyan-500/20 text-cyan-300" : "text-slate-400"
                  }`}
                >
                  Code
                </button>
              </div>

              <button
                onClick={() => setSandboxCollapsed(true)}
                className="p-1 rounded text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                title="Masquer le panneau"
              >
                <PanelRightClose className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 p-3 overflow-y-auto">
            {sandboxTab === "preview" ? (
              <div className="w-full h-full min-h-[350px] bg-slate-950 rounded-xl border border-slate-800 overflow-hidden relative flex items-center justify-center shadow-inner">
                {sandboxContent.type === "html" && (
                  <iframe
                    srcDoc={sandboxContent.code}
                    title="Nexus Live Sandbox"
                    className="w-full h-full min-h-[350px] border-none bg-white/5"
                  />
                )}
                {sandboxContent.type === "pdf" && (
                  <div className="p-4 text-center text-xs text-slate-300">
                    <FileText className="w-10 h-10 text-rose-400 mx-auto mb-2" />
                    <p className="font-semibold">Document PDF Prêt</p>
                    <p className="text-[10px] text-slate-500 mt-1">Aperçu du document généré</p>
                  </div>
                )}
              </div>
            ) : (
              <pre className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] font-mono text-cyan-300 overflow-x-auto whitespace-pre-wrap select-text">
                {sandboxContent.code}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


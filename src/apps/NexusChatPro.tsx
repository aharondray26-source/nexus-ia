import React, { useState, useRef, useEffect, useCallback } from "react";
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
            thinking: "Je regarde ce qui est disponible : le modèle en ligne d'abord, sinon celui de cette machine, sinon celui du navigateur.",
            content: `### Bonjour. Je suis Nexus.

Pose ta question, c'est tout. Je m'occupe de trouver un modèle — **tu n'as ni clé, ni compte, ni installation à prévoir.**

**Ce que je fais bien :**

- **Un cours qu'on n'a pas compris** — « explique-moi les suites géométriques comme si j'étais en première »
- **Un exercice** — je montre les étapes, et je **calcule à part** ce qui peut l'être : un modèle se trompe en calcul, pas moi
- **Un texte** — résumer, corriger, traduire, reformuler
- **Une page web ou un tableau** — décris ce que tu veux, je l'écris et tu le vois tourner à droite

*Le mode réflexion, en haut, me fait raisonner étape par étape avant de répondre. Utile pour un problème ; inutile pour une question simple.*`,
            codeSnippet: {
              type: "html",
              title: "Ce que je peux dessiner pour toi",
              code: `<div style="font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',Inter,system-ui,sans-serif;
     padding:26px;border-radius:18px;color:#eef;text-align:center;
     background:radial-gradient(120% 100% at 20% 0%,#1b1b3a,#0b0b14)">
  <div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;opacity:.55">Aperçu vivant</div>
  <h2 style="margin:8px 0 6px;font-size:22px;letter-spacing:-.02em">Tout ce que j'écris, tu le vois tourner</h2>
  <p style="margin:0 0 18px;opacity:.72;font-size:13.5px;line-height:1.55">
    Une page, un tableau, un petit jeu, une animation :<br>demande, et ça s'affiche ici même.
  </p>
  <button onclick="this.textContent='Ça marche ✓';this.style.background='#34d399';this.style.color='#06281c'"
    style="padding:11px 22px;border:0;border-radius:11px;cursor:pointer;font-weight:600;font-size:13.5px;
           background:#a5a6ff;color:#14142a;transition:all .18s cubic-bezier(.34,1.4,.5,1)">
    Essaie ce bouton
  </button>
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
  // Y A-T-IL UN MODÈLE EN LIGNE, hébergé avec le site ?
  //
  // Aharon : « dès que le site visuel est en ligne, le modèle intelligent doit
  // être en ligne aussi, sans manipulation des utilisateurs ». Quand c'est le
  // cas, Nexus ne propose JAMAIS de télécharger quoi que ce soit : le visiteur
  // pose sa question, ça répond, point.
  // `null` = on ne sait pas encore.
  const [modeleEnLigne, setModeleEnLigne] = useState<boolean | null>(null);
  useEffect(() => {
    let vivant = true;
    fetch("/api/health", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (vivant) setModeleEnLigne(!!(d && d.modeleEnLigne)); })
      // Pas de serveur du tout (site posé en fichiers) : on se débrouillera
      // avec le modèle du navigateur.
      .catch(() => { if (vivant) setModeleEnLigne(false); });
    return () => { vivant = false; };
  }, []);

  const [progresModele, poserProgres] = useState<{ etape: string; part: number } | null>(null);
  // Une jauge qui RECULE se lit comme une panne. La bibliotheque annonce parfois
  // un avancement plus petit que le precedent en changeant d'etape ; on ne
  // redescend jamais.
  const setProgresModele = useCallback((a: { etape: string; part: number } | null) => {
    if (!a) { poserProgres(null); return; }
    poserProgres((v) => ({ etape: a.etape, part: Math.max(v?.part ?? 0, a.part) }));
  }, []);
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
    title: "Ce que je peux dessiner pour toi",
    code: `<div style="font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',Inter,system-ui,sans-serif;
     padding:26px;border-radius:18px;color:#eef;text-align:center;
     background:radial-gradient(120% 100% at 20% 0%,#1b1b3a,#0b0b14)">
  <div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;opacity:.55">Aperçu vivant</div>
  <h2 style="margin:8px 0 6px;font-size:22px;letter-spacing:-.02em">Tout ce que j'écris, tu le vois tourner</h2>
  <p style="margin:0 0 18px;opacity:.72;font-size:13.5px;line-height:1.55">
    Une page, un tableau, un petit jeu, une animation :<br>demande, et ça s'affiche ici même.
  </p>
  <button onclick="this.textContent='Ça marche ✓';this.style.background='#34d399';this.style.color='#06281c'"
    style="padding:11px 22px;border:0;border-radius:11px;cursor:pointer;font-weight:600;font-size:13.5px;
           background:#a5a6ff;color:#14142a;transition:all .18s cubic-bezier(.34,1.4,.5,1)">
    Essaie ce bouton
  </button>
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
          content: `Nouvelle discussion. Qu'est-ce qu'on regarde ?`,
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
              thinkingText = `Répondu par le modèle en ligne, hébergé avec le site (${data.modelUsed || "modèle du serveur"}). Personne n'a eu à configurer quoi que ce soit.`;
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
              thinkingText = `Répondu avec la clé que TU as enregistrée dans ce navigateur (${selectedModel}).`;
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

      // 3 bis. LE MODÈLE DU NAVIGATEUR — DE LUI-MÊME.
      //
      //    Aharon : « il faut que par défaut, partout, SANS AUCUNE MANIPULATION
      //    de l'utilisateur, il puisse bénéficier d'un modèle intelligent ». Il
      //    a raison : quelqu'un qui reçoit le lien et pose une question ne doit
      //    pas avoir à comprendre ce qu'est un modèle.
      //
      //    Alors on le prépare TOUT SEUL, à la première question, quand il n'y
      //    a ni serveur ni clé ni Ollama. On l'annonce, on montre la
      //    progression, et on peut l'arrêter — un gigaoctet pris en silence sur
      //    un partage de connexion serait impardonnable ; le prendre en
      //    l'annonçant, c'est simplement rendre service.
      //    On ne télécharge JAMAIS un gigaoctet quand un modèle répond déjà en
      //    ligne : si le serveur a eu un hoquet, on repose la question, on ne
      //    prend pas la connexion de quelqu'un pour rien.
      if (!replyText && (dejaInstalle() || (gpuPossible() && modeleEnLigne === false))) {
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

      // 4. Rien du tout.
      //
      //    Aharon : « je veux pas rester avec un site qui demande des
      //    manipulations utilisateurs, c'est très décourageant. J'avais une
      //    application comme ça avant, je l'ai désinstallée directement. »
      //
      //    On ne demande donc plus RIEN à personne. On dit ce qui se passe,
      //    en une phrase, et on répond quand même de ce qu'on sait.
      if (!replyText) {
        moteur = "Nexus, sans modèle";
        if (thinkingMode) {
          thinkingText = `Aucun modèle joignable : ni serveur, ni modèle dans ce navigateur.`;
        }
        const horsLigne = typeof navigator !== "undefined" && navigator.onLine === false;
        replyText = generateNexusResponse(userText) + "\n\n---\n\n" + (
          modeleEnLigne
            // Un modèle EST en ligne : c'est une panne passagère, pas un manque.
            ? "*Je n'ai pas réussi à joindre mon modèle à l'instant. Repose ta "
              + "question : c'est presque toujours passager.*"
          : horsLigne
            // Il n'a pas internet ET pas encore de modèle : le seul cas où l'on
            // ne peut vraiment rien. On le dit sans rien réclamer.
            ? "*Je prépare mon propre modèle la première fois qu'on me parle, et "
              + "ça demande internet une seule fois. Il n'y a pas de connexion "
              + "pour l'instant — reconnecte-toi une minute, et ensuite je "
              + "répondrai même hors ligne, pour toujours.*"
          : gpuPossible()
            ? "*Mon modèle n'a pas pu se mettre en route sur cette machine. "
              + "Repose ta question : je réessaie.*"
            // Vieux navigateur, sans carte graphique accessible.
            : "*Ce navigateur ne sait pas faire tourner de modèle. Essaie depuis "
              + "Chrome, Edge ou Safari à jour — Nexus s'occupe du reste.*"
        );
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
              {/* On annonce le moteur qui a VRAIMENT répondu la dernière fois,
                  et rien tant qu'il n'a pas répondu. Écrire « Gemini » en
                  permanence était faux dès que la réponse venait d'ailleurs. */}
              <p className="text-[10px] text-cyan-400 font-semibold flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  modeleEnLigne === false ? "bg-amber-400" : "bg-emerald-400 animate-pulse"}`} />
                {moteurDuDernier
                  ? moteurDuDernier
                  : modeleEnLigne === true ? "Modèle en ligne · rien à installer"
                  : modeleEnLigne === false ? "Modèle de cette machine"
                  : "Je cherche un modèle…"}
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
                      {/* Le moteur RÉEL de CE message, ou rien. Écrire
                          « gemini-3.6-flash » sous une réponse venue d'ailleurs
                          était simplement faux. */}
                      {isUser ? "Toi" : (msg.moteur ? `Nexus — ${msg.moteur}` : "Nexus")}
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
                <span>Nexus réfléchit{thinkingMode ? " — pas à pas" : ""}…</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── LE MODÈLE DU NAVIGATEUR ─────────────────────────────────────
            Ni clé, ni compte, ni installation : à la première question, le
            navigateur télécharge un petit modèle UNE FOIS, le garde, et le
            fait tourner sur la carte graphique. C'est ce qu'Aharon demandait —
            « l'utilisateur arrive, il n'a vraiment rien à faire ».

            Ce n'était PAS ça avant : il fallait cliquer un bouton, et le
            panneau qui le proposait occupait le quart de la conversation en
            permanence. Maintenant que ça se fait tout seul, ce n'est plus une
            action : c'est une phrase. On la garde discrète, on ne la montre
            que s'il n'y a pas déjà un modèle en ligne, et elle disparaît dès
            que le modèle est là. */}
        {!installe && gpuPossible() && modeleEnLigne === false && !progresModele && (
          <div className="mx-3 mb-2 flex flex-wrap items-center gap-x-2 gap-y-1
                          rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2
                          text-[11px] text-slate-400">
            <Sparkles className="h-3 w-3 shrink-0 text-cyan-300/80" />
            <span className="text-slate-300">Pose ta question : je m'occupe du reste.</span>
            <span className="text-slate-500">
              Je prépare mon modèle une seule fois, puis je réponds même hors ligne.
            </span>
            <span className="ml-auto flex items-center gap-1.5">
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
                  // Un modèle trop petit se trompe, et un lycéen qui révise ne
                  // peut pas le savoir : le léger le dit dans son infobulle.
                  title={m.fiable
                    ? `${m.poids} — le bon choix`
                    : `${m.poids} — plus rapide, mais il se trompe sur les cours`}
                  className={`rounded-lg px-2 py-0.5 text-[10.5px] font-medium transition-colors ${
                    m.fiable
                      ? "bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {m.fiable ? "Commencer maintenant" : "Version légère"}
                </button>
              ))}
            </span>
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
              // Le nom d'un fournisseur n'a rien à faire ici : ce n'est pas
              // toujours lui qui répond, et ça ne dit rien à personne.
              placeholder="Pose ta question à Nexus — un cours, un exercice, un texte, une page…"
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


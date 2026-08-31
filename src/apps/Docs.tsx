import { useState, useRef, useEffect } from "react";
import { usePersistentState } from "../lib/persist";
import { putFile } from "../lib/fileStore";
import { queryNexusAI } from "../lib/nexusBrain";
import {
  FileText,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Palette,
  Highlighter,
  Printer,
  Download,
  Plus,
  Trash2,
  Copy,
  Check,
  Sparkles,
  Type,
  Maximize2,
  Table as TableIcon,
  Image as ImageIcon,
  Minus,
  Quote,
  Undo,
  Redo,
  FolderDown,
  ChevronDown,
  FileUp,
  Save,
} from "lucide-react";

export interface DocumentItem {
  id: string;
  title: string;
  content: string; // HTML string
  updatedAt: number;
}

const FONTS = [
  { name: "Sans-Serif (Standard)", value: "Inter, system-ui, sans-serif" },
  { name: "Serif (Livre / Article)", value: "Georgia, 'Times New Roman', serif" },
  { name: "Monospace (Code)", value: "'JetBrains Mono', monospace" },
  { name: "Display (Titre)", value: "'Plus Jakarta Sans', sans-serif" },
  { name: "Script (Manuscrit)", value: "'Caveat', cursive, sans-serif" },
];

const SIZES = [
  { label: "Très petit (12px)", value: "12px" },
  { label: "Petit (14px)", value: "14px" },
  { label: "Normal (16px)", value: "16px" },
  { label: "Moyen (18px)", value: "18px" },
  { label: "Grand (24px)", value: "24px" },
  { label: "Titre (32px)", value: "32px" },
  { label: "Grand Titre (40px)", value: "40px" },
];

const COLORS = [
  "#f8fafc", "#e2e8f0", "#94a3b8", "#38bdf8", "#3b82f6",
  "#a855f7", "#f43f5e", "#10b981", "#f59e0b", "#000000"
];

const HIGHLIGHTS = [
  "transparent", "#fef08a", "#bbf7d0", "#bae6fd", "#fbcfe8", "#e9d5ff"
];

export default function Docs() {
  const [docs, setDocs] = usePersistentState<DocumentItem[]>("nexus.docs.v2", [
    {
      id: "doc-welcome",
      title: "Rapport de Projet - Nexus OS Studio.docx",
      content: `<h1><strong>Document Officiel Nexus OS Studio</strong></h1>
<p>Bienvenue dans ton nouvel éditeur de documents inspiré de <em>Google Docs</em> et <em>Microsoft Word</em>. Cet outil complet te permet de rédiger, mettre en page et formater tes textes professionnels avec élégance.</p>
<hr/>
<h2>1. Fonctionnalités Principales</h2>
<ul>
  <li><strong>Mise en forme avancée :</strong> Gras, Italique, Souligné, Barré, Polices variées et Tailles de texte.</li>
  <li><strong>Couleurs & Surlignage :</strong> Palette de couleurs pour le texte et surligneurs de couleur.</li>
  <li><strong>Alignement & Listes :</strong> Alignement à gauche, centré, à droite ou justifié, plus listes à puces ou numérotées.</li>
  <li><strong>Exportation Directe :</strong> Enregistrement automatique dans ton <em>Gestionnaire de Fichiers</em> Nexus OS ou exportation en fichier HTML / Impression PDF.</li>
</ul>
<blockquote><p>💡 <strong>Astuce :</strong> Le document est présenté sur une page A4 réaliste avec enregistrement continu en arrière-plan !</p></blockquote>`,
      updatedAt: Date.now(),
    },
  ]);

  const [activeDocId, setActiveDocId] = useState<string>(docs[0]?.id || "doc-welcome");
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [saveNotification, setSaveNotification] = useState<string | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeDoc = docs.find((d) => d.id === activeDocId) || docs[0];

  // Sync editor content when active document changes
  useEffect(() => {
    if (editorRef.current && activeDoc) {
      if (editorRef.current.innerHTML !== activeDoc.content) {
        editorRef.current.innerHTML = activeDoc.content;
      }
    }
  }, [activeDocId]);

  function updateDocContent(html: string) {
    if (!activeDoc) return;
    setDocs((prev) =>
      prev.map((d) =>
        d.id === activeDoc.id ? { ...d, content: html, updatedAt: Date.now() } : d
      )
    );
  }

  function updateDocTitle(title: string) {
    if (!activeDoc) return;
    setDocs((prev) =>
      prev.map((d) =>
        d.id === activeDoc.id ? { ...d, title, updatedAt: Date.now() } : d
      )
    );
  }

  function createNewDoc() {
    const newDoc: DocumentItem = {
      id: `doc-${Date.now()}`,
      title: `Nouveau Document ${docs.length + 1}.docx`,
      content: `<h1>Nouveau Document</h1><p>Commencez à rédiger ton texte ici...</p>`,
      updatedAt: Date.now(),
    };
    setDocs((prev) => [newDoc, ...prev]);
    setActiveDocId(newDoc.id);
  }

  function deleteDoc(id: string) {
    if (docs.length <= 1) return;
    setDocs((prev) => prev.filter((d) => d.id !== id));
    if (activeDocId === id) {
      const remaining = docs.filter((d) => d.id !== id);
      if (remaining.length > 0) setActiveDocId(remaining[0].id);
    }
  }

  // ExecCommand helper for Rich Text Editing
  function exec(command: string, value: string | undefined = undefined) {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      updateDocContent(editorRef.current.innerHTML);
    }
  }

  // Insert Custom Elements
  function insertHorizontalRule() {
    exec("insertHorizontalRule");
  }

  function insertBlockquote() {
    exec("formatBlock", "blockquote");
  }

  function insertTable() {
    const tableHTML = `<table style="width: 100%; border-collapse: collapse; margin: 12px 0; border: 1px solid #cbd5e1;">
      <thead>
        <tr style="background-color: #f1f5f9;">
          <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">Colonne 1</th>
          <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">Colonne 2</th>
          <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">Colonne 3</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="border: 1px solid #cbd5e1; padding: 8px;">Donnée A1</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px;">Donnée B1</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px;">Donnée C1</td>
        </tr>
        <tr>
          <td style="border: 1px solid #cbd5e1; padding: 8px;">Donnée A2</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px;">Donnée B2</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px;">Donnée C2</td>
        </tr>
      </tbody>
    </table><p></p>`;
    exec("insertHTML", tableHTML);
  }

  function insertImagePrompt() {
    const url = prompt("Entre l'URL de l'image :");
    if (url) {
      exec("insertImage", url);
    }
  }

  // Direct download to local computer disk
  function handleDirectDownloadDoc() {
    if (!activeDoc) return;
    const docHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${activeDoc.title}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 20px; color: #0f172a; }
    h1 { color: #0284c7; }
    blockquote { border-left: 4px solid #38bdf8; padding-left: 12px; color: #475569; font-style: italic; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { border: 1px solid #cbd5e1; padding: 8px; }
  </style>
</head>
<body>
  ${activeDoc.content}
</body>
</html>`;

    const blob = new Blob([docHTML], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = activeDoc.title.endsWith(".html") || activeDoc.title.endsWith(".docx") || activeDoc.title.endsWith(".doc")
      ? activeDoc.title
      : `${activeDoc.title}.docx`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  }

  // Import local file into Docs
  async function handleImportFile(file: File) {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    let htmlContent = "";

    try {
      if (ext === "html" || ext === "htm") {
        htmlContent = await file.text();
      } else if (ext === "txt" || ext === "md" || ext === "csv" || ext === "json") {
        const text = await file.text();
        htmlContent = text
          .split(/\n\n+/)
          .map((p) => `<p style="line-height:1.7; margin-bottom:0.85rem;">${p.replace(/\n/g, "<br/>")}</p>`)
          .join("\n");
      } else {
        // Doc, Docx or unknown
        const raw = await file.text();
        const cleanText = raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        if (cleanText.length > 15) {
          htmlContent = `<h1>${file.name}</h1><p>${cleanText.slice(0, 50000)}</p>`;
        } else {
          htmlContent = `<h1>${file.name}</h1><p>Document ${file.name} importé avec succès.</p>`;
        }
      }
    } catch (err) {
      console.warn("Erreur d'importation de document:", err);
      htmlContent = `<h1>${file.name}</h1><p>Document importé.</p>`;
    }

    const newDoc: DocumentItem = {
      id: `doc-${Date.now()}`,
      title: file.name,
      content: htmlContent,
      updatedAt: Date.now(),
    };

    setDocs((prev) => [newDoc, ...prev]);
    setActiveDocId(newDoc.id);
  }

  // Save to Nexus Files app & Local Storage
  async function saveToNexusFiles() {
    if (!activeDoc) return;
    setIsExporting(true);

    // Save current content into state
    if (editorRef.current) {
      updateDocContent(editorRef.current.innerHTML);
    }

    const docContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${activeDoc.title}</title>
  <style>
    body { font-family: system-ui, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 20px; color: #1e293b; }
    h1 { color: #0284c7; }
    blockquote { border-left: 4px solid #38bdf8; padding-left: 12px; color: #475569; font-style: italic; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { border: 1px solid #cbd5e1; padding: 8px; }
  </style>
</head>
<body>
  ${editorRef.current ? editorRef.current.innerHTML : activeDoc.content}
</body>
</html>`;

    const blob = new Blob([docContent], { type: "text/html" });

    try {
      await putFile({
        id: `doc-file-${activeDoc.id}-${Date.now()}`,
        name: activeDoc.title.endsWith(".html") || activeDoc.title.endsWith(".docx") ? activeDoc.title : `${activeDoc.title}.docx`,
        size: blob.size,
        type: "application/html",
        extension: "DOCX",
        folder: "Documents",
        addedAt: Date.now(),
        blob,
      });

      setSaveNotification(`Document "${activeDoc.title}" enregistré dans Fichiers !`);
      setTimeout(() => setSaveNotification(null), 3500);
    } catch (e) {
      console.error("Erreur de sauvegarde:", e);
      setSaveNotification("Document sauvegardé en mémoire !");
      setTimeout(() => setSaveNotification(null), 3000);
    } finally {
      setIsExporting(false);
    }
  }

  // Print / Save as PDF
  function handlePrint() {
    if (!editorRef.current) return;
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${activeDoc.title}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #000; line-height: 1.6; }
            h1, h2, h3 { color: #1e293b; }
            blockquote { border-left: 4px solid #0284c7; padding-left: 16px; margin: 16px 0; color: #475569; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ccc; padding: 8px; }
          </style>
        </head>
        <body>
          ${editorRef.current.innerHTML}
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  }

  function markdownToHTML(md: string): string {
    if (md.includes("```html")) {
      const match = md.match(/```html([\s\S]*?)```/);
      if (match && match[1]) return match[1].trim();
    }
    if (md.includes("```")) {
      const match = md.match(/```([\s\S]*?)```/);
      if (match && match[1]) return match[1].trim();
    }

    let html = md
      .replace(/^### (.*$)/gim, '<h3 style="color:#0284c7; margin-top:1rem; font-size:1.1rem; font-weight:bold;">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 style="color:#0369a1; margin-top:1.25rem; font-size:1.25rem; font-weight:bold;">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 style="color:#1e3a8a; margin-top:1.5rem; font-size:1.5rem; font-weight:bold;">$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');

    const paragraphs = html.split(/\n\n+/);
    return paragraphs
      .map((p) => {
        p = p.trim();
        if (!p) return "";
        if (p.startsWith("<h") || p.startsWith("<ul") || p.startsWith("<ol") || p.startsWith("<li")) return p;
        return `<p style="line-height:1.7; margin-bottom:0.85rem;">${p.replace(/\n/g, "<br/>")}</p>`;
      })
      .join("\n");
  }

  // AI Assist Text Generator (Intelligent Gemini Connected)
  async function handleAiGenerate() {
    if (!aiPrompt.trim()) return;
    setIsAiGenerating(true);

    try {
      let generatedText = "";
      const currentDocText = editorRef.current?.innerText || "";

      // 1. Essai avec l'API Gemini dédiée aux documents
      try {
        const docRes = await fetch("/api/gemini/document", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: aiPrompt,
            currentContent: currentDocText,
          }),
        });
        if (docRes.ok) {
          const docData = await docRes.json();
          if (docData.reply) {
            generatedText = docData.reply;
          }
        }
      } catch (e) {
        console.warn("Endpoint /api/gemini/document indisponible, bascule sur Nexus AI Engine.");
      }

      // 2. Fallback avec le moteur Nexus AI
      if (!generatedText) {
        const fullPrompt = `Tu es l'assistant de rédaction du logiciel Documents. Rédige un texte complet, captivant, riche et très bien structuré (ex: lettre, rapport, histoire, dissertation, contrat, synthèse) pour la demande suivante :\n\n${aiPrompt}\n\nNe mets pas de balises de code Markdown. Rédige directement un texte structuré de qualité professionnelle.`;
        generatedText = await queryNexusAI(fullPrompt);
      }

      if (generatedText) {
        const formattedHtml = markdownToHTML(generatedText);
        
        if (editorRef.current) {
          editorRef.current.focus();
          const currentContent = editorRef.current.innerHTML.trim();
          const isDocEmpty =
            !currentContent ||
            currentContent === "<p><br></p>" ||
            currentContent === "<br>" ||
            currentContent === "<p></p>";

          const updatedHtml = isDocEmpty
            ? formattedHtml
            : currentContent + "<br/><br/>" + formattedHtml;

          editorRef.current.innerHTML = updatedHtml;
          updateDocContent(updatedHtml);
        }

        setShowAiModal(false);
        setAiPrompt("");
      }
    } catch (err) {
      console.error("Erreur génération IA Docs:", err);
      alert("Une erreur est survenue lors de la rédaction par l'IA.");
    } finally {
      setIsAiGenerating(false);
    }
  }

  // Word Count & Stats
  const rawText = editorRef.current?.innerText || "";
  const wordCount = rawText.trim() ? rawText.trim().split(/\s+/).length : 0;
  const charCount = rawText.length;

  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-100 rounded-2xl overflow-hidden border border-white/10 select-none">
      {/* Hidden File Input for Importing Documents */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".doc,.docx,.txt,.md,.html,.htm,.json,.csv"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleImportFile(e.target.files[0]);
          }
        }}
      />

      {/* Toast Notification Banner */}
      {saveNotification && (
        <div className="bg-emerald-500 text-white text-xs font-bold px-4 py-2 flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top duration-200 shrink-0">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{saveNotification}</span>
          </div>
          <button onClick={() => setSaveNotification(null)} className="text-white/80 hover:text-white">✕</button>
        </div>
      )}

      {/* Top Header App Bar */}
      <div className="bg-slate-900/90 border-b border-white/10 px-4 py-2.5 flex items-center justify-between gap-3 shrink-0 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <FileText className="w-5 h-5" />
          </div>

          <div className="min-w-0 flex flex-col">
            <input
              type="text"
              value={activeDoc?.title || ""}
              onChange={(e) => updateDocTitle(e.target.value)}
              className="bg-transparent text-sm font-bold text-white focus:outline-none focus:bg-white/10 px-2 py-0.5 rounded border border-transparent focus:border-cyan-400/50 truncate"
              placeholder="Titre du document..."
            />
            <div className="flex items-center gap-2 text-[10px] text-slate-400 px-2">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Enregistré
              </span>
              <span>•</span>
              <span>{wordCount} mots</span>
              <span>•</span>
              <span>{charCount} caractères</span>
            </div>
          </div>
        </div>

        {/* Action Header Buttons */}
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-semibold transition-all active:scale-95"
            title="Importer un fichier (.doc, .docx, .txt, .html)"
          >
            <FileUp className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Importer Fichier</span>
          </button>

          <button
            onClick={saveToNexusFiles}
            disabled={isExporting}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 active:scale-95"
            title="Enregistrer et sauvegarder dans l'application Fichiers"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Enregistrer</span>
          </button>

          <button
            onClick={handleDirectDownloadDoc}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl nx-grad text-white text-xs font-bold hover:opacity-90 transition-all shadow-md active:scale-95"
            title="Télécharger sur ton ordinateur"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Télécharger</span>
          </button>

          <button
            onClick={() => setShowAiModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl nx-grad text-white text-xs font-bold hover:opacity-95 shadow-md shadow-purple-600/20 transition-all active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">IA Rédaction</span>
          </button>

          <button
            onClick={handlePrint}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-colors"
            title="Imprimer / Exporter PDF"
          >
            <Printer className="w-4 h-4" />
          </button>

          <button
            onClick={createNewDoc}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nouveau</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 flex min-h-0 divide-x divide-white/10">
        {/* Left Documents Drawer */}
        <div className="w-48 bg-slate-900/60 p-2.5 flex flex-col justify-between shrink-0 hidden md:flex">
          <div className="space-y-2">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 pt-1">
              Mes Documents ({docs.length})
            </div>

            <div className="space-y-1 max-h-[380px] overflow-y-auto pr-1 [scrollbar-width:thin]">
              {docs.map((doc) => {
                const isActive = doc.id === activeDocId;
                return (
                  <div
                    key={doc.id}
                    onClick={() => setActiveDocId(doc.id)}
                    className={`group w-full flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-all ${
                      isActive
                        ? "bg-blue-600/30 text-cyan-200 border border-blue-500/40 font-semibold"
                        : "text-slate-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-cyan-400" : "text-slate-400"}`} />
                      <span className="truncate text-[11px]">{doc.title}</span>
                    </div>

                    {docs.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteDoc(doc.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-rose-400 transition-opacity"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Editor Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-950">
          {/* Rich Text Toolbar */}
          <div className="p-2 bg-slate-900/80 border-b border-white/10 flex flex-wrap items-center gap-1 text-slate-300 text-xs shadow-inner">
            {/* History */}
            <button onClick={() => exec("undo")} className="p-1.5 rounded hover:bg-white/10" title="Annuler (Ctrl+Z)">
              <Undo className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => exec("redo")} className="p-1.5 rounded hover:bg-white/10" title="Rétablir (Ctrl+Y)">
              <Redo className="w-3.5 h-3.5" />
            </button>

            <div className="h-4 w-px bg-white/15 mx-1" />

            {/* Font Family Select */}
            <select
              onChange={(e) => exec("fontName", e.target.value)}
              className="bg-black/60 text-slate-200 text-xs px-2 py-1 rounded border border-white/15 focus:outline-none"
            >
              {FONTS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.name}
                </option>
              ))}
            </select>

            {/* Headings Select */}
            <select
              onChange={(e) => exec("formatBlock", e.target.value)}
              className="bg-black/60 text-slate-200 text-xs px-2 py-1 rounded border border-white/15 focus:outline-none"
            >
              <option value="p">Texte Normal</option>
              <option value="h1">Titre 1 (Grand)</option>
              <option value="h2">Titre 2 (Moyen)</option>
              <option value="h3">Titre 3 (Petit)</option>
            </select>

            <div className="h-4 w-px bg-white/15 mx-1" />

            {/* Basic Style Toggle */}
            <button onClick={() => exec("bold")} className="p-1.5 rounded hover:bg-white/10 font-bold" title="Gras (Ctrl+B)">
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => exec("italic")} className="p-1.5 rounded hover:bg-white/10 italic" title="Italique (Ctrl+I)">
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => exec("underline")} className="p-1.5 rounded hover:bg-white/10 underline" title="Souligné (Ctrl+U)">
              <Underline className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => exec("strikeThrough")} className="p-1.5 rounded hover:bg-white/10 line-through" title="Barré">
              <Strikethrough className="w-3.5 h-3.5" />
            </button>

            <div className="h-4 w-px bg-white/15 mx-1" />

            {/* Text Color Picker */}
            <div className="flex items-center gap-1 bg-black/40 px-1.5 py-0.5 rounded border border-white/10">
              <Palette className="w-3.5 h-3.5 text-cyan-400" />
              <input
                type="color"
                onChange={(e) => exec("foreColor", e.target.value)}
                className="w-4 h-4 rounded cursor-pointer bg-transparent border-0"
                title="Couleur du texte"
              />
            </div>

            {/* Highlight Color Picker */}
            <div className="flex items-center gap-1 bg-black/40 px-1.5 py-0.5 rounded border border-white/10">
              <Highlighter className="w-3.5 h-3.5 text-amber-400" />
              <input
                type="color"
                onChange={(e) => exec("hiliteColor", e.target.value)}
                className="w-4 h-4 rounded cursor-pointer bg-transparent border-0"
                title="Surlignage"
              />
            </div>

            <div className="h-4 w-px bg-white/15 mx-1" />

            {/* Alignments */}
            <button onClick={() => exec("justifyLeft")} className="p-1.5 rounded hover:bg-white/10" title="Aligner à gauche">
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => exec("justifyCenter")} className="p-1.5 rounded hover:bg-white/10" title="Centrer">
              <AlignCenter className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => exec("justifyRight")} className="p-1.5 rounded hover:bg-white/10" title="Aligner à droite">
              <AlignRight className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => exec("justifyFull")} className="p-1.5 rounded hover:bg-white/10" title="Justifier">
              <AlignJustify className="w-3.5 h-3.5" />
            </button>

            <div className="h-4 w-px bg-white/15 mx-1" />

            {/* Lists & Structures */}
            <button onClick={() => exec("insertUnorderedList")} className="p-1.5 rounded hover:bg-white/10" title="Liste à puces">
              <List className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => exec("insertOrderedList")} className="p-1.5 rounded hover:bg-white/10" title="Liste numérotée">
              <ListOrdered className="w-3.5 h-3.5" />
            </button>
            <button onClick={insertBlockquote} className="p-1.5 rounded hover:bg-white/10" title="Citation">
              <Quote className="w-3.5 h-3.5" />
            </button>
            <button onClick={insertHorizontalRule} className="p-1.5 rounded hover:bg-white/10" title="Ligne de séparation">
              <Minus className="w-3.5 h-3.5" />
            </button>

            <div className="h-4 w-px bg-white/15 mx-1" />

            {/* Inserts */}
            <button onClick={insertTable} className="p-1.5 rounded hover:bg-white/10 text-emerald-400" title="Insérer un Tableau">
              <TableIcon className="w-3.5 h-3.5" />
            </button>
            <button onClick={insertImagePrompt} className="p-1.5 rounded hover:bg-white/10 text-sky-400" title="Insérer une Image">
              <ImageIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Page Document Container (A4 Printable Style) */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-950 flex justify-center [scrollbar-width:thin]">
            <div className="w-full max-w-[800px] min-h-[900px] bg-slate-900/95 text-slate-100 rounded-2xl p-8 md:p-12 border border-white/15 shadow-2xl space-y-4 focus:outline-none focus:ring-1 focus:ring-cyan-500/50">
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={() => {
                  if (editorRef.current) {
                    updateDocContent(editorRef.current.innerHTML);
                  }
                }}
                className="w-full min-h-[800px] focus:outline-none text-sm md:text-base leading-relaxed text-slate-200 font-sans space-y-4 prose prose-invert max-w-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* AI Assistant Generator Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowAiModal(false); }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAiGenerate();
            }}
            className="w-full max-w-md bg-slate-900 border border-purple-500/30 rounded-2xl p-5 shadow-2xl space-y-4 animate-scale-up"
          >
            <div className="flex items-center gap-2 text-purple-400">
              <Sparkles className="w-5 h-5" />
              <h3 className="text-sm font-bold text-white">Assistant Rédaction IA</h3>
            </div>
            <p className="text-xs text-slate-400">
              Décrivez ce que tu souhaitez rédiger (ex: "Rédige une histoire pour un enfant avant de dormir" ou "Crée un compte-rendu").
            </p>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Ce que tu veux écrire…"
              className="w-full h-28 p-3 rounded-xl bg-black/60 border border-white/20 text-xs text-white focus:outline-none focus:border-purple-400 resize-none leading-relaxed"
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="px-3.5 py-2 rounded-xl bg-white/10 text-xs font-semibold text-slate-300 hover:bg-white/20 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isAiGenerating || !aiPrompt.trim()}
                className="px-4 py-2 rounded-xl nx-grad text-xs font-bold text-white hover:opacity-95 disabled:opacity-40 flex items-center gap-2 shadow-lg shadow-purple-600/20 active:scale-95 transition-all"
              >
                {isAiGenerating ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Rédaction par l'IA...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Générer & Insérer</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

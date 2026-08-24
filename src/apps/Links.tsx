import { useState, useEffect, type FormEvent } from "react";
import {
  Briefcase,
  Search,
  Plus,
  ExternalLink,
  Copy,
  Check,
  Trash2,
  Bookmark,
  Sparkles,
  Code,
  MessageSquare,
  FileText,
  Folder,
  Globe
} from "lucide-react";
import { openAiWindow } from "../lib/tauri";

interface WorkLink {
  id: string;
  name: string;
  url: string;
  category: string;
  iconLetter?: string;
  custom?: boolean;
}

const DEFAULT_WORK_LINKS: WorkLink[] = [
  // Bureautique
  { id: "1", name: "Google Docs", url: "https://docs.google.com", category: "Bureautique & Docs" },
  { id: "2", name: "Google Drive", url: "https://drive.google.com", category: "Bureautique & Docs" },
  { id: "3", name: "Notion", url: "https://www.notion.so", category: "Bureautique & Docs" },
  { id: "4", name: "Canva Pro", url: "https://www.canva.com", category: "Bureautique & Docs" },
  { id: "5", name: "Microsoft 365", url: "https://www.office.com", category: "Bureautique & Docs" },

  // Dev & IA
  { id: "6", name: "GitHub", url: "https://github.com", category: "Développement & IA" },
  { id: "7", name: "StackOverflow", url: "https://stackoverflow.com", category: "Développement & IA" },
  { id: "8", name: "DevDocs Documentation", url: "https://devdocs.io", category: "Développement & IA" },
  { id: "9", name: "ChatGPT Studio", url: "https://chatgpt.com", category: "Développement & IA" },
  { id: "10", name: "Claude AI", url: "https://claude.ai", category: "Développement & IA" },
  { id: "11", name: "Google AI Studio", url: "https://ai.google.dev", category: "Développement & IA" },
  { id: "12", name: "Vercel Dashboard", url: "https://vercel.com", category: "Développement & IA" },

  // Communication
  { id: "13", name: "Slack", url: "https://app.slack.com", category: "Communication & Réunion" },
  { id: "14", name: "Microsoft Teams", url: "https://teams.microsoft.com", category: "Communication & Réunion" },
  { id: "15", name: "Google Meet", url: "https://meet.google.com", category: "Communication & Réunion" },
  { id: "16", name: "Gmail Pro", url: "https://mail.google.com", category: "Communication & Réunion" },

  // Gestion de Projet
  { id: "17", name: "Figma Studio", url: "https://www.figma.com", category: "Design & Projets" },
  { id: "18", name: "Trello Workspace", url: "https://trello.com", category: "Design & Projets" },
  { id: "19", name: "Jira Software", url: "https://www.atlassian.com/software/jira", category: "Design & Projets" },
  { id: "20", name: "Linear App", url: "https://linear.app", category: "Design & Projets" },

  // Outils Utiles
  { id: "21", name: "DeepL Traduction", url: "https://www.deepl.com", category: "Outils Utiles" },
  { id: "22", name: "ILovePDF Tools", url: "https://www.ilovepdf.com", category: "Outils Utiles" },
  { id: "23", name: "Remove.bg", url: "https://www.remove.bg", category: "Outils Utiles" },
  { id: "24", name: "WeTransfer", url: "https://wetransfer.com", category: "Outils Utiles" },
];

export default function Links() {
  const [links, setLinks] = useState<WorkLink[]>(() => {
    try {
      const saved = localStorage.getItem("nexus_work_links");
      return saved ? JSON.parse(saved) : DEFAULT_WORK_LINKS;
    } catch {
      return DEFAULT_WORK_LINKS;
    }
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Tous");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New Link Modal / Form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newCat, setNewCat] = useState("Bureautique & Docs");

  const saveLinks = (updated: WorkLink[]) => {
    setLinks(updated);
    try {
      localStorage.setItem("nexus_work_links", JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddLink = (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newUrl.trim()) return;

    const formattedUrl = newUrl.startsWith("http://") || newUrl.startsWith("https://")
      ? newUrl
      : `https://${newUrl}`;

    const newLink: WorkLink = {
      id: `custom-${Date.now()}`,
      name: newName.trim(),
      url: formattedUrl,
      category: newCat,
      custom: true,
    };

    saveLinks([newLink, ...links]);
    setNewName("");
    setNewUrl("");
    setShowAddForm(false);
  };

  const handleDeleteLink = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    saveLinks(links.filter((l) => l.id !== id));
  };

  const categories = ["Tous", ...Array.from(new Set(links.map((l) => l.category)))];

  const filteredLinks = links.filter((link) => {
    const matchesCat = selectedCategory === "Tous" || link.category === selectedCategory;
    const matchesSearch =
      link.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      link.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      link.url.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleCopy = (url: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex h-full w-full bg-slate-950 text-slate-100 flex-col overflow-hidden">
      {/* Top Bar Header */}
      <div className="p-3.5 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20">
            <Briefcase className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-extrabold text-white">Liens Utiles & Portails Travail</h2>
            <p className="text-[10px] text-slate-400">Accès direct aux outils de productivité</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-1 max-w-xs">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Chercher un outil..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/60"
            />
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition-all shrink-0 active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ajouter</span>
          </button>
        </div>
      </div>

      {/* Category Pills Bar */}
      <div className="px-4 py-2 border-b border-slate-800/60 bg-slate-900/40 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition-all ${
              selectedCategory === cat
                ? "bg-cyan-500 text-slate-950 shadow-sm"
                : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Add New Link Form Drawer */}
      {showAddForm && (
        <form onSubmit={handleAddLink} className="p-4 bg-slate-900 border-b border-slate-800 space-y-3">
          <h3 className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            <span>Ajouter un Lien Personnalisé</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nom de l'outil (ex: Slack Pro)"
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              required
            />
            <input
              type="text"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="URL (ex: https://slack.com)"
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              required
            />
            <select
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="Bureautique & Docs">Bureautique & Docs</option>
              <option value="Développement & IA">Développement & IA</option>
              <option value="Communication & Réunion">Communication & Réunion</option>
              <option value="Design & Projets">Design & Projets</option>
              <option value="Outils Utiles">Outils Utiles</option>
            </select>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 bg-slate-950 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-semibold"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-cyan-500 text-slate-950 font-bold rounded-xl text-xs shadow-md"
            >
              Enregistrer
            </button>
          </div>
        </form>
      )}

      {/* Main Grid Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {filteredLinks.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            Aucun lien trouvé pour cette recherche.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredLinks.map((link) => (
              <div
                key={link.id}
                onClick={() => window.open(link.url, "_blank")}
                className="group relative p-3.5 bg-slate-900/80 border border-slate-800/80 rounded-2xl hover:border-cyan-500/50 hover:bg-slate-900 transition-all cursor-pointer shadow-md flex flex-col justify-between gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 border border-slate-700/60 flex items-center justify-center text-cyan-300 font-black text-sm shrink-0 group-hover:scale-105 transition-transform shadow-inner">
                      {link.name.charAt(0)}
                    </div>
                    <div className="truncate">
                      <h4 className="text-xs font-bold text-white group-hover:text-cyan-200 truncate transition-colors">
                        {link.name}
                      </h4>
                      <p className="text-[10px] text-slate-500 truncate">{link.category}</p>
                    </div>
                  </div>

                  <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 shrink-0 transition-colors" />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[10px] text-slate-500">
                  <span className="truncate max-w-[120px] font-mono text-[9px] text-slate-500">
                    {link.url.replace(/^https?:\/\//, "")}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleCopy(link.url, link.id, e)}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors"
                      title="Copier l'URL"
                    >
                      {copiedId === link.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>

                    {link.custom && (
                      <button
                        onClick={(e) => handleDeleteLink(link.id, e)}
                        className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import {
  FileText,
  Download,
  Eye,
  BookOpen,
  Sparkles,
  ExternalLink,
  Printer,
  Check,
  Search,
  FolderDown,
  Info,
  Layers,
  HelpCircle,
} from "lucide-react";
import { putFile } from "../lib/fileStore";
import { useWindows } from "../os/useWindows";

interface DocumentPDF {
  id: string;
  title: string;
  category: string;
  date: string;
  size: string;
  description: string;
  contentHtml: string;
}

const DOCUMENTATION_SITE_PDF: DocumentPDF = {
  id: "guide-nexus-os-2026",
  title: "Guide Complet & Manuel d'Utilisation - Nexus OS.pdf",
  category: "Documentation Officielle",
  date: "2026",
  size: "2.4 Mo",
  description:
    "Manuel d'utilisation officiel en français expliquant le fonctionnement, les fonctionnalités, les raccourcis et les applications de Nexus OS.",
  contentHtml: `
    <div style="font-family: Arial, sans-serif; padding: 30px; color: #0f172a; max-width: 800px; margin: auto; background: white; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
      <div style="text-align: center; border-bottom: 2px solid #0284c7; padding-bottom: 20px; margin-bottom: 25px;">
        <h1 style="color: #0369a1; font-size: 28px; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px;">Nexus OS - Manuel d'Utilisation Officiel</h1>
        <p style="color: #64748b; font-size: 14px;">Conçu & Développé par Aharon Dray • Système d'Exploitation Virtuel Web v2.0</p>
      </div>

      <div style="margin-bottom: 25px;">
        <h2 style="color: #0284c7; font-size: 20px; border-left: 4px solid #0284c7; padding-left: 10px;">1. Présentation de Nexus OS</h2>
        <p style="line-height: 1.6; color: #334155; font-size: 14px;">
          Nexus OS est un environnement web multitâche complet conçu pour offrir une expérience fluide, rapide et sécurisée. Il combine la gestion de fichiers locaux, la suite de création de documents, l'assistant intelligent Nexus AI Pro, un lecteur multimédia et de nombreux outils de productivité.
        </p>
      </div>

      <div style="margin-bottom: 25px;">
        <h2 style="color: #0284c7; font-size: 20px; border-left: 4px solid #0284c7; padding-left: 10px;">2. Guide des Applications Principales</h2>
        
        <div style="background: #f8fafc; p-3; padding: 12px; border-radius: 8px; margin-bottom: 10px; border: 1px solid #e2e8f0;">
          <h3 style="margin: 0; color: #0f172a; font-size: 16px;">📁 Gestionnaire de Fichiers</h3>
          <p style="margin: 5px 0 0 0; color: #475569; font-size: 13px;">Permet d'importer, classer, prévisualiser et télécharger vos documents (PDF, Word, Excel, PowerPoint, Images, Vidéos, Audios). Tout votre stockage reste privé dans votre navigateur.</p>
        </div>

        <div style="background: #f8fafc; padding: 12px; border-radius: 8px; margin-bottom: 10px; border: 1px solid #e2e8f0;">
          <h3 style="margin: 0; color: #0f172a; font-size: 16px;">📝 Créateur de Documents</h3>
          <p style="margin: 5px 0 0 0; color: #475569; font-size: 13px;">Traitement de texte enrichi avec assistance IA, formatage automatique, importation de fichiers Word/Textes et enregistrement direct dans le système.</p>
        </div>

        <div style="background: #f8fafc; padding: 12px; border-radius: 8px; margin-bottom: 10px; border: 1px solid #e2e8f0;">
          <h3 style="margin: 0; color: #0f172a; font-size: 16px;">🎵 Musique & Radios Ambiance</h3>
          <p style="margin: 5px 0 0 0; color: #475569; font-size: 13px;">Moteur de recherche musical mondial (artistes, titres, extraits), flux radios de concentration (Lo-Fi, Synthwave, Jazz) et lecteur de liens YouTube/MP3 direct.</p>
        </div>

        <div style="background: #f8fafc; padding: 12px; border-radius: 8px; margin-bottom: 10px; border: 1px solid #e2e8f0;">
          <h3 style="margin: 0; color: #0f172a; font-size: 16px;">🧠 Assistant Nexus AI Pro</h3>
          <p style="margin: 5px 0 0 0; color: #475569; font-size: 13px;">IA conversationnelle avancée capable d'analyser vos fichiers, de rédiger des rapports, des lettres, de résoudre des problèmes et d'effectuer des recherches sur le Web.</p>
        </div>
      </div>

      <div style="margin-bottom: 25px;">
        <h2 style="color: #0284c7; font-size: 20px; border-left: 4px solid #0284c7; padding-left: 10px;">3. Raccourcis & Astuces de Navigation</h2>
        <ul style="line-height: 1.8; color: #334155; font-size: 13px; padding-left: 20px;">
          <li><b>Dynamic Control Pro :</b> Situé en haut au centre de l'écran, survollez-le pour accéder aux contrôles rapides.</li>
          <li><b>Barre des Tâches & Dock :</b> Cliquez sur l'icône de l'application pour ouvrir ou réduire une fenêtre.</li>
          <li><b>Glisser-Déposer :</b> Déposez directement des fichiers depuis votre ordinateur dans l'application Fichiers.</li>
        </ul>
      </div>

      <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8;">
        Document généré automatiquement par Nexus OS • Aharon Dray • 2026
      </div>
    </div>
  `,
};

const EXTRA_DOCS: DocumentPDF[] = [
  DOCUMENTATION_SITE_PDF,
  {
    id: "annale-brevet-maths",
    title: "Sujet & Corrigé Type - Brevet Mathématiques 2026.pdf",
    category: "Mathématiques",
    date: "2026",
    size: "1.8 Mo",
    description: "Épreuve complète de mathématiques avec exercices de géométrie, probabilités, algorithmique et fonctions.",
    contentHtml: `
      <div style="font-family: Arial, sans-serif; padding: 25px; color: #0f172a; max-width: 800px; margin: auto; background: white;">
        <h2 style="color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 8px;">Annales Brevet 2026 - Mathématiques</h2>
        <p><b>Durée :</b> 2 heures • <b>Barème :</b> 100 points</p>
        <hr style="border: 0; border-top: 1px solid #cbd5e1; margin: 15px 0;" />
        <h3>Exercice 1 (20 points) - Théorème de Pythagore et Trigonométrie</h3>
        <p>Un triangle ABC est rectangle en A. On donne AB = 6 cm et AC = 8 cm.</p>
        <ol>
          <li>Calculer la longueur de l'hypoténuse BC.</li>
          <li>Calculer la mesure de l'angle ABC arrondie au degré près.</li>
        </ol>
        <h3>Exercice 2 (20 points) - Algorithmique et Probabilités</h3>
        <p>On tire au hasard une carte parmi un jeu de 32 cartes.</p>
        <p>Quelle est la probabilité d'obtenir un As ? Un Cœur ?</p>
      </div>
    `,
  },
  {
    id: "annale-bac-francais",
    title: "Sujets & Méthode - Bac Français Dissertation & Commmentaire.pdf",
    category: "Français",
    date: "2026",
    size: "2.1 Mo",
    description: "Guide méthodologique complet pour réussir l'écrit du Baccalauréat de Français.",
    contentHtml: `
      <div style="font-family: Arial, sans-serif; padding: 25px; color: #0f172a; max-width: 800px; margin: auto; background: white;">
        <h2 style="color: #065f46; border-bottom: 2px solid #065f46; padding-bottom: 8px;">Fiche Méthode - Baccalauréat Français 2026</h2>
        <p><b>Objet d'étude :</b> La poésie du XIXe au XXIe siècle / Le théâtre</p>
        <hr style="border: 0; border-top: 1px solid #cbd5e1; margin: 15px 0;" />
        <h3>1. La Structuration du Commentaire Composé</h3>
        <ul>
          <li><b>Introduction :</b> Amorce, Présentation de l'auteur et de l'œuvre, Problématique, Annonce du plan.</li>
          <li><b>Développement :</b> 2 ou 3 axes organisés en sous-parties argumentées avec citations textuelles.</li>
          <li><b>Conclusion :</b> Bilan synthétique et ouverture vers une perspective littéraire.</li>
        </ul>
      </div>
    `,
  },
];

export default function Annales() {
  const [selectedDoc, setSelectedDoc] = useState<DocumentPDF>(DOCUMENTATION_SITE_PDF);
  const [filterCategory, setFilterCategory] = useState<string>("Toutes");
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const categories = ["Toutes", "Documentation Officielle", "Mathématiques", "Français"];

  const filteredDocs = EXTRA_DOCS.filter(
    (d) => filterCategory === "Toutes" || d.category === filterCategory
  );

  function triggerDownloadPdf(doc: DocumentPDF) {
    try {
      const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${doc.title}</title>
  <style>
    @media print {
      body { background: white !important; color: black !important; padding: 0 !important; }
      .no-print { display: none !important; }
    }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; background: #f8fafc; color: #0f172a; padding: 30px; margin: 0; line-height: 1.6; }
    .print-btn { background: #0284c7; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; margin-bottom: 20px; font-size: 14px; }
  </style>
</head>
<body>
  <div className="no-print" style="margin-bottom: 20px; text-align: center;">
    <button onclick="window.print()" class="print-btn">📄 Imprimer / Enregistrer en PDF (iPad & PC)</button>
  </div>
  ${doc.contentHtml}
</body>
</html>`;

      const blob = new Blob([fullHtml], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, "_blank");
      
      if (!win) {
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = doc.title;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          if (document.body.contains(a)) document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 2000);
      }

      setDownloadSuccess(`Ouverture de "${doc.title}" (Prêt pour enregistrement PDF) !`);
      setTimeout(() => setDownloadSuccess(null), 3000);
    } catch (err) {
      console.error("Erreur téléchargement:", err);
    }
  }

  async function saveToNexusFiles(doc: DocumentPDF) {
    try {
      const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${doc.title}</title>
</head>
<body style="font-family: system-ui, sans-serif; padding: 20px; background: #ffffff; color: #0f172a;">
  ${doc.contentHtml}
</body>
</html>`;

      const blob = new Blob([fullHtml], { type: "text/html" });
      await putFile({
        id: `annale-${doc.id}-${Date.now()}`,
        name: doc.title.endsWith(".html") ? doc.title : doc.title.replace(/\.pdf$/i, ".html"),
        size: blob.size,
        type: "text/html",
        extension: "HTML",
        folder: "Documents",
        addedAt: Date.now(),
        blob,
      });

      setDownloadSuccess(`"${doc.title}" enregistré dans l'application Fichiers !`);
      setTimeout(() => setDownloadSuccess(null), 3000);
    } catch (e) {
      console.error("Erreur sauvegarde:", e);
    }
  }

  return (
    <div className="flex h-full flex-col gap-3 p-1 bg-slate-950 text-white rounded-xl">
      {/* Toast banner */}
      {downloadSuccess && (
        <div className="bg-emerald-600 text-white text-xs font-bold p-2.5 rounded-xl flex items-center justify-between shrink-0 shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{downloadSuccess}</span>
          </div>
          <button onClick={() => setDownloadSuccess(null)} className="text-white/80 hover:text-white">✕</button>
        </div>
      )}

      {/* Categories Filter */}
      <div className="flex items-center justify-between gap-2 bg-slate-900/90 p-2 rounded-xl border border-white/10 shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none]">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                filterCategory === cat
                  ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                  : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <button
          onClick={() => triggerDownloadPdf(selectedDoc)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl nx-grad text-white text-xs font-bold hover:opacity-90 transition-all shadow-md active:scale-95 shrink-0"
          title="Télécharger le PDF sélectionné"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Télécharger PDF</span>
        </button>
      </div>

      {/* Main Split Content view */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1 min-h-0">
        {/* Left Documents List */}
        <div className="md:col-span-1 flex flex-col gap-2 overflow-y-auto pr-1 [scrollbar-width:thin]">
          {filteredDocs.map((doc) => {
            const isSelected = selectedDoc.id === doc.id;
            return (
              <div
                key={doc.id}
                onClick={() => setSelectedDoc(doc)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? "bg-red-600/20 border-red-500/60 shadow-md shadow-red-600/10"
                    : "bg-slate-900/60 border-white/10 hover:bg-slate-900 hover:border-white/20"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <FileText className={`w-4 h-4 shrink-0 ${isSelected ? "text-red-400" : "text-slate-400"}`} />
                  <span className="text-xs font-bold text-white truncate">{doc.title}</span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-2">
                  {doc.description}
                </p>
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>{doc.category}</span>
                  <span>{doc.size}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right PDF Preview Viewer */}
        <div className="md:col-span-2 flex flex-col rounded-xl border border-white/10 bg-slate-900/70 overflow-hidden">
          {/* Header Bar */}
          <div className="flex items-center justify-between gap-2 p-3 bg-slate-900 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <BookOpen className="w-4 h-4 text-red-400 shrink-0" />
              <span className="text-xs font-bold text-white truncate">{selectedDoc.title}</span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => saveToNexusFiles(selectedDoc)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold hover:bg-cyan-600/30"
                title="Enregistrer dans Fichiers"
              >
                <FolderDown className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Dans Fichiers</span>
              </button>

              <button
                onClick={() => triggerDownloadPdf(selectedDoc)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-500 shadow-md active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Télécharger</span>
              </button>
            </div>
          </div>

          {/* Interactive Document Preview Box */}
          <div className="flex-1 overflow-y-auto p-4 bg-slate-950/80 [scrollbar-width:thin]">
            <div
              className="preview-doc-body shadow-2xl rounded-xl"
              dangerouslySetInnerHTML={{ __html: selectedDoc.contentHtml }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

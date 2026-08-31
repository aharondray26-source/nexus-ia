import { useEffect, useState, useRef, type DragEvent, type FormEvent } from "react";
import { usePersistentState } from "../lib/persist";
import { useWindows } from "../os/useWindows";
import {
  listFiles,
  putFile,
  deleteFile,
  setFileFolder,
  renameFile,
  getFile,
  type FileMeta,
} from "../lib/fileStore";
import {
  Folder,
  FolderPlus,
  File,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  Code,
  Trash2,
  Edit3,
  Download,
  ExternalLink,
  Search,
  Grid,
  List,
  ChevronRight,
  ArrowLeft,
  UploadCloud,
  Plus,
  FileSpreadsheet,
  HardDrive,
  Sparkles,
  Mail as MailIcon,
  Cloud,
} from "lucide-react";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function extensionOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toUpperCase() : "?";
}

function getFileIcon(type: string, ext: string) {
  if (type.startsWith("image/")) return <ImageIcon className="w-5 h-5 text-sky-400" />;
  if (type.startsWith("video/")) return <Film className="w-5 h-5 text-pink-400" />;
  if (type.startsWith("audio/")) return <Music className="w-5 h-5 text-purple-400" />;
  if (type === "application/pdf" || ext === "PDF") return <FileText className="w-5 h-5 text-rose-400" />;
  if (/^(CSV|XLS|XLSX)$/.test(ext)) return <FileSpreadsheet className="w-5 h-5 text-emerald-400" />;
  if (/^(TXT|MD|JSON|JS|TS|TSX|CSS|HTML|PY|C|CPP|JAVA)$/.test(ext))
    return <Code className="w-5 h-5 text-emerald-400" />;
  return <File className="w-5 h-5 text-slate-400" />;
}

export default function Files() {
  const [files, setFiles] = useState<FileMeta[]>([]);
  const [folders, setFolders] = usePersistentState<string[]>("nexus.folders", [
    "General",
    "Documents",
    "Images",
    "Code",
  ]);
  const [currentFolder, setCurrentFolder] = useState<string>("General");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const openFile = useWindows((s) => s.openFile);
  const openApp = useWindows((s) => s.openApp);
  const [cloudFiles, setCloudFiles] = usePersistentState<{ name: string; size: string }[]>(
    "nexus.cloudFiles",
    []
  );
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  async function handleSendByMail(file: FileMeta) {
    openApp("mail", { width: 840, height: 600 });
    setSyncNotice(`Fichier "${file.name}" attaché à Mail !`);
    setTimeout(() => setSyncNotice(null), 3500);
  }

  async function handleSaveToCloud(file: FileMeta) {
    const sizeStr = formatSize(file.size);
    if (!cloudFiles.some((c) => c.name === file.name)) {
      setCloudFiles((prev) => [{ name: file.name, size: sizeStr }, ...prev]);
    }
    openApp("cloud", { width: 780, height: 580 });
    setSyncNotice(`"${file.name}" synchronisé sur Nexus Cloud !`);
    setTimeout(() => setSyncNotice(null), 3500);
  }

  async function refresh() {
    setFiles(await listFiles());
  }

  useEffect(() => {
    refresh();
    const handleFilesUpdated = () => {
      refresh();
    };
    window.addEventListener("nexus:files-updated", handleFilesUpdated);
    return () => window.removeEventListener("nexus:files-updated", handleFilesUpdated);
  }, []);

  async function addFiles(fileList: FileList, targetFolder = currentFolder) {
    for (const file of Array.from(fileList)) {
      await putFile({
        id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
        extension: extensionOf(file.name),
        folder: targetFolder,
        addedAt: Date.now(),
        blob: file,
      });
    }
    await refresh();
  }

  function handleCreateFolder(e: FormEvent) {
    e.preventDefault();
    const name = newFolderName.trim();
    if (!name || folders.includes(name)) return;
    setFolders((prev) => [...prev, name]);
    setCurrentFolder(name);
    setNewFolderName("");
    setShowFolderModal(false);
  }

  async function handleDeleteFolder(folderName: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (folderName === "General") return;
    if (confirm(`Voulez-vous supprimer le dossier "${folderName}" ? Ses fichiers seront déplacés vers General.`)) {
      const filesInFolder = files.filter((f) => f.folder === folderName);
      for (const f of filesInFolder) {
        await setFileFolder(f.id, "General");
      }
      setFolders((prev) => prev.filter((f) => f !== folderName));
      if (currentFolder === folderName) setCurrentFolder("General");
      await refresh();
    }
  }

  async function handleRenameFile(id: string) {
    if (!editingName.trim()) return;
    await renameFile(id, editingName.trim());
    setEditingFileId(null);
    setEditingName("");
    await refresh();
  }

  async function handleDownloadFile(id: string, name: string) {
    try {
      const file = await getFile(id);
      if (!file) return;
      const safeBlob = file.blob instanceof Blob ? file.blob : new Blob([file.blob], { type: file.type || "application/octet-stream" });
      const url = URL.createObjectURL(safeBlob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = name;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (document.body.contains(a)) document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 2500);
    } catch (err) {
      console.error("Erreur téléchargement fichier:", err);
    }
  }

  // Drag and drop onto folder cards or sidebar
  function handleDragOverFolder(e: DragEvent, folderName: string) {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTarget(folderName);
  }

  function handleDragLeaveFolder(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTarget(null);
  }

  async function handleDropOnFolder(e: DragEvent, targetFolder: string) {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTarget(null);

    // If files dropped from OS
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await addFiles(e.dataTransfer.files, targetFolder);
      return;
    }

    // If existing file dragged inside app
    const draggedFileId = e.dataTransfer.getData("text/nexus-file-id");
    if (draggedFileId) {
      await setFileFolder(draggedFileId, targetFolder);
      await refresh();
    }
  }

  // Filter files by folder & search query
  const filteredFiles = files.filter((f) => {
    const matchesFolder = currentFolder === "ALL" ? true : f.folder === currentFolder;
    const matchesSearch = searchQuery
      ? f.name.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchesFolder && matchesSearch;
  });

  // Calculate folder counts
  const getFolderCount = (fName: string) => files.filter((x) => x.folder === fName).length;

  return (
    <div className="flex h-full flex-col md:flex-row gap-0 bg-slate-950/60 text-slate-100 rounded-2xl overflow-hidden border border-white/10 select-none">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        multiple
        className="hidden"
        onChange={(e) => e.target.files && addFiles(e.target.files)}
      />

      {/* Sidebar Navigation */}
      <div className="w-full md:w-56 bg-slate-900/90 border-r border-white/10 p-3.5 flex flex-col justify-between shrink-0">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between px-2 pt-1">
            <div className="flex items-center gap-2 text-cyan-400">
              <HardDrive className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider text-white">Explorateur</span>
            </div>
            <button
              onClick={() => setShowFolderModal(true)}
              title="Créer un nouveau dossier"
              className="p-1 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 transition-colors"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
          </div>

          {/* Special Categories */}
          <div className="space-y-1">
            <button
              onClick={() => setCurrentFolder("ALL")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                currentFolder === "ALL"
                  ? "nx-grad text-white font-semibold shadow-md shadow-cyan-600/20"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Tous les fichiers</span>
              </div>
              <span className="text-[10px] bg-black/30 px-2 py-0.5 rounded-full font-mono">
                {files.length}
              </span>
            </button>
          </div>

          {/* User Folders List */}
          <div className="space-y-1 pt-2 border-t border-white/10">
            <div className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Dossiers ({folders.length})
            </div>
            <div className="space-y-0.5 max-h-[220px] overflow-y-auto pr-1 [scrollbar-width:thin]">
              {folders.map((fName) => {
                const count = getFolderCount(fName);
                const isActive = currentFolder === fName;
                const isDragTarget = dragOverTarget === fName;

                return (
                  <div
                    key={fName}
                    onDragOver={(e) => handleDragOverFolder(e, fName)}
                    onDragLeave={handleDragLeaveFolder}
                    onDrop={(e) => handleDropOnFolder(e, fName)}
                    onClick={() => setCurrentFolder(fName)}
                    className={`group w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                      isDragTarget
                        ? "bg-cyan-500/30 border-2 border-cyan-400 scale-[1.02]"
                        : isActive
                        ? "bg-white/15 text-cyan-300 font-semibold border border-cyan-500/30"
                        : "text-slate-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Folder className={`w-4 h-4 shrink-0 ${isActive ? "text-cyan-400 fill-cyan-400/20" : "text-amber-400/80"}`} />
                      <span className="truncate">{fName}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] bg-black/40 px-1.5 py-0.5 rounded-full text-slate-400 font-mono">
                        {count}
                      </span>
                      {fName !== "General" && (
                        <button
                          onClick={(e) => handleDeleteFolder(fName, e)}
                          title="Supprimer le dossier"
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-rose-400 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Action Upload Box */}
        <div className="pt-3 border-t border-white/10">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl nx-grad text-white text-xs font-bold hover:opacity-95 shadow-lg shadow-cyan-500/20 active:scale-98 transition-all"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Importer fichier</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950/80">
        {/* Top Navigation & Action Header */}
        <div className="p-3.5 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-slate-900/50">
          {syncNotice && (
            <div className="w-full mb-1 flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-950/70 px-3 py-1.5 text-xs text-cyan-200 animate-pulse">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>{syncNotice}</span>
            </div>
          )}
          {/* Breadcrumb Path */}
          <div className="flex items-center gap-2 text-xs text-slate-300">
            {currentFolder !== "ALL" && (
              <button
                onClick={() => setCurrentFolder("ALL")}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                title="Retour à tous les fichiers"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            )}
            <span className="text-slate-400 font-mono">Racine</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-bold text-white bg-white/10 px-2 py-0.5 rounded-lg border border-white/10">
              {currentFolder === "ALL" ? "Tous les fichiers" : currentFolder}
            </span>
          </div>

          {/* Search & View Controls */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher..."
                className="w-36 sm:w-48 pl-8 pr-3 py-1.5 rounded-xl bg-black/50 border border-white/15 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 transition-colors"
              />
            </div>

            <div className="flex items-center bg-black/40 rounded-xl p-0.5 border border-white/10">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === "grid" ? "bg-cyan-500/30 text-cyan-300" : "text-slate-400 hover:text-white"
                }`}
                title="Vue Grille"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === "list" ? "bg-cyan-500/30 text-cyan-300" : "text-slate-400 hover:text-white"
                }`}
                title="Vue Liste"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Drop Zone & File/Folder Browser */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverTarget(currentFolder);
          }}
          onDragLeave={() => setDragOverTarget(null)}
          onDrop={(e) => handleDropOnFolder(e, currentFolder === "ALL" ? "General" : currentFolder)}
          className="flex-1 overflow-y-auto p-4 relative [scrollbar-width:thin]"
        >
          {/* Drag Overlay Alert */}
          {dragOverTarget && (
            <div className="absolute inset-0 z-50 bg-cyan-950/80 backdrop-blur-md border-2 border-dashed border-cyan-400 rounded-xl flex flex-col items-center justify-center p-6 text-center animate-fade-in pointer-events-none">
              <UploadCloud className="w-12 h-12 text-cyan-300 animate-bounce mb-2" />
              <p className="text-sm font-bold text-white">Déposer le fichier dans "{dragOverTarget}"</p>
            </div>
          )}

          {/* Folder Cards (Shown in Main view if in "ALL" or if custom folders exist) */}
          {currentFolder === "ALL" && (
            <div className="mb-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Dossiers système</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {folders.map((fName) => (
                  <div
                    key={fName}
                    onClick={() => setCurrentFolder(fName)}
                    onDragOver={(e) => handleDragOverFolder(e, fName)}
                    onDragLeave={handleDragLeaveFolder}
                    onDrop={(e) => handleDropOnFolder(e, fName)}
                    className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-400/50 hover:bg-white/10 transition-all cursor-pointer group flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 truncate">
                      <Folder className="w-8 h-8 text-amber-400 group-hover:scale-105 transition-transform" />
                      <div className="truncate">
                        <p className="text-xs font-bold text-white truncate">{fName}</p>
                        <p className="text-[10px] text-slate-400">{getFolderCount(fName)} élément(s)</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Files Grid or List View */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Fichiers ({filteredFiles.length})
              </h3>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <Plus className="w-3 h-3" />
                Ajouter
              </button>
            </div>

            {filteredFiles.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-2xl p-6 text-center text-slate-400">
                <File className="w-10 h-10 text-slate-500 mb-2" />
                <p className="text-xs font-semibold text-slate-300">Aucun fichier dans ce dossier</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Glisse-déposez tes documents ici ou cliquez sur "Importer"
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all"
                >
                  Choisir un fichier
                </button>
              </div>
            ) : viewMode === "grid" ? (
              /* GRID VIEW */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {filteredFiles.map((f) => (
                  <div
                    key={f.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/nexus-file-id", f.id)}
                    className="group relative p-3 rounded-2xl bg-slate-900/80 border border-white/10 hover:border-cyan-400/60 hover:bg-slate-800/90 transition-all flex flex-col justify-between shadow-lg"
                  >
                    <div
                      onClick={() => openFile(f.id)}
                      className="cursor-pointer space-y-2"
                    >
                      {/* Icon preview box */}
                      <div className="h-20 w-full rounded-xl bg-black/40 border border-white/5 flex items-center justify-center relative overflow-hidden group-hover:scale-98 transition-transform">
                        {getFileIcon(f.type, f.extension)}
                        <span className="absolute top-1.5 right-1.5 text-[9px] font-mono px-1.5 py-0.2 rounded bg-black/60 text-slate-300 border border-white/10">
                          {f.extension}
                        </span>
                      </div>

                      {/* File Info */}
                      <div>
                        {editingFileId === f.id ? (
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="w-full text-xs px-1.5 py-0.5 bg-black border border-cyan-400 rounded text-white"
                              autoFocus
                              onKeyDown={(e) => e.key === "Enter" && handleRenameFile(f.id)}
                            />
                          </div>
                        ) : (
                          <p className="text-xs font-semibold text-white truncate group-hover:text-cyan-300 transition-colors" title={f.name}>
                            {f.name}
                          </p>
                        )}
                        <p className="text-[10px] text-slate-400 mt-0.5">{formatSize(f.size)}</p>
                      </div>
                    </div>

                    {/* Quick Hover Actions Bar */}
                    <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-slate-400">
                      <button
                        onClick={() => handleSendByMail(f)}
                        className="p-1 rounded hover:bg-amber-500/20 hover:text-amber-300 transition-colors"
                        title="Envoyer par Mail"
                      >
                        <MailIcon className="w-3.5 h-3.5 text-amber-400" />
                      </button>
                      <button
                        onClick={() => handleSaveToCloud(f)}
                        className="p-1 rounded hover:bg-blue-500/20 hover:text-blue-300 transition-colors"
                        title="Sauvegarder dans Nexus Cloud"
                      >
                        <Cloud className="w-3.5 h-3.5 text-blue-400" />
                      </button>
                      <button
                        onClick={() => openFile(f.id)}
                        className="p-1 rounded hover:bg-cyan-500/20 hover:text-cyan-300 transition-colors"
                        title="Ouvrir le fichier"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingFileId(f.id);
                          setEditingName(f.name);
                        }}
                        className="p-1 rounded hover:bg-white/10 hover:text-white transition-colors"
                        title="Renommer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDownloadFile(f.id, f.name)}
                        className="p-1 rounded hover:bg-white/10 hover:text-white transition-colors"
                        title="Télécharger"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={async () => {
                          await deleteFile(f.id);
                          await refresh();
                        }}
                        className="p-1 rounded hover:bg-rose-500/20 hover:text-rose-400 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* LIST VIEW */
              <div className="space-y-1.5">
                {filteredFiles.map((f) => (
                  <div
                    key={f.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/nexus-file-id", f.id)}
                    className="p-2.5 rounded-xl bg-slate-900/80 border border-white/10 hover:border-cyan-400/60 hover:bg-slate-800/90 transition-all flex items-center justify-between gap-3 group"
                  >
                    <div
                      onClick={() => openFile(f.id)}
                      className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                    >
                      <div className="p-2 rounded-lg bg-black/40 border border-white/10 shrink-0">
                        {getFileIcon(f.type, f.extension)}
                      </div>
                      <div className="min-w-0 flex-1">
                        {editingFileId === f.id ? (
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="text-xs px-2 py-0.5 bg-black border border-cyan-400 rounded text-white"
                            autoFocus
                            onKeyDown={(e) => e.key === "Enter" && handleRenameFile(f.id)}
                          />
                        ) : (
                          <p className="text-xs font-semibold text-white truncate group-hover:text-cyan-300 transition-colors">
                            {f.name}
                          </p>
                        )}
                        <p className="text-[10px] text-slate-400">
                          {formatSize(f.size)} • Dossier: <span className="text-cyan-400">{f.folder}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openFile(f.id)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 transition-colors"
                        title="Aperçu"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingFileId(f.id);
                          setEditingName(f.name);
                        }}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-colors"
                        title="Renommer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDownloadFile(f.id, f.name)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-colors"
                        title="Télécharger"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={async () => {
                          await deleteFile(f.id);
                          await refresh();
                        }}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Folder Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowFolderModal(false); }}>
          <form
            onSubmit={handleCreateFolder}
            className="w-80 bg-slate-900 border border-white/20 rounded-2xl p-5 shadow-2xl space-y-4 animate-scale-up"
          >
            <div className="flex items-center gap-2 text-cyan-400">
              <FolderPlus className="w-5 h-5" />
              <h3 className="text-sm font-bold text-white">Nouveau dossier</h3>
            </div>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Nom du dossier (ex: Projets)..."
              className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/20 text-xs text-white focus:outline-none focus:border-cyan-400"
              autoFocus
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowFolderModal(false)}
                className="px-3 py-1.5 rounded-xl bg-white/10 text-xs text-slate-300 hover:bg-white/20"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={!newFolderName.trim()}
                className="px-3.5 py-1.5 rounded-xl nx-grad text-xs font-bold text-white disabled:opacity-50"
              >
                Créer
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

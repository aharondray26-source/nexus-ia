import { useState, useEffect } from "react";
import { usePersistentState } from "../lib/persist";
import {
  googleSignIn,
  initAuth,
  fetchRealDriveFiles,
  uploadRealDriveFile,
  getAccessToken,
  logoutGoogle
} from "../lib/googleAuth";
import {
  Cloud,
  CheckCircle2,
  UploadCloud,
  Download,
  Trash2,
  FolderPlus,
  Lock,
  RotateCcw,
  Sparkles,
  FileText,
  Image as ImageIcon,
  HardDrive,
  User,
  LogOut,
  ExternalLink,
  RefreshCw
} from "lucide-react";

interface GoogleUser {
  email: string;
  name: string;
  avatar: string;
  connectedAt: string;
}

interface CloudFile {
  id: string;
  name: string;
  type: "document" | "image" | "backup" | "archive";
  size: string;
  updatedAt: string;
  driveId?: string;   // present = vrai fichier Google Drive, donc ouvrable
}

// Aucun fichier de demonstration : on n'affiche que de VRAIS fichiers.
const DEFAULT_FILES: CloudFile[] = [];

export default function NexusCloud() {
  const [googleUser, setGoogleUser] = usePersistentState<GoogleUser | null>(
    "nexus.googleUser",
    {
      email: "mon.adresse@gmail.com",
      name: "Mon Compte Google",
      avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=MyGoogleAccount",
      connectedAt: new Date().toLocaleDateString("fr-FR"),
    }
  );

  const [files, setFiles] = usePersistentState<CloudFile[]>("nexus.cloudFiles", DEFAULT_FILES);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [customEmail, setCustomEmail] = useState("");
  const [customName, setCustomName] = useState("");
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const [isSyncingDrive, setIsSyncingDrive] = useState(false);
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
            connectedAt: new Date().toLocaleDateString("fr-FR"),
          });
        }
      },
      () => setHasGoogleAuth(false)
    );
  }, []);

  async function handleGoogleSignInDrive() {
    try {
      const res = await googleSignIn();
      if (res) {
        setHasGoogleAuth(true);
        setGoogleUser({
          email: res.user.email || "mon.adresse@gmail.com",
          name: res.user.displayName || res.user.email?.split("@")[0] || "Utilisateur Google",
          avatar: res.user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(res.user.email || "Google")}`,
          connectedAt: new Date().toLocaleDateString("fr-FR"),
        });
        setSyncStatus("Connexion Google Drive réussie ! Chargement de vos fichiers...");
        handleSyncDrive();
      }
    } catch (err: any) {
      console.error(err);
      setSyncStatus(`Connexion Google Drive : ${err?.message || "Échec"}`);
      setTimeout(() => setSyncStatus(null), 4000);
    }
  }

  async function handleSyncDrive() {
    setIsSyncingDrive(true);
    try {
      const realFiles = await fetchRealDriveFiles();
      if (realFiles.length > 0) {
        const mappedFiles: CloudFile[] = realFiles.map((rf) => ({
          id: rf.id,
          name: rf.name,
          type: rf.mimeType.includes("image") ? "image" : "document",
          size: rf.size,
          updatedAt: rf.modifiedTime,
          driveId: rf.id,
        }));

        setFiles((prev) => {
          const existingIds = new Set(prev.map((f) => f.id));
          const newF = mappedFiles.filter((f) => !existingIds.has(f.id));
          return [...newF, ...prev];
        });
        setSyncStatus(`${realFiles.length} fichiers Google Drive réels synchronisés !`);
      } else {
        setSyncStatus("Aucun fichier trouvé dans Google Drive.");
      }
    } catch (err: any) {
      console.error(err);
      setSyncStatus(`Sync Drive: ${err?.message || "Veuillez connecter votre compte Google Drive"}`);
    } finally {
      setIsSyncingDrive(false);
      setTimeout(() => setSyncStatus(null), 4000);
    }
  }

  function handleGoogleLogin(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const email = customEmail.trim() || "mon.adresse@gmail.com";
    const name = customName.trim() || (email.split("@")[0] || "Utilisateur Google");

    setGoogleUser({
      email,
      name,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`,
      connectedAt: new Date().toLocaleDateString("fr-FR"),
    });

    setShowLoginModal(false);
    setSyncStatus("Connecté au Compte Google !");
    setTimeout(() => setSyncStatus(null), 4000);
  }

  async function handleLogout() {
    await logoutGoogle();
    setHasGoogleAuth(false);
    setGoogleUser(null);
    setSyncStatus("Compte Google déconnecté.");
    setTimeout(() => setSyncStatus(null), 3000);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const uploaded = e.target.files;
    if (!uploaded || uploaded.length === 0) return;

    const file = uploaded[0];
    const newFile: CloudFile = {
      id: `file-${Date.now()}`,
      name: file.name,
      type: file.type.startsWith("image/") ? "image" : "document",
      size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      updatedAt: "À l'instant",
    };

    setFiles((prev) => [newFile, ...prev]);

    const token = getAccessToken();
    if (token) {
      setSyncStatus(`Envoi de "${file.name}" sur votre VRAI Google Drive...`);
      try {
        const text = await file.text().catch(() => "Contenu du fichier");
        await uploadRealDriveFile(file.name, text, file.type || "text/plain");
        setSyncStatus(`Fichier "${file.name}" téléversé avec SUCCÈS sur votre Google Drive réel !`);
      } catch (err: any) {
        console.error(err);
        setSyncStatus(`Ajouté localement. (Upload Drive: ${err?.message || "Erreur"})`);
      }
    } else {
      setSyncStatus(`Fichier "${file.name}" importé dans votre Nexus Cloud !`);
    }

    setTimeout(() => setSyncStatus(null), 4000);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const newFile: CloudFile = {
        id: `file-${Date.now()}`,
        name: file.name,
        type: file.type.startsWith("image/") ? "image" : "document",
        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        updatedAt: "À l'instant",
      };
      setFiles((prev) => [newFile, ...prev]);
      setSyncStatus(`Fichier "${file.name}" déposé et ajouté au Cloud !`);
      setTimeout(() => setSyncStatus(null), 3500);
    }
  }

  function handleDeleteFile(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  const filteredFiles = files.filter((f) => {
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (filterType === "all") return matchesSearch;
    return matchesSearch && f.type === filterType;
  });

  return (
    <div className="flex h-full flex-col gap-4 p-2 overflow-y-auto">
      {/* Top Header & Account Banner */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-blue-900/30 via-slate-900/50 to-indigo-900/30 p-4 backdrop-blur-md">
        {googleUser ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src={googleUser.avatar}
                  alt={googleUser.name}
                  className="h-12 w-12 rounded-full border-2 border-cyan-400 object-cover shadow-lg shadow-cyan-500/20"
                />
                <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500 text-black shadow">
                  <CheckCircle2 size={12} />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white">{googleUser.name}</h2>
                  <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-semibold text-cyan-300 border border-cyan-500/30">
                    <Cloud size={10} /> Compte Google Synchro
                  </span>
                </div>
                <p className="text-xs text-slate-300">{googleUser.email}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Synchronisé depuis le {googleUser.connectedAt}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {!hasGoogleAuth ? (
                <button
                  onClick={handleGoogleSignInDrive}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-red-500/40 bg-red-500/10 px-3.5 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20 transition-all shadow-md"
                  title="Connecter votre compte Google Drive réel"
                >
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z" />
                    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                    <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9z" />
                    <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z" />
                  </svg>
                  <span>Connexion Drive Réel</span>
                </button>
              ) : (
                <button
                  onClick={handleSyncDrive}
                  disabled={isSyncingDrive}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 transition-all shadow-md disabled:opacity-50"
                  title="Synchroniser vos fichiers Google Drive réels"
                >
                  <RefreshCw size={14} className={isSyncingDrive ? "animate-spin text-emerald-400" : "text-emerald-400"} />
                  <span>{isSyncingDrive ? "Sync Drive..." : "Sync Drive Réel"}</span>
                </button>
              )}

              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-1 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-300 hover:bg-red-500/20 transition-colors"
                title="Déconnexion du compte Google"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white border border-white/20">
                <Cloud size={24} className="text-cyan-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Nexus Cloud Drive</h2>
                <p className="text-xs text-slate-300">
                  Connectez votre compte Google pour sauvegarder et synchroniser vos fichiers.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowLoginModal(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-white text-black px-4 py-2.5 text-xs font-bold hover:bg-slate-200 transition-all shadow-lg"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Se connecter avec Google
            </button>
          </div>
        )}
      </div>

      {syncStatus && (
        <div className="rounded-xl border border-cyan-500/40 bg-cyan-950/40 px-4 py-2.5 text-xs text-cyan-200 flex items-center gap-2">
          <Sparkles size={14} className="text-cyan-400 animate-pulse" />
          <span>{syncStatus}</span>
        </div>
      )}

      {/* Storage Quota Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-white/10 bg-black/40 p-3.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
              <HardDrive size={14} className="text-cyan-400" />
              Espace Google Cloud Drive
            </span>
            <span className="text-xs font-bold text-white">3.2 GB / 15 GB</span>
          </div>
          <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full nx-grad w-[22%]" />
          </div>
          <p className="text-[10px] text-slate-500 mt-1.5">11.8 GB disponibles sur votre stockage gratuit</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/40 p-3.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
              <FileText size={14} className="text-emerald-400" />
              Documents & Notes
            </span>
            <span className="text-xs font-bold text-slate-200">1.2 GB</span>
          </div>
          <p className="text-[11px] text-slate-400">Notes, PDFs et sauvegardes OS</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/40 p-3.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
              <ImageIcon size={14} className="text-purple-400" />
              Images & Médias
            </span>
            <span className="text-xs font-bold text-slate-200">2.0 GB</span>
          </div>
          <p className="text-[11px] text-slate-400">Captures, fonds d'écran et médias</p>
        </div>
      </div>

      {/* File Explorer Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un fichier..."
            className="flex-1 sm:w-60 rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500/50"
          />
          <div className="flex items-center rounded-xl bg-white/5 p-1 border border-white/10 text-xs">
            <button
              onClick={() => setFilterType("all")}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                filterType === "all" ? "bg-cyan-500 text-black font-semibold" : "text-slate-400 hover:text-white"
              }`}
            >
              Tous
            </button>
            <button
              onClick={() => setFilterType("document")}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                filterType === "document" ? "bg-cyan-500 text-black font-semibold" : "text-slate-400 hover:text-white"
              }`}
            >
              Docs
            </button>
            <button
              onClick={() => setFilterType("backup")}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                filterType === "backup" ? "bg-cyan-500 text-black font-semibold" : "text-slate-400 hover:text-white"
              }`}
            >
              Backup
            </button>
          </div>
        </div>

        <label className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-white/10 cursor-pointer transition-all w-full sm:w-auto">
          <FolderPlus size={15} className="text-cyan-400" />
          <span>Importer un Fichier</span>
          <input type="file" onChange={handleFileUpload} className="hidden" />
        </label>
      </div>

      {/* File List / Drag Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onDrop={handleDrop}
        className={`relative flex-1 rounded-2xl border p-2 overflow-y-auto min-h-[220px] transition-all ${
          isDragging
            ? "border-cyan-400 bg-cyan-950/40 ring-2 ring-cyan-500/50"
            : "border-white/10 bg-black/20"
        }`}
      >
        {isDragging && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-cyan-950/80 backdrop-blur-sm rounded-2xl border-2 border-dashed border-cyan-400 text-cyan-200">
            <UploadCloud size={40} className="animate-bounce text-cyan-300" />
            <p className="text-sm font-bold mt-2">Déposez le fichier ici !</p>
            <p className="text-xs text-cyan-300/80">Il sera automatiquement enregistré dans votre Nexus Cloud.</p>
          </div>
        )}
        {filteredFiles.length > 0 ? (
          <div className="flex flex-col gap-2">
            {filteredFiles.map((f) => (
              <div
                key={f.id}
                onClick={() => {
                  // Clic sur le fichier = il s'OUVRE (avant : il ne se passait rien).
                  if (f.driveId) {
                    window.open(`https://drive.google.com/file/d/${f.driveId}/view`, "_blank", "noopener");
                  } else {
                    setSyncStatus(`"${f.name}" est un fichier local : ouvre-le depuis « Fichiers & Explorer ».`);
                    setTimeout(() => setSyncStatus(null), 4000);
                  }
                }}
                title="Ouvrir le fichier"
                className="flex cursor-pointer items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3 hover:border-cyan-500/30 hover:bg-white/[0.05] transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    {f.type === "image" ? (
                      <ImageIcon size={18} />
                    ) : f.type === "backup" ? (
                      <RotateCcw size={18} />
                    ) : (
                      <FileText size={18} />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white group-hover:text-cyan-300 transition-colors">
                      {f.name}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      {f.size} • Modifié {f.updatedAt}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (f.driveId) {
                        window.open(
                          `https://drive.google.com/uc?export=download&id=${f.driveId}`,
                          "_blank",
                          "noopener"
                        );
                      } else {
                        setSyncStatus(`"${f.name}" n'est pas encore sur Drive : connecte ton compte Google pour le telecharger.`);
                        setTimeout(() => setSyncStatus(null), 4000);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-cyan-300 transition-colors"
                    title="Télécharger"
                  >
                    <Download size={15} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteFile(f.id); }}
                    className="p-1.5 text-slate-400 hover:text-red-400 transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-slate-500">
            <Cloud size={32} className="opacity-30 mb-2" />
            <p className="text-xs">Aucun fichier trouvé dans votre Nexus Cloud.</p>
          </div>
        )}
      </div>

      {/* Google Login Dialog Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowLoginModal(false); }}>
          <div className="w-full max-w-sm rounded-2xl border border-white/20 bg-slate-900 p-5 shadow-2xl">
            <div className="flex flex-col items-center text-center gap-2 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black shadow-lg">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              </div>
              <h3 className="text-base font-bold text-white">Connexion Google</h3>
              <p className="text-xs text-slate-400">
                Liez votre compte Google à votre espace de travail Nexus OS.
              </p>
            </div>

            <form onSubmit={handleGoogleLogin} className="flex flex-col gap-3">
              <div>
                <label className="text-[11px] font-medium text-slate-300">Adresse Email Google</label>
                <input
                  type="email"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  placeholder="ex: mon.adresse@gmail.com"
                  className="w-full mt-1 rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-300">Nom Complet</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="ex: Jean Dupont"
                  className="w-full mt-1 rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  className="flex-1 rounded-xl border border-white/10 py-2 text-xs text-slate-300 hover:bg-white/5"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-cyan-500 py-2 text-xs font-bold text-black hover:bg-cyan-400"
                >
                  Se Connecter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

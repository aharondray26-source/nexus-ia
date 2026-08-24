import { useEffect, useState } from "react";
import { useWindows } from "../os/useWindows";
import { getFile, type StoredFile } from "../lib/fileStore";
import {
  Download,
  ExternalLink,
  FileText,
  AlertCircle,
  RefreshCw,
  Presentation,
  FileSpreadsheet,
  FileCode,
  FileCheck,
  Eye,
  Sparkles,
} from "lucide-react";

function triggerDownload(blob: Blob, fileName: string) {
  try {
    const safeBlob = blob instanceof Blob ? blob : new Blob([blob]);
    const tempUrl = URL.createObjectURL(safeBlob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = tempUrl;
    a.download = fileName;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) document.body.removeChild(a);
      URL.revokeObjectURL(tempUrl);
    }, 2500);
  } catch (err) {
    console.error("Erreur de téléchargement:", err);
  }
}

export default function FileViewer() {
  const fileId = useWindows((s) => s.openFileId);
  const openApp = useWindows((s) => s.openApp);
  const [file, setFile] = useState<StoredFile | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let alive = true;
    setLoading(true);
    setError(null);
    setText(null);

    (async () => {
      try {
        if (!fileId) {
          if (alive) {
            setFile(null);
            setLoading(false);
          }
          return;
        }

        const f = await getFile(fileId);
        if (!alive) return;

        if (!f) {
          setFile(null);
          setError("Fichier introuvable dans le stockage.");
          setLoading(false);
          return;
        }

        setFile(f);
        objectUrl = URL.createObjectURL(f.blob);
        if (alive) setUrl(objectUrl);

        const ext = (f.extension || f.name.split(".").pop() || "").toUpperCase();
        const isTextLike =
          f.type.startsWith("text/") ||
          /^(TXT|MD|CSV|JSON|JS|TS|TSX|CSS|HTML|XML|PY|C|CPP|JAVA|RTF)$/i.test(ext);

        if (isTextLike) {
          try {
            const rawText = await f.blob.text();
            if (alive) {
              setText(rawText.slice(0, 150000));
            }
          } catch (textErr) {
            console.warn("Erreur lecture texte:", textErr);
          }
        } else if (ext === "DOCX" || ext === "DOC") {
          try {
            const rawText = await f.blob.text();
            if (alive) {
              const clean = rawText.replace(/<[^>]+>/g, " ").replace(/[^\x20-\x7E\xA0-\xFF\n\r\t]/g, " ").replace(/\s+/g, " ").trim();
              if (clean.length > 20) {
                setText(clean.slice(0, 50000));
              }
            }
          } catch (e) {
            console.warn("Erreur extraction texte docx:", e);
          }
        }
      } catch (err) {
        console.error("Erreur ouverture fichier:", err);
        if (alive) setError("Erreur lors de la lecture du fichier.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [fileId]);

  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-slate-400 animate-pulse">
        <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
        <span className="font-medium text-white">Ouverture du fichier...</span>
      </div>
    );
  }

  if (error || !file || !url) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-slate-400">
        <AlertCircle className="w-8 h-8 text-amber-400" />
        <span className="font-semibold text-white">{error || "Aucun fichier sélectionné."}</span>
        <span className="text-xs text-slate-400">
          Ouvrez vos documents depuis l'application « Fichiers ».
        </span>
      </div>
    );
  }

  const t = file.type || "";
  const ext = (file.extension || file.name.split(".").pop() || "").toUpperCase();
  const isImage = t.startsWith("image/") || /^(PNG|JPG|JPEG|WEBP|GIF|SVG|BMP|ICO)$/i.test(ext);
  const isPdf = t === "application/pdf" || ext === "PDF";
  const isAudio = t.startsWith("audio/") || /^(MP3|WAV|OGG|FLAC|M4A)$/i.test(ext);
  const isVideo = t.startsWith("video/") || /^(MP4|WEBM|MOV|AVI|MKV)$/i.test(ext);
  const isPowerPoint = /^(PPT|PPTX|POTX|PPSX|ODP|KEY)$/i.test(ext);
  const isWord = /^(DOC|DOCX|ODT|RTF)$/i.test(ext);
  const isExcel = /^(XLS|XLSX|CSV|ODS)$/i.test(ext);

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} octets`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  }

  return (
    <div className="flex h-full flex-col gap-3 p-2 bg-slate-950 text-white rounded-xl">
      {/* Top File Control Bar */}
      <div className="flex items-center justify-between gap-3 bg-slate-900/90 p-3 rounded-xl border border-white/10 shrink-0 shadow-md">
        <div className="flex items-center gap-2.5 truncate">
          {isPowerPoint ? (
            <Presentation className="w-5 h-5 text-amber-400 shrink-0" />
          ) : isExcel ? (
            <FileSpreadsheet className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : isWord ? (
            <FileText className="w-5 h-5 text-blue-400 shrink-0" />
          ) : (
            <FileCode className="w-5 h-5 text-cyan-400 shrink-0" />
          )}
          <span className="truncate text-xs font-bold text-white" title={file.name}>
            {file.name}
          </span>
          <span className="text-[10px] font-mono bg-black/60 px-2 py-0.5 rounded-md text-slate-300 border border-white/10 shrink-0">
            {ext}
          </span>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            ({formatFileSize(file.size)})
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {url && (
            <button
              onClick={() => window.open(url, "_blank", "noopener")}
              className="flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-white/15 transition-all"
              title="Agrandir / Ouvrir dans un nouvel onglet"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Plein écran</span>
            </button>
          )}

          {(isWord || text !== null) && (
            <button
              onClick={() => openApp("docs")}
              className="flex items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition-all"
              title="Editer dans le Créateur de Documents"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Éditer dans Documents</span>
            </button>
          )}

          <button
            onClick={() => triggerDownload(file.blob, file.name)}
            className="flex items-center gap-1.5 rounded-lg nx-grad px-3 py-1.5 text-xs font-bold text-white hover:opacity-90 shadow-md shadow-cyan-500/20 active:scale-95 transition-all"
            title="Télécharger le fichier sur votre appareil"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Télécharger</span>
          </button>
        </div>
      </div>

      {/* Main Content Preview Stage */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50 p-2">
        {/* IMAGE VIEWER */}
        {isImage && (
          <div className="m-auto flex flex-col items-center justify-center h-full w-full p-2">
            <img
              src={url}
              alt={file.name}
              className="m-auto max-h-full max-w-full object-contain rounded-xl border border-white/10 shadow-2xl"
            />
          </div>
        )}

        {/* PDF VIEWER */}
        {isPdf && (
          <object data={url} type="application/pdf" className="absolute inset-0 h-full w-full rounded-xl">
            <iframe title={file.name} src={url} className="absolute inset-0 h-full w-full rounded-xl border-0" />
          </object>
        )}

        {/* AUDIO PLAYER */}
        {isAudio && (
          <div className="m-auto w-full max-w-md p-6 bg-slate-900 rounded-2xl border border-white/10 text-center space-y-4 shadow-2xl">
            <div className="p-3 bg-purple-500/20 text-purple-400 rounded-2xl w-12 h-12 m-auto flex items-center justify-center">
              <Eye className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">{file.name}</p>
              <p className="text-xs text-slate-400 mt-1">Format audio ({ext})</p>
            </div>
            <audio controls src={url} className="w-full">
              Votre navigateur ne supporte pas la lecture audio.
            </audio>
          </div>
        )}

        {/* VIDEO PLAYER */}
        {isVideo && (
          <video controls src={url} className="m-auto max-h-full max-w-full rounded-xl shadow-2xl">
            Votre navigateur ne supporte pas la lecture vidéo.
          </video>
        )}

        {/* POWERPOINT PRESENTATION CARD */}
        {isPowerPoint && (
          <div className="m-auto flex flex-col items-center justify-center gap-4 p-8 bg-slate-900/90 rounded-2xl border border-amber-500/30 max-w-lg text-center shadow-2xl">
            <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20">
              <Presentation className="w-12 h-12 text-amber-400" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">{file.name}</h3>
              <p className="text-xs text-slate-300">Présentation PowerPoint ({ext})</p>
              <p className="text-[11px] text-slate-400">Taille: {formatFileSize(file.size)}</p>
            </div>
            <p className="text-xs text-slate-300 bg-black/40 p-3 rounded-xl border border-white/10">
              Votre présentation est chargée dans Nexus OS. Vous pouvez la visualiser en plein écran ou la télécharger sur votre ordinateur.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => triggerDownload(file.blob, file.name)}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2 text-xs font-bold text-white hover:opacity-95 shadow-lg active:scale-95 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Télécharger la présentation</span>
              </button>
            </div>
          </div>
        )}

        {/* EXCEL SPREADSHEET CARD */}
        {isExcel && (
          <div className="m-auto flex flex-col items-center justify-center gap-4 p-8 bg-slate-900/90 rounded-2xl border border-emerald-500/30 max-w-lg text-center shadow-2xl">
            <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
              <FileSpreadsheet className="w-12 h-12 text-emerald-400" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">{file.name}</h3>
              <p className="text-xs text-slate-300">Feuille de calcul Excel / Tableur ({ext})</p>
              <p className="text-[11px] text-slate-400">Taille: {formatFileSize(file.size)}</p>
            </div>
            <p className="text-xs text-slate-300 bg-black/40 p-3 rounded-xl border border-white/10">
              Le document tableur est prêt dans votre stockage local.
            </p>
            <button
              onClick={() => triggerDownload(file.blob, file.name)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-xs font-bold text-white hover:opacity-95 shadow-lg active:scale-95 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Télécharger le fichier Excel</span>
            </button>
          </div>
        )}

        {/* WORD / TEXT / HTML DOCUMENT VIEWER */}
        {(isWord || text !== null) && !isPowerPoint && !isExcel && !isImage && !isPdf && !isAudio && !isVideo && (
          <div className="absolute inset-0 flex flex-col p-4 overflow-hidden">
            {text ? (
              text.trim().startsWith("<") || ext === "HTML" ? (
                <div className="flex-1 overflow-auto rounded-xl bg-white p-6 border border-white/20 text-slate-900 shadow-2xl [scrollbar-width:thin]">
                  <div
                    className="prose prose-slate max-w-none text-sm"
                    dangerouslySetInnerHTML={{ __html: text }}
                  />
                </div>
              ) : (
                <div className="flex-1 overflow-auto rounded-xl bg-slate-950 p-4 border border-white/10 font-mono text-xs text-slate-200 whitespace-pre-wrap select-text [scrollbar-width:thin]">
                  {text}
                </div>
              )
            ) : (
              <div className="m-auto flex flex-col items-center justify-center gap-4 p-6 bg-slate-900 rounded-2xl border border-blue-500/30 max-w-md text-center shadow-2xl">
                <FileText className="w-12 h-12 text-blue-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">{file.name}</h3>
                  <p className="text-xs text-slate-400">Document Word / Formatisé ({ext})</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openApp("docs")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Ouvrir dans Documents</span>
                  </button>
                  <button
                    onClick={() => triggerDownload(file.blob, file.name)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 text-white text-xs font-bold hover:bg-cyan-500"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Télécharger</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* GENERIC / OTHER FORMAT CARD */}
        {!isImage && !isPdf && !isAudio && !isVideo && !isPowerPoint && !isExcel && !isWord && text === null && (
          <div className="m-auto flex flex-col items-center justify-center gap-4 p-8 bg-slate-900/90 rounded-2xl border border-white/10 max-w-md text-center shadow-2xl">
            <div className="p-4 bg-cyan-500/10 rounded-2xl border border-cyan-500/20">
              <FileCheck className="w-10 h-10 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{file.name}</h3>
              <p className="text-xs text-slate-400 mt-1">Format : {ext} • {formatFileSize(file.size)}</p>
            </div>
            <p className="text-xs text-slate-300">
              Fichier enregistré et disponible dans Nexus OS.
            </p>
            <button
              onClick={() => triggerDownload(file.blob, file.name)}
              className="flex items-center gap-2 rounded-xl nx-grad px-4 py-2 text-xs font-bold text-white hover:opacity-90 shadow-lg active:scale-95 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Télécharger le fichier</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}



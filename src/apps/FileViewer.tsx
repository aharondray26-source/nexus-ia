import { useEffect, useState } from "react";
import { useWindows } from "../os/useWindows";
import { getFile, type StoredFile } from "../lib/fileStore";

// Visionneuse integree : affiche le fichier demande (image, PDF, texte, audio,
// video) directement dans le site, sans passer par une application externe.
export default function FileViewer() {
  const fileId = useWindows((s) => s.openFileId);
  const [file, setFile] = useState<StoredFile | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let objectUrl: string | null = null;
    let alive = true;
    setLoading(true);
    setText(null);

    (async () => {
      if (!fileId) {
        setFile(null);
        setLoading(false);
        return;
      }
      const f = await getFile(fileId);
      if (!alive) return;
      if (!f) {
        setFile(null);
        setLoading(false);
        return;
      }
      setFile(f);
      objectUrl = URL.createObjectURL(f.blob);
      setUrl(objectUrl);

      const isText =
        f.type.startsWith("text/") ||
        /\.(txt|md|csv|json|js|ts|tsx|css|html|xml|py|c|cpp|java)$/i.test(f.name);
      if (isText) {
        const content = await f.blob.text();
        if (alive) setText(content.slice(0, 100000));
      }
      if (alive) setLoading(false);
    })();

    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileId]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-nexus-muted">
        Ouverture...
      </div>
    );
  }

  if (!file || !url) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-nexus-muted">
        Aucun fichier a afficher.
        <span className="text-[11px] text-nexus-muted/70">
          Ouvre un document depuis « Fichiers ».
        </span>
      </div>
    );
  }

  const t = file.type;
  const isImage = t.startsWith("image/");
  const isPdf = t === "application/pdf" || /\.pdf$/i.test(file.name);
  const isAudio = t.startsWith("audio/");
  const isVideo = t.startsWith("video/");

  // Certains types (Word, Excel, PowerPoint...) ne s'affichent pas dans un
  // navigateur : on propose alors un telechargement propre plutot qu'une page grise.
  const previewable = isImage || isPdf || isAudio || isVideo || text !== null;

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium text-nexus-text">
          {file.name}
        </span>
        <div className="flex shrink-0 items-center gap-1.5">
          {isPdf && (
            <button
              onClick={() => window.open(url, "_blank", "noopener")}
              className="rounded-md border border-nexus-border px-2.5 py-1 text-[11px] text-nexus-muted transition-colors hover:text-nexus-text"
            >
              Ouvrir ↗
            </button>
          )}
          <a
            href={url}
            download={file.name}
            className="rounded-md border border-nexus-border px-2.5 py-1 text-[11px] text-nexus-muted transition-colors hover:text-nexus-text"
          >
            Telecharger
          </a>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 overflow-hidden rounded-lg border border-nexus-border bg-black/40">
        {isImage && (
          <img
            src={url}
            alt={file.name}
            className="m-auto max-h-full max-w-full object-contain"
          />
        )}
        {isPdf && (
          <object data={url} type="application/pdf" className="absolute inset-0 h-full w-full">
            <iframe title={file.name} src={url} className="absolute inset-0 h-full w-full" style={{ border: 0 }} />
          </object>
        )}
        {isAudio && (
          <audio controls src={url} className="m-auto w-full px-6">
            Ton navigateur ne peut pas lire cet audio.
          </audio>
        )}
        {isVideo && (
          <video controls src={url} className="m-auto max-h-full max-w-full">
            Ton navigateur ne peut pas lire cette video.
          </video>
        )}
        {text !== null && (
          <pre className="absolute inset-0 overflow-auto p-4 text-left text-xs leading-relaxed text-nexus-text">
            {text}
          </pre>
        )}
        {!previewable && (
          <div className="m-auto flex flex-col items-center gap-3 p-6 text-center">
            <span className="text-sm text-nexus-muted">
              Ce type de fichier ({file.extension}) ne s'affiche pas dans le
              navigateur.
            </span>
            <a
              href={url}
              download={file.name}
              className="rounded-lg border px-4 py-2 text-sm"
              style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
            >
              Telecharger le fichier
            </a>
          </div>
        )}
      </div>

      {isPdf && (
        <p className="text-[11px] text-nexus-muted/70">
          Si le PDF reste gris (souvent sur iPhone/iPad), utilise « Ouvrir ↗ ».
        </p>
      )}
    </div>
  );
}

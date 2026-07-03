import { useEffect, useState, type DragEvent, type FormEvent } from "react";
import { usePersistentState } from "../lib/persist";
import { useWindows } from "../os/useWindows";
import {
  listFiles,
  putFile,
  deleteFile,
  setFileFolder,
  type FileMeta,
} from "../lib/fileStore";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function extensionOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toUpperCase() : "?";
}

// Petite couleur d'accent selon la famille du fichier (image, doc, son...).
function kindColor(type: string, ext: string): string {
  if (type.startsWith("image/")) return "#38bdf8";
  if (type.startsWith("video/")) return "#f472b6";
  if (type.startsWith("audio/")) return "#a78bfa";
  if (type === "application/pdf" || ext === "PDF") return "#f87171";
  if (/^(TXT|MD|CSV|JSON|JS|TS|CSS|HTML)$/.test(ext)) return "#34d399";
  return "#94a3b8";
}

export default function Files() {
  const [files, setFiles] = useState<FileMeta[]>([]);
  const [folders, setFolders] = usePersistentState<string[]>("nexus.folders", [
    "General",
  ]);
  const [current, setCurrent] = useState("General");
  const [newFolder, setNewFolder] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const openFile = useWindows((s) => s.openFile);

  async function refresh() {
    setFiles(await listFiles());
  }

  useEffect(() => {
    refresh();
  }, []);

  async function addFromList(list: FileList) {
    for (const file of Array.from(list)) {
      await putFile({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 6)}`,
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
        extension: extensionOf(file.name),
        folder: current,
        addedAt: Date.now(),
        blob: file,
      });
    }
    await refresh();
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    addFromList(e.dataTransfer.files);
  }

  function createFolder(e: FormEvent) {
    e.preventDefault();
    const name = newFolder.trim();
    if (!name || folders.includes(name)) return;
    setFolders((prev) => [...prev, name]);
    setCurrent(name);
    setNewFolder("");
  }

  async function deleteFolder(name: string) {
    if (name === "General") return;
    for (const f of files.filter((x) => x.folder === name)) {
      await setFileFolder(f.id, "General");
    }
    setFolders((prev) => prev.filter((f) => f !== name));
    if (current === name) setCurrent("General");
    await refresh();
  }

  const visible = files.filter((f) => f.folder === current);

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Dossiers */}
      <div className="flex flex-wrap items-center gap-1.5">
        {folders.map((f) => (
          <span key={f} className="group relative flex items-center">
            <button
              onClick={() => setCurrent(f)}
              className="rounded-full border px-3 py-1.5 text-xs transition-colors"
              style={
                current === f
                  ? { borderColor: "var(--accent)", color: "var(--accent)" }
                  : { borderColor: "#27272a", color: "#a1a1aa" }
              }
            >
              {f}
            </button>
            {f !== "General" && (
              <button
                onClick={() => deleteFolder(f)}
                className="ml-0.5 hidden text-[10px] text-nexus-muted hover:text-red-400 group-hover:inline"
                aria-label={`Supprimer le dossier ${f}`}
              >
                ✕
              </button>
            )}
          </span>
        ))}
      </div>

      <form onSubmit={createFolder} className="flex gap-2">
        <input
          value={newFolder}
          onChange={(e) => setNewFolder(e.target.value)}
          placeholder="Nouveau dossier..."
          className="flex-1 rounded-lg border border-nexus-border bg-nexus-bg px-3 py-1.5 text-xs text-nexus-text outline-none focus:border-white/30"
        />
        <button
          type="submit"
          className="rounded-lg border border-nexus-border bg-white/[0.04] px-3 py-1.5 text-xs text-nexus-text transition-colors hover:bg-white/[0.08]"
        >
          + Dossier
        </button>
      </form>

      {/* Zone de depot */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragOver(false);
        }}
        onDrop={handleDrop}
        className={`flex h-20 flex-col items-center justify-center rounded-xl border border-dashed text-center text-xs transition-colors ${
          dragOver
            ? "border-white/40 bg-white/[0.04] text-nexus-text"
            : "border-nexus-border text-nexus-muted"
        }`}
      >
        Depose dans « {current} »
        <label className="mt-1 cursor-pointer text-[11px] underline underline-offset-2">
          ou choisis un fichier
          <input
            type="file"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && addFromList(e.target.files)}
          />
        </label>
      </div>

      {/* Fichiers du dossier courant */}
      <ul className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {visible.map((f) => (
          <li
            key={f.id}
            className="group flex items-center gap-3 rounded-lg border border-nexus-border bg-nexus-bg px-3 py-2 transition-colors hover:border-white/20"
          >
            <button
              onClick={() => openFile(f.id)}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
              title="Ouvrir"
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border text-[9px] font-semibold"
                style={{
                  color: kindColor(f.type, f.extension),
                  borderColor: "#27272a",
                }}
              >
                {f.extension}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-xs text-nexus-text">{f.name}</span>
                <span className="text-[10px] text-nexus-muted">
                  {formatSize(f.size)}
                </span>
              </span>
            </button>
            <select
              value={f.folder}
              onChange={async (e) => {
                await setFileFolder(f.id, e.target.value);
                await refresh();
              }}
              className="rounded-md border border-nexus-border bg-nexus-panel px-1.5 py-1 text-[10px] text-nexus-muted outline-none"
              title="Deplacer vers un dossier"
            >
              {folders.map((folder) => (
                <option key={folder} value={folder}>
                  {folder}
                </option>
              ))}
            </select>
            <button
              onClick={async () => {
                await deleteFile(f.id);
                await refresh();
              }}
              aria-label={`Supprimer ${f.name}`}
              className="text-nexus-muted transition-colors hover:text-red-400"
            >
              ✕
            </button>
          </li>
        ))}
        {visible.length === 0 && (
          <li className="flex flex-1 items-center justify-center text-[11px] text-nexus-muted/70">
            Ce dossier est vide.
          </li>
        )}
      </ul>
    </div>
  );
}

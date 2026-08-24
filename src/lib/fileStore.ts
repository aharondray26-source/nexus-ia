// Stockage reel des fichiers dans le navigateur via IndexedDB (contrairement a
// localStorage, il accepte de gros contenus : images, PDF, audio, video...).
// Le contenu est donc conserve : on peut rouvrir un fichier apres rechargement.

const DB_NAME = "nexus-files";
const STORE = "files";

export interface StoredFile {
  id: string;
  name: string;
  size: number;
  type: string;
  extension: string;
  folder: string;
  addedAt: number;
  blob: Blob;
}

interface DBRecord {
  id: string;
  name: string;
  size: number;
  type: string;
  extension: string;
  folder: string;
  addedAt: number;
  buffer?: ArrayBuffer;
  blob?: Blob;
}

// Version legere (sans le contenu) pour afficher la liste sans tout charger.
export type FileMeta = Omit<StoredFile, "blob">;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = run(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
  );
}

function notifyFilesUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("nexus:files-updated"));
  }
}

export async function putFile(f: StoredFile): Promise<IDBValidKey> {
  let buffer: ArrayBuffer;
  if (f.blob && typeof f.blob.arrayBuffer === "function") {
    buffer = await f.blob.arrayBuffer();
  } else if (f.blob instanceof Blob) {
    buffer = await new Response(f.blob).arrayBuffer();
  } else {
    buffer = new ArrayBuffer(0);
  }

  const record: DBRecord = {
    id: f.id,
    name: f.name,
    size: f.size,
    type: f.type,
    extension: f.extension,
    folder: f.folder,
    addedAt: f.addedAt,
    buffer,
  };

  const res = await tx("readwrite", (s) => s.put(record));
  notifyFilesUpdated();
  return res;
}

export async function getFile(id: string): Promise<StoredFile | undefined> {
  const rec = await tx<DBRecord | undefined>("readonly", (s) => s.get(id) as IDBRequest<DBRecord | undefined>);
  if (!rec) return undefined;

  let blob: Blob;
  if (rec.buffer) {
    blob = new Blob([rec.buffer], { type: rec.type || "application/octet-stream" });
  } else if (rec.blob) {
    blob = rec.blob;
  } else {
    blob = new Blob([], { type: rec.type || "application/octet-stream" });
  }

  return {
    id: rec.id,
    name: rec.name,
    size: rec.size,
    type: rec.type,
    extension: rec.extension,
    folder: rec.folder,
    addedAt: rec.addedAt,
    blob,
  };
}

export async function deleteFile(id: string): Promise<undefined> {
  const res = await tx<undefined>("readwrite", (s) => s.delete(id) as IDBRequest<undefined>);
  notifyFilesUpdated();
  return res;
}

// Renvoie uniquement les metadonnees (pas les blobs) pour la liste.
export async function listFiles(): Promise<FileMeta[]> {
  const all = await tx<DBRecord[]>("readonly", (s) => s.getAll() as IDBRequest<DBRecord[]>);
  return all
    .map(({ buffer: _buf, blob: _b, ...meta }) => meta)
    .sort((a, b) => b.addedAt - a.addedAt);
}

export async function setFileFolder(id: string, folder: string): Promise<void> {
  const f = await getFile(id);
  if (f) await putFile({ ...f, folder });
}

export async function renameFile(id: string, newName: string): Promise<void> {
  const f = await getFile(id);
  if (f) {
    const extI = newName.lastIndexOf(".");
    const ext = extI >= 0 ? newName.slice(extI + 1).toUpperCase() : f.extension;
    await putFile({ ...f, name: newName, extension: ext });
  }
}

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

export function putFile(f: StoredFile): Promise<IDBValidKey> {
  return tx("readwrite", (s) => s.put(f));
}

export function getFile(id: string): Promise<StoredFile | undefined> {
  return tx<StoredFile | undefined>("readonly", (s) => s.get(id) as IDBRequest<StoredFile | undefined>);
}

export function deleteFile(id: string): Promise<undefined> {
  return tx<undefined>("readwrite", (s) => s.delete(id) as IDBRequest<undefined>);
}

// Renvoie uniquement les metadonnees (pas les blobs) pour la liste.
export async function listFiles(): Promise<FileMeta[]> {
  const all = await tx<StoredFile[]>("readonly", (s) => s.getAll() as IDBRequest<StoredFile[]>);
  return all
    .map(({ blob: _blob, ...meta }) => meta)
    .sort((a, b) => b.addedAt - a.addedAt);
}

export async function setFileFolder(id: string, folder: string): Promise<void> {
  const f = await getFile(id);
  if (f) await putFile({ ...f, folder });
}

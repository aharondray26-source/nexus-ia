// ============================ COMPTE NEXUS ============================
// Un ecosysteme Nexus, independant de Google : tu te connectes avec une adresse
// e-mail, et tu retrouves TES donnees Nexus (notes, taches, tableur, reglages)
// sur n'importe quel appareil ou navigateur.
//
// Techniquement : Firebase Auth (identite) + Firestore (tes donnees).
// Rien n'est stocke sur l'ordinateur d'Aharon : tout vit chez Google Cloud,
// dans un espace prive rattache a ton compte.

import { auth } from "./googleAuth";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

const db = getFirestore();

// Les donnees Nexus qui suivent l'utilisateur d'un appareil a l'autre.
const SYNCED_KEYS = [
  "nexus.notes",
  "nexus.tasks",
  "nexus.sheet",
  "nexus.folders",
  "nexus.accent",
  "nexus.userName",
  "nexus.wallpaper",
  "nexus.widgets",
  "nexus.glass",
  "nexus.dockPos",
  "nexus.intention",
];

export type NexusUser = { uid: string; email: string };

function currentSnapshot(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of SYNCED_KEYS) {
    const v = localStorage.getItem(k);
    if (v !== null) out[k] = v;
  }
  return out;
}

/** Envoie les donnees locales vers le compte (le nuage). */
export async function pushToCloud(): Promise<void> {
  const u = auth.currentUser;
  if (!u) return;
  await setDoc(
    doc(db, "nexusUsers", u.uid),
    { data: currentSnapshot(), updatedAt: serverTimestamp() },
    { merge: true }
  );
}

/** Recupere les donnees du compte et les installe sur cet appareil. */
export async function pullFromCloud(): Promise<boolean> {
  const u = auth.currentUser;
  if (!u) return false;
  const snap = await getDoc(doc(db, "nexusUsers", u.uid));
  if (!snap.exists()) return false;
  const data = (snap.data()?.data ?? {}) as Record<string, string>;
  let restored = 0;
  for (const [k, v] of Object.entries(data)) {
    if (SYNCED_KEYS.includes(k) && typeof v === "string") {
      localStorage.setItem(k, v);
      restored++;
    }
  }
  if (restored) {
    window.dispatchEvent(new CustomEvent("nexus:persist-update", { detail: {} }));
  }
  return restored > 0;
}

/** Cree un compte Nexus, ou se connecte si l'adresse existe deja. */
export async function nexusSignIn(
  email: string,
  password: string
): Promise<NexusUser> {
  let user: User;
  try {
    user = (await signInWithEmailAndPassword(auth, email, password)).user;
  } catch (e: any) {
    const code = e?.code || "";
    if (code === "auth/user-not-found" || code === "auth/invalid-credential") {
      // Premiere venue : on cree le compte automatiquement.
      user = (await createUserWithEmailAndPassword(auth, email, password)).user;
    } else {
      throw e;
    }
  }
  // On recupere d'abord ce qui existe deja dans le compte, sinon on y depose l'etat local.
  const had = await pullFromCloud();
  if (!had) await pushToCloud();
  return { uid: user.uid, email: user.email || email };
}

export async function nexusSignOut(): Promise<void> {
  await signOut(auth);
}

/** Observe l'etat de connexion (pour afficher le bon bouton). */
export function watchNexusUser(cb: (u: NexusUser | null) => void) {
  return onAuthStateChanged(auth, (u) =>
    cb(u ? { uid: u.uid, email: u.email || "" } : null)
  );
}

/** Sauvegarde automatique : des qu'une donnee change, on la remonte au compte. */
export function initNexusSync() {
  let timer: number | undefined;
  const schedule = () => {
    if (!auth.currentUser) return;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      pushToCloud().catch(() => {});
    }, 1500); // on attend 1,5 s de calme pour ne pas ecrire a chaque frappe
  };
  window.addEventListener("nexus:persist-update", schedule);
  window.addEventListener("storage", schedule);
}

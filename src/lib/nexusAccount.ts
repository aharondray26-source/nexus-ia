// ============================ COMPTE NEXUS ============================
// Ecosysteme Nexus, independant de Google : une adresse e-mail + un mot de passe,
// et TES donnees (notes, taches, tableur, reglages) te suivent sur tous tes
// appareils, en DIRECT. Aucune validation Google necessaire : ca marche pour
// tout le monde, tout de suite.
//
// Firebase Auth = ton identite. Firestore = tes donnees (chez Google Cloud,
// dans un espace prive : personne d'autre ne peut y acceder).

import { auth } from "./googleAuth";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  linkWithCredential,
  EmailAuthProvider,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";

export const db = getFirestore();

// TOUT ce qui commence par "nexus" ou "arcade" suit ton compte : reglages,
// couleurs, theme clair/sombre, police, notes, taches, discussions IA, favoris,
// meilleurs scores... Plus rien n'est attache au navigateur.
// Seules exceptions : ce qui n'a de sens que sur CET appareil.
const LOCAL_ONLY = new Set([
  "nexus.session",     // fenetres ouvertes ici et maintenant
  "nexus.welcomed",    // carte de bienvenue vue sur cet appareil
  "nexus.firstVisit",
  "nexus.visitDays",
]);

function syncedKeys(): string[] {
  const out: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || LOCAL_ONLY.has(k)) continue;
    if (k.startsWith("nexus") || k.startsWith("arcade")) out.push(k);
  }
  return out;
}
const isSynced = (k: string) =>
  !LOCAL_ONLY.has(k) && (k.startsWith("nexus") || k.startsWith("arcade"));

export type NexusUser = { uid: string; email: string };
export type SyncState = { status: "off" | "syncing" | "ok" | "error"; message?: string };

let syncState: SyncState = { status: "off" };
const listeners = new Set<(s: SyncState) => void>();

function setSync(s: SyncState) {
  syncState = s;
  listeners.forEach((l) => l(s));
}
export function watchSync(cb: (s: SyncState) => void): () => void {
  listeners.add(cb);
  cb(syncState);
  return () => listeners.delete(cb);
}
export function getSyncState() { return syncState; }

// Traduit les erreurs techniques en francais comprehensible.
export function humanError(e: any): string {
  const c = e?.code || "";
  if (c === "permission-denied")
    return "Firestore refuse l'ecriture. Verifie que les regles sont publiees (Firestore > Rules > Publish).";
  if (c === "unavailable" || c === "failed-precondition")
    return "La base Firestore n'existe pas encore. Cree-la dans Firebase > Firestore Database.";
  if (c === "auth/unauthorized-domain")
    return "Ce site n'est pas autorise dans Firebase (Authentication > Settings > Authorized domains).";
  if (c === "auth/operation-not-allowed")
    return "Active la connexion E-mail/Mot de passe dans Firebase (Authentication > Sign-in method).";
  if (c === "auth/weak-password") return "Mot de passe trop court (6 caracteres minimum).";
  if (c === "auth/wrong-password" || c === "auth/invalid-credential")
    return "Mot de passe incorrect pour cette adresse.";
  if (c === "auth/invalid-email") return "Adresse e-mail invalide.";
  if (c === "auth/email-already-in-use")
    return "Cette adresse a déjà un compte Nexus. Entre avec Google, ou avec ton mot de passe : c'est le MEME compte.";
  if (c === COMPTE_INCONNU) return e.message;
  if (c === "auth/provider-already-linked" || c === "auth/credential-already-in-use")
    return "Ce mot de passe est déjà associé à ce compte.";
  if (c === "auth/requires-recent-login")
    return "Reconnecte-toi (Google) puis reessaie d'ajouter le mot de passe.";
  if (c === "auth/popup-blocked") return "Le navigateur a bloqué la fenêtre. Autorise les fenêtres surgissantes.";
  if (c === "auth/popup-closed-by-user" || c === "auth/cancelled-popup-request") return "Connexion annulee.";
  if (c === "auth/network-request-failed") return "Pas de connexion internet.";
  return e?.message || "Une erreur est survenue.";
}

function snapshot(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of syncedKeys()) {
    const v = localStorage.getItem(k);
    if (v !== null) out[k] = v;
  }
  return out;
}

// Empeche la boucle infinie : ce qu'on vient de recevoir, on ne le renvoie pas.
let lastRemote = "";
let applying = false;

/** Envoie l'etat local vers le compte. Les erreurs sont VISIBLES. */
export async function pushToCloud(): Promise<void> {
  const u = auth.currentUser;
  if (!u) return;
  const data = snapshot();
  const serialized = JSON.stringify(data);
  if (serialized === lastRemote) return; // rien de neuf
  setSync({ status: "syncing" });
  try {
    await setDoc(doc(db, "nexusUsers", u.uid), { data, updatedAt: serverTimestamp() }, { merge: true });
    lastRemote = serialized;
    setSync({ status: "ok" });
  } catch (e) {
    setSync({ status: "error", message: humanError(e) });
    throw e;
  }
}

/** Installe sur cet appareil les donnees recues du compte. */
function applyRemote(data: Record<string, string>): number {
  applying = true;
  const changees: string[] = [];
  for (const [k, v] of Object.entries(data)) {
    if (isSynced(k) && typeof v === "string") {
      if (localStorage.getItem(k) !== v) { localStorage.setItem(k, v); changees.push(k); }
    }
  }
  lastRemote = JSON.stringify(snapshot());
  // BUG CORRIGE (le plus couteux du projet) : on prevenait l'ecran avec un
  // evenement SANS nom de cle — { detail: {} }. Or chaque espace n'ecoute que
  // SA cle : « detail.key === key ». Personne ne se reveillait donc jamais.
  // Resultat : une note ecrite sur le Mac arrivait bien dans le compte et bien
  // dans ce navigateur, mais l'espace Notes continuait d'afficher l'ancienne
  // liste jusqu'au rechargement complet de la page. On previent maintenant
  // pour CHAQUE cle qui a change.
  for (const k of changees) {
    window.dispatchEvent(new CustomEvent("nexus:persist-update", { detail: { key: k } }));
  }
  window.setTimeout(() => { applying = false; }, 300);
  return changees.length;
}

export async function pullFromCloud(): Promise<number> {
  const u = auth.currentUser;
  if (!u) return 0;
  const snap = await getDoc(doc(db, "nexusUsers", u.uid));
  if (!snap.exists()) return 0;
  return applyRemote((snap.data()?.data ?? {}) as Record<string, string>);
}

/** Erreur particuliere : l'adresse est peut-etre inconnue. On NE CREE PAS de
 *  compte tout seul (une faute de frappe creerait un deuxieme compte vide, et
 *  on croirait ses notes perdues). On propose, l'utilisateur decide. */
export const COMPTE_INCONNU = "nexus/compte-inconnu";

export async function nexusSignIn(email: string, password: string): Promise<NexusUser> {
  let user: User;
  try {
    user = (await signInWithEmailAndPassword(auth, email, password)).user;
  } catch (e: any) {
    const c = e?.code || "";
    if (c === "auth/user-not-found" || c === "auth/invalid-credential" || c === "auth/wrong-password") {
      const err: any = new Error(
        "Mot de passe incorrect — ou cette adresse n'a pas encore de compte Nexus."
      );
      err.code = COMPTE_INCONNU;
      throw err;
    }
    throw e;
  }
  const restored = await pullFromCloud();
  if (!restored) await pushToCloud();   // premier appareil : on depose l'etat local
  return { uid: user.uid, email: user.email || email };
}

/** Creation VOLONTAIRE d'un compte Nexus. */
export async function nexusSignUp(email: string, password: string): Promise<NexusUser> {
  const user = (await createUserWithEmailAndPassword(auth, email.trim(), password)).user;
  await pushToCloud();
  return { uid: user.uid, email: user.email || email };
}

/** Envoie un e-mail pour choisir un nouveau mot de passe. */
export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

/** Un seul compte, deux facons d'entrer.
 *  Ajoute un mot de passe a un compte cree via Google : ensuite, la meme adresse
 *  fonctionne AVEC Google ET avec le mot de passe, sur n'importe quel appareil. */
export async function addPasswordToAccount(password: string): Promise<void> {
  const u = auth.currentUser;
  if (!u?.email) throw new Error("Connecte-toi d'abord (Google) pour ajouter un mot de passe.");
  const cred = EmailAuthProvider.credential(u.email, password);
  await linkWithCredential(u, cred);
}

/** Vrai si le compte a deja un mot de passe (en plus de Google). */
export function hasPassword(): boolean {
  return !!auth.currentUser?.providerData.some((p) => p.providerId === "password");
}

export async function nexusSignOut(): Promise<void> {
  await signOut(auth);
  lastRemote = "";
  setSync({ status: "off" });
}

export function watchNexusUser(cb: (u: NexusUser | null) => void) {
  return onAuthStateChanged(auth, (u) => cb(u ? { uid: u.uid, email: u.email || "" } : null));
}

/** Synchronisation EN DIRECT : ce que tu changes ici arrive la-bas, et l'inverse. */
export function initNexusSync() {
  let live: Unsubscribe | null = null;
  let timer: number | undefined;

  const schedulePush = () => {
    if (!auth.currentUser || applying) return;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      pushToCloud().catch(() => {/* deja affiche via setSync */});
    }, 1200);
  };
  window.addEventListener("nexus:persist-update", schedulePush);
  window.addEventListener("storage", schedulePush);

  onAuthStateChanged(auth, (u) => {
    live?.();
    live = null;
    if (!u) { setSync({ status: "off" }); return; }
    setSync({ status: "syncing" });
    // Ecoute permanente : des qu'un autre appareil modifie, on recoit ici.
    live = onSnapshot(
      doc(db, "nexusUsers", u.uid),
      (snap) => {
        if (snap.exists()) applyRemote((snap.data()?.data ?? {}) as Record<string, string>);
        setSync({ status: "ok" });
      },
      (err) => setSync({ status: "error", message: humanError(err) })
    );
  });
}

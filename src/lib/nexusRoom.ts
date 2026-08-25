// ================== SALONS NEXUS : chat + presence, en direct ==================
// Deux personnes connectees avec un COMPTE NEXUS (e-mail + mot de passe) rejoignent
// le meme salon et discutent en temps reel. Aucune validation Google requise :
// n'importe qui peut creer un compte et parler. C'est le principe d'une "classe".

import { auth } from "./googleAuth";
import { db, humanError } from "./nexusAccount";
import {
  collection, doc, addDoc, setDoc, deleteDoc, onSnapshot,
  query, orderBy, limit, serverTimestamp, type Unsubscribe,
} from "firebase/firestore";

export interface ChatMessage {
  id: string;
  uid: string;
  author: string;
  text: string;
  at: number;
}
export interface Member { uid: string; name: string; at: number }

const nameOf = () => {
  const u = auth.currentUser;
  return (u?.displayName || u?.email?.split("@")[0] || "Anonyme") as string;
};

/** Ecoute les messages du salon (les 100 derniers), en direct. */
export function watchMessages(
  room: string,
  cb: (msgs: ChatMessage[]) => void,
  onError?: (m: string) => void
): Unsubscribe {
  const q = query(
    collection(db, "rooms", room, "messages"),
    orderBy("at", "desc"),
    limit(100)
  );
  return onSnapshot(
    q,
    (snap) => {
      const out: ChatMessage[] = [];
      snap.forEach((d) => {
        const v = d.data() as any;
        out.push({
          id: d.id,
          uid: v.uid ?? "",
          author: v.author ?? "Anonyme",
          text: v.text ?? "",
          at: typeof v.at === "number" ? v.at : Date.now(),
        });
      });
      cb(out.reverse());
    },
    (e) => onError?.(humanError(e))
  );
}

export async function sendMessage(room: string, text: string): Promise<void> {
  const u = auth.currentUser;
  if (!u) throw new Error("Connecte-toi a ton compte Nexus pour ecrire.");
  const clean = text.trim();
  if (!clean) return;
  await addDoc(collection(db, "rooms", room, "messages"), {
    uid: u.uid,
    author: nameOf(),
    text: clean.slice(0, 2000),
    at: Date.now(),
    createdAt: serverTimestamp(),
  });
}

/** Signale ta presence dans le salon et ecoute qui est la. */
export function joinRoom(
  room: string,
  cb: (members: Member[]) => void,
  onError?: (m: string) => void
): Unsubscribe {
  const u = auth.currentUser;
  if (!u) { onError?.("Connecte-toi a ton compte Nexus."); return () => {}; }

  const me = doc(db, "rooms", room, "members", u.uid);
  const beat = () =>
    setDoc(me, { uid: u.uid, name: nameOf(), at: Date.now() }).catch((e) =>
      onError?.(humanError(e))
    );
  beat();
  const t = window.setInterval(beat, 25000); // on reste "vivant"

  const un = onSnapshot(
    collection(db, "rooms", room, "members"),
    (snap) => {
      const now = Date.now();
      const out: Member[] = [];
      snap.forEach((d) => {
        const v = d.data() as any;
        // Presents = vus il y a moins d'une minute
        if (now - (v.at ?? 0) < 60000) out.push({ uid: v.uid, name: v.name, at: v.at });
      });
      cb(out);
    },
    (e) => onError?.(humanError(e))
  );

  return () => {
    window.clearInterval(t);
    un();
    deleteDoc(me).catch(() => {});
  };
}

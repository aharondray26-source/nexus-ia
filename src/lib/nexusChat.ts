// ============ MESSAGERIE NEXUS : conversations entre DEUX personnes ============
// Tu ajoutes quelqu'un par son adresse e-mail, tu lui ecris, il recoit. Comme
// une vraie messagerie. Aucun rapport avec Google : il suffit que la personne
// ait un compte Nexus (e-mail + mot de passe, gratuit et instantane).

import { auth } from "./googleAuth";
import { db, humanError } from "./nexusAccount";
import {
  collection, doc, addDoc, setDoc, onSnapshot, query, where,
  orderBy, limit, serverTimestamp, type Unsubscribe,
} from "firebase/firestore";

export interface ChatMessage {
  id: string; from: string; text: string; at: number;
}
export interface Contact { email: string; lastAt?: number }

export const myEmail = (): string =>
  (auth.currentUser?.email || "").trim().toLowerCase();

/** Identifiant unique et STABLE d'une conversation entre deux adresses.
 *  Trie les deux e-mails : ainsi A->B et B->A tombent au meme endroit. */
export function conversationId(a: string, b: string): string {
  const clean = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9@._-]/g, "");
  return [clean(a), clean(b)].sort().join("__");
}

/** Ecoute une conversation avec une personne precise. */
export function watchConversation(
  otherEmail: string,
  cb: (msgs: ChatMessage[]) => void,
  onError?: (m: string) => void
): Unsubscribe {
  const me = myEmail();
  if (!me) { onError?.("Connecte-toi a ton compte Nexus."); return () => {}; }
  const convId = conversationId(me, otherEmail);
  const q = query(
    collection(db, "conversations", convId, "messages"),
    orderBy("at", "desc"),
    limit(200)
  );
  return onSnapshot(
    q,
    (snap) => {
      const out: ChatMessage[] = [];
      snap.forEach((d) => {
        const v = d.data() as any;
        out.push({ id: d.id, from: v.from ?? "", text: v.text ?? "", at: v.at ?? 0 });
      });
      cb(out.reverse());
    },
    (e) => onError?.(humanError(e))
  );
}

/** Envoie un message a une personne. */
export async function sendTo(otherEmail: string, text: string): Promise<void> {
  const me = myEmail();
  if (!me) throw new Error("Connecte-toi a ton compte Nexus pour ecrire.");
  const clean = text.trim();
  if (!clean) return;
  const other = otherEmail.trim().toLowerCase();
  const convId = conversationId(me, other);

  // On enregistre les participants : sert a lister les conversations de chacun.
  await setDoc(
    doc(db, "conversations", convId),
    { members: [me, other], lastAt: Date.now(), lastText: clean.slice(0, 80) },
    { merge: true }
  );
  await addDoc(collection(db, "conversations", convId, "messages"), {
    from: me, to: other, text: clean.slice(0, 2000), at: Date.now(), createdAt: serverTimestamp(),
  });
}

/** Liste toutes les personnes avec qui tu as deja discute. */
export function watchContacts(
  cb: (contacts: Contact[]) => void,
  onError?: (m: string) => void
): Unsubscribe {
  const me = myEmail();
  if (!me) return () => {};
  const q = query(collection(db, "conversations"), where("members", "array-contains", me));
  return onSnapshot(
    q,
    (snap) => {
      const out: Contact[] = [];
      snap.forEach((d) => {
        const v = d.data() as any;
        const other = (v.members || []).find((m: string) => m !== me);
        if (other) out.push({ email: other, lastAt: v.lastAt });
      });
      out.sort((a, b) => (b.lastAt ?? 0) - (a.lastAt ?? 0));
      cb(out);
    },
    (e) => onError?.(humanError(e))
  );
}

// ============ APPELS NEXUS : tu appelles UNE PERSONNE, ca sonne chez elle ============
// La voix passe directement d'un navigateur a l'autre (WebRTC). Firestore ne sert
// qu'a faire sonner et a mettre les deux en relation. Aucun rapport avec Google.

import { auth } from "./googleAuth";
import { db, humanError } from "./nexusAccount";
import {
  collection, doc, addDoc, setDoc, getDoc, onSnapshot, deleteDoc,
  query, where, serverTimestamp, type Unsubscribe,
} from "firebase/firestore";

const ICE: RTCConfiguration = {
  iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }],
};

export interface IncomingCall { id: string; from: string; video: boolean }
export interface CallHandles {
  pc: RTCPeerConnection;
  callId: string;
  localStream: MediaStream;
  hangUp: () => Promise<void>;
}

const me = () => (auth.currentUser?.email || "").trim().toLowerCase();

async function getMedia(video: boolean): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: true, video });
  } catch (e: any) {
    if (e?.name === "NotAllowedError")
      throw new Error("Micro refuse. Autorise le microphone dans ton navigateur.");
    if (e?.name === "NotFoundError")
      throw new Error("Aucun micro detecte sur cet appareil.");
    throw e;
  }
}

function wire(pc: RTCPeerConnection, onRemote: (s: MediaStream) => void, onState?: (s: string) => void) {
  const remote = new MediaStream();
  onRemote(remote);
  pc.ontrack = (ev) => ev.streams[0].getTracks().forEach((t) => remote.addTrack(t));
  pc.onconnectionstatechange = () => onState?.(pc.connectionState);
}

/** Ecoute les appels qui ARRIVENT pour toi (ca "sonne"). */
export function watchIncomingCalls(
  cb: (call: IncomingCall | null) => void,
  onError?: (m: string) => void
): Unsubscribe {
  const mail = me();
  if (!mail) return () => {};
  const q = query(collection(db, "calls"), where("to", "==", mail), where("status", "==", "ringing"));
  return onSnapshot(
    q,
    (snap) => {
      let found: IncomingCall | null = null;
      snap.forEach((d) => {
        const v = d.data() as any;
        // On ignore les appels trop vieux (raccroches sans nettoyage)
        if (Date.now() - (v.at ?? 0) < 60000) {
          found = { id: d.id, from: v.from ?? "", video: !!v.video };
        }
      });
      cb(found);
    },
    (e) => onError?.(humanError(e))
  );
}

/** Appelle une personne par son adresse e-mail. */
export async function callPerson(
  toEmail: string,
  video: boolean,
  onRemote: (s: MediaStream) => void,
  onState?: (s: string) => void
): Promise<CallHandles> {
  const mail = me();
  if (!mail) throw new Error("Connecte-toi a ton compte Nexus pour appeler.");
  const to = toEmail.trim().toLowerCase();
  if (!to) throw new Error("Choisis d'abord une personne a appeler.");

  const localStream = await getMedia(video);
  const pc = new RTCPeerConnection(ICE);
  localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));
  wire(pc, onRemote, onState);

  const callDoc = doc(collection(db, "calls"));
  const offerCands = collection(callDoc, "offerCandidates");
  const answerCands = collection(callDoc, "answerCandidates");
  pc.onicecandidate = (e) => { if (e.candidate) addDoc(offerCands, e.candidate.toJSON()).catch(() => {}); };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  try {
    await setDoc(callDoc, {
      offer: { type: offer.type, sdp: offer.sdp },
      from: mail, to, video, status: "ringing", at: Date.now(), createdAt: serverTimestamp(),
    });
  } catch (e) {
    localStream.getTracks().forEach((t) => t.stop());
    pc.close();
    throw new Error(humanError(e));
  }

  const unAnswer = onSnapshot(callDoc, (snap) => {
    const d = snap.data();
    if (d?.answer && !pc.currentRemoteDescription) {
      pc.setRemoteDescription(new RTCSessionDescription(d.answer)).catch(() => {});
    }
  });
  const unCands = onSnapshot(answerCands, (snap) => {
    snap.docChanges().forEach((c) => {
      if (c.type === "added") pc.addIceCandidate(new RTCIceCandidate(c.doc.data() as any)).catch(() => {});
    });
  });

  const hangUp = async () => {
    unAnswer(); unCands();
    localStream.getTracks().forEach((t) => t.stop());
    pc.close();
    await deleteDoc(callDoc).catch(() => {});
  };
  return { pc, callId: callDoc.id, localStream, hangUp };
}

/** Repond a un appel entrant. */
export async function answerCall(
  callId: string,
  video: boolean,
  onRemote: (s: MediaStream) => void,
  onState?: (s: string) => void
): Promise<CallHandles> {
  const callDoc = doc(db, "calls", callId);
  const snap = await getDoc(callDoc);
  if (!snap.exists()) throw new Error("Cet appel n'existe plus.");

  const localStream = await getMedia(video);
  const pc = new RTCPeerConnection(ICE);
  localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));
  wire(pc, onRemote, onState);

  const offerCands = collection(callDoc, "offerCandidates");
  const answerCands = collection(callDoc, "answerCandidates");
  pc.onicecandidate = (e) => { if (e.candidate) addDoc(answerCands, e.candidate.toJSON()).catch(() => {}); };

  await pc.setRemoteDescription(new RTCSessionDescription(snap.data()!.offer));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  await setDoc(callDoc, { answer: { type: answer.type, sdp: answer.sdp }, status: "active" }, { merge: true });

  const unCands = onSnapshot(offerCands, (s) => {
    s.docChanges().forEach((c) => {
      if (c.type === "added") pc.addIceCandidate(new RTCIceCandidate(c.doc.data() as any)).catch(() => {});
    });
  });

  const hangUp = async () => {
    unCands();
    localStream.getTracks().forEach((t) => t.stop());
    pc.close();
    await deleteDoc(callDoc).catch(() => {});
  };
  return { pc, callId, localStream, hangUp };
}

/** Refuse un appel entrant. */
export async function declineCall(callId: string): Promise<void> {
  await deleteDoc(doc(db, "calls", callId)).catch(() => {});
}

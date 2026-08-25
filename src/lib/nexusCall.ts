// ============ APPELS AUDIO / VIDEO NEXUS (WebRTC) ============
// La voix passe DIRECTEMENT d'un navigateur a l'autre (pair a pair).
// Firestore ne sert qu'a mettre les deux personnes en relation ("signalisation").
// Gratuit, sans serveur a nous, sans validation Google.

import { auth } from "./googleAuth";
import { db, humanError } from "./nexusAccount";
import {
  collection, doc, setDoc, addDoc, getDoc, onSnapshot, deleteDoc,
} from "firebase/firestore";

// Serveurs publics qui aident les deux navigateurs a se trouver a travers les box.
const ICE: RTCConfiguration = {
  iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }],
};

export interface CallHandles {
  pc: RTCPeerConnection;
  callId: string;
  localStream: MediaStream;
  hangUp: () => Promise<void>;
}

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

function wire(
  pc: RTCPeerConnection,
  onRemote: (s: MediaStream) => void,
  onState?: (s: string) => void
) {
  const remote = new MediaStream();
  onRemote(remote);
  pc.ontrack = (ev) => ev.streams[0].getTracks().forEach((t) => remote.addTrack(t));
  pc.onconnectionstatechange = () => onState?.(pc.connectionState);
}

/** Demarre un appel : renvoie un code a 6 chiffres a donner a l'autre personne. */
export async function startCall(
  video: boolean,
  onRemote: (s: MediaStream) => void,
  onState?: (s: string) => void
): Promise<CallHandles> {
  if (!auth.currentUser) throw new Error("Connecte-toi a ton compte Nexus pour appeler.");
  const localStream = await getMedia(video);
  const pc = new RTCPeerConnection(ICE);
  localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));
  wire(pc, onRemote, onState);

  const callId = String(Math.floor(100000 + Math.random() * 900000)); // code court
  const callDoc = doc(db, "calls", callId);
  const offerCands = collection(callDoc, "offerCandidates");
  const answerCands = collection(callDoc, "answerCandidates");

  pc.onicecandidate = (e) => {
    if (e.candidate) addDoc(offerCands, e.candidate.toJSON()).catch(() => {});
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  try {
    await setDoc(callDoc, {
      offer: { type: offer.type, sdp: offer.sdp },
      from: auth.currentUser.uid,
      video,
      at: Date.now(),
    });
  } catch (e) {
    localStream.getTracks().forEach((t) => t.stop());
    pc.close();
    throw new Error(humanError(e));
  }

  // On attend la reponse de l'autre.
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
  return { pc, callId, localStream, hangUp };
}

/** Rejoint un appel avec le code recu. */
export async function joinCall(
  callId: string,
  video: boolean,
  onRemote: (s: MediaStream) => void,
  onState?: (s: string) => void
): Promise<CallHandles> {
  if (!auth.currentUser) throw new Error("Connecte-toi a ton compte Nexus pour rejoindre.");
  const callDoc = doc(db, "calls", callId.trim());
  const snap = await getDoc(callDoc);
  if (!snap.exists()) throw new Error("Ce code d'appel n'existe pas (ou l'appel est termine).");

  const localStream = await getMedia(video);
  const pc = new RTCPeerConnection(ICE);
  localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));
  wire(pc, onRemote, onState);

  const offerCands = collection(callDoc, "offerCandidates");
  const answerCands = collection(callDoc, "answerCandidates");
  pc.onicecandidate = (e) => {
    if (e.candidate) addDoc(answerCands, e.candidate.toJSON()).catch(() => {});
  };

  await pc.setRemoteDescription(new RTCSessionDescription(snap.data()!.offer));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  await setDoc(callDoc, { answer: { type: answer.type, sdp: answer.sdp } }, { merge: true });

  const unCands = onSnapshot(offerCands, (s) => {
    s.docChanges().forEach((c) => {
      if (c.type === "added") pc.addIceCandidate(new RTCIceCandidate(c.doc.data() as any)).catch(() => {});
    });
  });

  const hangUp = async () => {
    unCands();
    localStream.getTracks().forEach((t) => t.stop());
    pc.close();
  };
  return { pc, callId, localStream, hangUp };
}

// ============ NOTIFICATIONS D'APPEL, MEME NEXUS FERME ============
// Objectif : si quelqu'un t'appelle alors que Nexus n'est pas ouvert, tu recois
// quand meme la notification et tu peux repondre.
//
// Deux niveaux, du plus simple au plus complet :
//   1) Onglet ouvert (meme en arriere-plan) -> notification systeme immediate.
//      Marche partout, sans reglage supplementaire.
//   2) Nexus completement ferme -> notification "push" envoyee par Google
//      (Firebase Cloud Messaging), recue par le service worker du site.
//      Necessite d'activer Cloud Messaging dans la console Firebase.

import { auth } from "./googleAuth";
import { db } from "./nexusAccount";
import { doc, setDoc } from "firebase/firestore";

let permission: NotificationPermission = "default";

/** Demande l'autorisation d'afficher des notifications (une seule fois). */
export async function askNotifyPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return "denied";
  if (Notification.permission !== "default") {
    permission = Notification.permission;
    return permission;
  }
  permission = await Notification.requestPermission();
  return permission;
}

export function notifyReady(): boolean {
  return "Notification" in window && Notification.permission === "granted";
}

/** Affiche une notification d'appel entrant, cliquable pour repondre. */
export async function showIncomingCall(from: string, video: boolean) {
  if (!notifyReady()) return;
  const titre = `${from.split("@")[0]} t'appelle`;
  const corps = video ? "Appel vidéo Nexus — clique pour répondre" : "Appel Nexus — clique pour répondre";
  try {
    // Via le service worker : la notification survit a l'onglet en arriere-plan
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      await reg.showNotification(titre, {
        body: corps,
        icon: "/favicon.png",
        badge: "/favicon.png",
        tag: "nexus-call",
        requireInteraction: true,
        data: { url: "/?call=1" },
        // @ts-expect-error : vibrate n'est pas typé partout mais fonctionne
        vibrate: [220, 120, 220, 120, 220],
      });
      return;
    }
    new Notification(titre, { body: corps, icon: "/favicon.png", tag: "nexus-call" });
  } catch {
    /* notifications indisponibles */
  }
}

/** Sonnerie audible, meme si l'onglet n'est pas au premier plan. */
let ring: { ctx: AudioContext; stop: () => void } | null = null;
export function startRinging() {
  stopRinging();
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    let alive = true;
    const bip = () => {
      if (!alive) return;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(880, ctx.currentTime);
      o.frequency.setValueAtTime(660, ctx.currentTime + 0.18);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.55);
      o.connect(g); g.connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + 0.6);
      window.setTimeout(bip, 1400);
    };
    bip();
    ring = { ctx, stop: () => { alive = false; ctx.close().catch(() => {}); } };
  } catch {
    /* audio indisponible */
  }
}
export function stopRinging() {
  ring?.stop();
  ring = null;
}

/** Enregistre l'appareil pour recevoir les appels meme Nexus ferme. */
export async function enablePushForCalls(): Promise<{ ok: boolean; message: string }> {
  const u = auth.currentUser;
  if (!u?.email) return { ok: false, message: "Connecte-toi à ton compte Nexus d'abord." };

  const perm = await askNotifyPermission();
  if (perm !== "granted") {
    return { ok: false, message: "Tu as refusé les notifications. Autorise-les dans ton navigateur pour recevoir les appels." };
  }

  try {
    const { getMessaging, getToken } = await import("firebase/messaging");
    const reg = await navigator.serviceWorker.getRegistration();
    const messaging = getMessaging();
    const token = await getToken(messaging, { serviceWorkerRegistration: reg });
    if (!token) {
      return { ok: false, message: "Impossible d'obtenir un jeton. Active Cloud Messaging dans Firebase." };
    }
    // On enregistre l'appareil : c'est lui qu'on appellera meme Nexus ferme.
    await setDoc(
      doc(db, "nexusDevices", `${u.uid}_${token.slice(0, 24)}`),
      { uid: u.uid, email: u.email.toLowerCase(), token, at: Date.now() },
      { merge: true }
    );
    return { ok: true, message: "Cet appareil recevra les appels même quand Nexus est fermé." };
  } catch (e: any) {
    // Le niveau 1 (onglet ouvert) fonctionne quand meme.
    return {
      ok: false,
      message:
        "Notifications activées pour cet onglet. Pour les recevoir Nexus complètement fermé, active « Cloud Messaging » dans la console Firebase.",
    };
  }
}

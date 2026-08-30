/* ============ RECEPTION DES APPELS, NEXUS FERME ============
   Ce fichier tourne EN DEHORS de la page : il continue a fonctionner quand
   Nexus est ferme (et meme quand le navigateur n'a plus d'onglet Nexus, si
   Nexus est installe comme application). C'est lui qui affiche la notification
   d'appel entrant, a la maniere de FaceTime.                                  */

importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDiakPdM8oY1vuqaLmUOtPTX3J3X88n8kk",
  projectId: "gen-lang-client-0437997480",
  messagingSenderId: "945792446465",
  appId: "1:945792446465:web:b3ccc36de67d4c2260d000",
});

const messaging = firebase.messaging();

// Appel recu alors que Nexus n'est pas affiche.
messaging.onBackgroundMessage((payload) => {
  const d = payload.data || {};
  const de = (d.from || "Quelqu'un").split("@")[0];
  self.registration.showNotification(`${de} t'appelle`, {
    body: d.video === "1" ? "Appel vidéo Nexus" : "Appel Nexus",
    icon: "/favicon.png",
    badge: "/favicon.png",
    tag: "nexus-call",
    renotify: true,
    requireInteraction: true,           // reste affichee jusqu'a reponse
    vibrate: [250, 120, 250, 120, 250],
    silent: false,
    data: { url: `/?call=${d.callId || ""}` },
    actions: [
      { action: "answer", title: "Répondre" },
      { action: "decline", title: "Refuser" },
    ],
  });
});

// Clic sur la notification : on ouvre (ou ramene) Nexus sur l'appel.
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  if (e.action === "decline") return;
  const url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) { c.navigate(url); return c.focus(); }
      }
      return self.clients.openWindow(url);
    })
  );
});

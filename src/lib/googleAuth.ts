import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  type User,
  type Auth
} from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope("https://www.googleapis.com/auth/gmail.readonly");
provider.addScope("https://www.googleapis.com/auth/gmail.send");
provider.addScope("https://www.googleapis.com/auth/drive");
provider.setCustomParameters({ prompt: "select_account" });

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  try {
    return onAuthStateChanged(
      auth,
      async (user: User | null) => {
        if (user) {
          if (cachedAccessToken) {
            if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
          } else if (!isSigningIn) {
            if (onAuthFailure) onAuthFailure();
          }
        } else {
          cachedAccessToken = null;
          if (onAuthFailure) onAuthFailure();
        }
      },
      (error) => {
        console.warn("Auth state observer error:", error);
        if (onAuthFailure) onAuthFailure();
      }
    );
  } catch (err) {
    console.warn("Auth initialization warning:", err);
    if (onAuthFailure) onAuthFailure();
    return () => {};
  }
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Impossible d'obtenir le jeton d'accès Google");
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error("Erreur de connexion Google:", error);
    const errMsg = error?.message || String(error);
    if (errMsg.includes("Database is closing") || errMsg.includes("hidden") || errMsg.includes("indexedDB")) {
      throw new Error("La sécurité de l'aperçu bloque la popup IndexedDB. Ouvrez le site dans un nouvel onglet pour vous connecter à Google.");
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const logoutGoogle = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

// --- REAL GMAIL API CALLS ---

export async function fetchRealGmailMessages(): Promise<Array<{
  id: string;
  senderName: string;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  body: string;
  date: string;
  folder: "inbox" | "sent" | "starred" | "drafts" | "trash";
  read: boolean;
  starred: boolean;
}>> {
  const token = getAccessToken();
  if (!token) throw new Error("Accès Google non autorisé. Veuillez vous connecter.");

  const listRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=15", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!listRes.ok) {
    const err = await listRes.json().catch(() => ({}));
    throw new Error(err.error?.message || "Erreur de lecture Gmail");
  }

  const listData = await listRes.json();
  if (!listData.messages || !Array.isArray(listData.messages)) {
    return [];
  }

  const detailedMessages = await Promise.all(
    listData.messages.slice(0, 10).map(async (m: { id: string }) => {
      try {
        const msgRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=full`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!msgRes.ok) return null;
        const msg = await msgRes.json();

        const headers = msg.payload?.headers || [];
        const getHeader = (name: string) => headers.find((h: { name: string; value: string }) => h.name.toLowerCase() === name.toLowerCase())?.value || "";

        const from = getHeader("From");
        const subject = getHeader("Subject") || "(Sans objet)";
        const dateStr = getHeader("Date");

        let senderName = from;
        let senderEmail = from;
        if (from.includes("<")) {
          const parts = from.split("<");
          senderName = parts[0].trim().replace(/^"/, "").replace(/"$/, "");
          senderEmail = parts[1].replace(">", "").trim();
        }

        let snippet = msg.snippet || "";
        const formattedDate = dateStr ? new Date(dateStr).toLocaleDateString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "Récents";

        const toHeader = getHeader("To") || "mon.adresse@gmail.com";

        return {
          id: msg.id,
          senderName: senderName || senderEmail || "Expéditeur Inconnu",
          senderEmail: senderEmail || "inconnu@gmail.com",
          recipientEmail: toHeader,
          subject,
          body: snippet || "Contenu du message...",
          date: formattedDate,
          folder: "inbox" as const,
          read: !msg.labelIds?.includes("UNREAD"),
          starred: !!msg.labelIds?.includes("STARRED"),
        };
      } catch {
        return null;
      }
    })
  );

  return detailedMessages.filter(Boolean) as Array<{
    id: string;
    senderName: string;
    senderEmail: string;
    recipientEmail: string;
    subject: string;
    body: string;
    date: string;
    folder: "inbox" | "sent" | "starred" | "drafts" | "trash";
    read: boolean;
    starred: boolean;
  }>;
}

export async function sendRealGmailMessage(to: string, subject: string, bodyText: string): Promise<boolean> {
  const token = getAccessToken();
  if (!token) throw new Error("Accès Google non autorisé. Veuillez vous connecter.");

  const emailLines = [
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: text/plain; charset=utf-8`,
    `MIME-Version: 1.0`,
    ``,
    bodyText,
  ];

  const rawEmail = emailLines.join("\r\n");
  const encodedEmail = btoa(unescape(encodeURIComponent(rawEmail)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: encodedEmail }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || "Échec de l'envoi de l'e-mail via Gmail");
  }

  return true;
}

// --- REAL GOOGLE DRIVE API CALLS ---

export async function fetchRealDriveFiles(): Promise<Array<{
  id: string;
  name: string;
  mimeType: string;
  size: string;
  modifiedTime: string;
  webViewLink?: string;
}>> {
  const token = getAccessToken();
  if (!token) throw new Error("Accès Google Drive non autorisé.");

  const res = await fetch("https://www.googleapis.com/drive/v3/files?pageSize=20&fields=files(id,name,mimeType,size,modifiedTime,webViewLink)", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || "Erreur de chargement Google Drive");
  }

  const data = await res.json();
  if (!data.files || !Array.isArray(data.files)) return [];

  return data.files.map((f: { id: string; name: string; mimeType: string; size?: string; modifiedTime?: string; webViewLink?: string }) => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    size: f.size ? `${(parseInt(f.size, 10) / 1024).toFixed(1)} KB` : "Dossier / Doc",
    modifiedTime: f.modifiedTime ? new Date(f.modifiedTime).toLocaleDateString("fr-FR") : "Récents",
    webViewLink: f.webViewLink,
  }));
}

export async function uploadRealDriveFile(name: string, content: string, mimeType = "text/plain"): Promise<string> {
  const token = getAccessToken();
  if (!token) throw new Error("Accès Google Drive non autorisé.");

  const metadata = { name, mimeType };
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("file", new Blob([content], { type: mimeType }));

  const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || "Erreur d'importation sur Google Drive");
  }

  const data = await res.json();
  return data.id;
}

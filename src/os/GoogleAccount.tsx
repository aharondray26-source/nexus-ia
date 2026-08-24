import { useEffect, useState } from "react";
import { LogIn } from "lucide-react";
import { initAuth, googleSignIn } from "../lib/googleAuth";

// Connexion Google GLOBALE, disponible des l'arrivee sur le site (barre du haut).
// Une fois connecte, tous les espaces (Mail, Cloud, Docs...) utilisent ce compte :
// plus besoin de se connecter separement dans chaque application.
export default function GoogleAccount() {
  const [user, setUser] = useState<{ name: string; photo: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const unsub = initAuth(
        (u) => setUser({ name: u.displayName || "Mon compte", photo: u.photoURL || "" }),
        () => setUser(null)
      );
      return typeof unsub === "function" ? unsub : undefined;
    } catch {
      return undefined;
    }
  }, []);

  async function connect() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await googleSignIn();
      if (res?.user) {
        setUser({
          name: res.user.displayName || "Mon compte",
          photo: res.user.photoURL || "",
        });
      }
    } catch (e: any) {
      // On MONTRE l'erreur au lieu de l'avaler : sinon "j'appuie, il se passe rien".
      const code = e?.code || "";
      const msg =
        code === "auth/unauthorized-domain"
          ? "Ce site n'est pas encore autorise dans Firebase. Ajoute le domaine dans Firebase > Authentication > Settings > Authorized domains."
          : code === "auth/popup-blocked"
          ? "Ton navigateur a bloque la fenetre de connexion. Autorise les pop-ups pour ce site."
          : code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request"
          ? "Connexion annulee."
          : e?.message || "Connexion impossible.";
      setError(msg);
      window.setTimeout(() => setError(null), 9000);
    } finally {
      setBusy(false);
    }
  }

  if (user) {
    return (
      <button
        title={`Connecte : ${user.name}`}
        className="flex items-center gap-1.5 rounded-lg border border-nexus-border bg-transparent px-1.5 py-1 text-[11px] text-nexus-text transition-colors hover:border-white/20"
      >
        {user.photo ? (
          <img src={user.photo} alt="" className="h-5 w-5 rounded-full" />
        ) : (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[9px]">
            {user.name.charAt(0)}
          </span>
        )}
        <span className="hidden lg:inline max-w-[90px] truncate">
          {user.name.split(" ")[0]}
        </span>
      </button>
    );
  }

  return (
    <div className="relative">
      {error && (
        <div className="absolute right-0 top-8 z-[300] w-72 rounded-lg border border-red-500/30 bg-red-950/90 px-3 py-2 text-[11px] leading-relaxed text-red-200 shadow-xl backdrop-blur-md">
          {error}
        </div>
      )}
    <button
      onClick={connect}
      disabled={busy}
      title="Se connecter avec Google — active Mail, Cloud et Documents partout"
      className="flex items-center gap-1.5 rounded-lg border border-nexus-border bg-transparent px-2 py-1 text-[11px] text-nexus-muted transition-colors hover:border-white/20 hover:text-nexus-text disabled:opacity-50"
    >
      <LogIn size={14} />
      <span className="hidden lg:inline">{busy ? "..." : "Connexion"}</span>
    </button>
    </div>
  );
}

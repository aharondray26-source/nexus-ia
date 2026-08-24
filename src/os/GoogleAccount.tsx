import { useEffect, useState } from "react";
import { LogIn } from "lucide-react";
import { initAuth, googleSignIn } from "../lib/googleAuth";

// Connexion Google GLOBALE, disponible des l'arrivee sur le site (barre du haut).
// Une fois connecte, tous les espaces (Mail, Cloud, Docs...) utilisent ce compte :
// plus besoin de se connecter separement dans chaque application.
export default function GoogleAccount() {
  const [user, setUser] = useState<{ name: string; photo: string } | null>(null);
  const [busy, setBusy] = useState(false);

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
    try {
      const res = await googleSignIn();
      if (res?.user) {
        setUser({
          name: res.user.displayName || "Mon compte",
          photo: res.user.photoURL || "",
        });
      }
    } catch {
      // Connexion annulee ou popup bloquee : on ne casse rien.
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
    <button
      onClick={connect}
      disabled={busy}
      title="Se connecter avec Google — active Mail, Cloud et Documents partout"
      className="flex items-center gap-1.5 rounded-lg border border-nexus-border bg-transparent px-2 py-1 text-[11px] text-nexus-muted transition-colors hover:border-white/20 hover:text-nexus-text disabled:opacity-50"
    >
      <LogIn size={14} />
      <span className="hidden lg:inline">{busy ? "..." : "Connexion"}</span>
    </button>
  );
}

import { useEffect, useState, type FormEvent } from "react";
import { User as UserIcon, LogOut, Check } from "lucide-react";
import { initAuth, googleSignIn } from "../lib/googleAuth";
import {
  nexusSignIn,
  nexusSignOut,
  watchNexusUser,
  pullFromCloud,
  pushToCloud,
  type NexusUser,
} from "../lib/nexusAccount";

// UN SEUL point de connexion pour tout le site (fini les boutons eparpilles) :
//  - Compte Nexus : ton e-mail + mot de passe -> tes notes te suivent partout.
//  - Google : en plus, pour Gmail et Drive.
export default function AccountMenu() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<NexusUser | null>(null);
  const [google, setGoogle] = useState<{ name: string; photo: string } | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => watchNexusUser(setUser), []);
  useEffect(() => {
    try {
      const un = initAuth(
        (u) => setGoogle({ name: u.displayName || "Google", photo: u.photoURL || "" }),
        () => setGoogle(null)
      );
      return typeof un === "function" ? un : undefined;
    } catch {
      return undefined;
    }
  }, []);

  function humanError(e: any): string {
    const c = e?.code || "";
    if (c === "auth/unauthorized-domain")
      return "Ce site n'est pas encore autorise dans Firebase (Authentication > Settings > Authorized domains).";
    if (c === "auth/operation-not-allowed")
      return "Active la connexion par e-mail dans Firebase (Authentication > Sign-in method).";
    if (c === "auth/weak-password") return "Mot de passe trop court (6 caracteres minimum).";
    if (c === "auth/wrong-password" || c === "auth/invalid-credential")
      return "Mot de passe incorrect pour cette adresse.";
    if (c === "auth/invalid-email") return "Adresse e-mail invalide.";
    if (c === "auth/popup-blocked") return "Le navigateur a bloque la fenetre. Autorise les pop-ups.";
    if (c === "auth/popup-closed-by-user") return "Connexion annulee.";
    if (c === "permission-denied")
      return "Firestore n'autorise pas encore l'ecriture (regles de securite a publier).";
    return e?.message || "Une erreur est survenue.";
  }

  async function submitNexus(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      await nexusSignIn(email.trim(), password);
      setMsg({ text: "Connecte. Tes donnees Nexus sont synchronisees.", ok: true });
      setPassword("");
    } catch (err) {
      setMsg({ text: humanError(err), ok: false });
    } finally {
      setBusy(false);
    }
  }

  async function connectGoogle() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await googleSignIn();
      if (r?.user)
        setGoogle({ name: r.user.displayName || "Google", photo: r.user.photoURL || "" });
    } catch (err) {
      setMsg({ text: humanError(err), ok: false });
    } finally {
      setBusy(false);
    }
  }

  async function sync(dir: "up" | "down") {
    setBusy(true);
    setMsg(null);
    try {
      if (dir === "up") {
        await pushToCloud();
        setMsg({ text: "Sauvegarde envoyee sur ton compte.", ok: true });
      } else {
        const ok = await pullFromCloud();
        setMsg({
          text: ok ? "Donnees restaurees. Recharge la page pour tout voir." : "Rien a restaurer.",
          ok,
        });
      }
    } catch (err) {
      setMsg({ text: humanError(err), ok: false });
    } finally {
      setBusy(false);
    }
  }

  const label = user ? user.email.split("@")[0] : google ? google.name.split(" ")[0] : "Compte";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title="Compte Nexus et Google"
        className="flex items-center gap-1.5 rounded-lg border border-nexus-border bg-transparent px-2 py-1 text-[11px] text-nexus-muted transition-colors hover:border-white/20 hover:text-nexus-text"
      >
        {google?.photo ? (
          <img src={google.photo} alt="" className="h-4 w-4 rounded-full" />
        ) : (
          <UserIcon size={14} className={user ? "text-emerald-400" : ""} />
        )}
        <span className="hidden lg:inline max-w-[90px] truncate">{label}</span>
      </button>

      {open && (
        <div className="nexus-fade-in absolute right-0 top-9 z-[300] w-80 rounded-xl border border-nexus-border bg-nexus-panel p-3.5 shadow-2xl backdrop-blur-[var(--glass-blur)]">
          <div className="mb-2 text-[11px] uppercase tracking-wider text-nexus-muted">
            Compte Nexus
          </div>

          {user ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs text-nexus-text">
                <Check size={13} className="text-emerald-400" />
                <span className="truncate">{user.email}</span>
              </div>
              <p className="text-[11px] leading-relaxed text-nexus-muted">
                Tes notes, taches et reglages te suivent sur tous tes appareils.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => sync("up")}
                  disabled={busy}
                  className="flex-1 rounded-lg border border-nexus-border px-2 py-1.5 text-[11px] text-nexus-text transition-colors hover:bg-white/[0.06] disabled:opacity-50"
                >
                  Sauvegarder
                </button>
                <button
                  onClick={() => sync("down")}
                  disabled={busy}
                  className="flex-1 rounded-lg border border-nexus-border px-2 py-1.5 text-[11px] text-nexus-text transition-colors hover:bg-white/[0.06] disabled:opacity-50"
                >
                  Restaurer
                </button>
              </div>
              <button
                onClick={() => nexusSignOut()}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-nexus-border px-2 py-1.5 text-[11px] text-nexus-muted transition-colors hover:text-red-400"
              >
                <LogOut size={12} /> Se deconnecter
              </button>
            </div>
          ) : (
            <form onSubmit={submitNexus} className="flex flex-col gap-2">
              <p className="text-[11px] leading-relaxed text-nexus-muted">
                Ton e-mail + un mot de passe. Si le compte n'existe pas, il est cree.
              </p>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ton@email.com"
                className="rounded-lg border border-nexus-border bg-nexus-bg px-2.5 py-1.5 text-xs text-nexus-text outline-none focus:border-white/30"
              />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mot de passe (6 min.)"
                className="rounded-lg border border-nexus-border bg-nexus-bg px-2.5 py-1.5 text-xs text-nexus-text outline-none focus:border-white/30"
              />
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg border px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
              >
                {busy ? "..." : "Entrer dans Nexus"}
              </button>
            </form>
          )}

          <div className="my-3 h-px bg-nexus-border" />

          <div className="mb-1.5 text-[11px] uppercase tracking-wider text-nexus-muted">
            Services Google
          </div>
          {google ? (
            <div className="flex items-center gap-2 text-xs text-nexus-text">
              <Check size={13} className="text-emerald-400" />
              <span className="truncate">{google.name} — Gmail et Drive actifs</span>
            </div>
          ) : (
            <button
              onClick={connectGoogle}
              disabled={busy}
              className="w-full rounded-lg border border-nexus-border px-3 py-1.5 text-xs text-nexus-text transition-colors hover:bg-white/[0.06] disabled:opacity-50"
            >
              Connecter Gmail et Drive
            </button>
          )}

          {msg && (
            <p
              className={`mt-2.5 rounded-lg px-2.5 py-1.5 text-[11px] leading-relaxed ${
                msg.ok
                  ? "bg-emerald-500/10 text-emerald-300"
                  : "bg-red-500/10 text-red-300"
              }`}
            >
              {msg.text}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

import { useEffect, useRef, useState, type FormEvent } from "react";
import { User as UserIcon, LogOut, Check, Eye, EyeOff } from "lucide-react";
import { initAuth, googleSignIn, googleSignInBasic } from "../lib/googleAuth";
import {
  nexusSignIn,
  nexusSignOut,
  watchNexusUser,
  watchSync,
  pullFromCloud,
  pushToCloud,
  humanError,
  resetPassword,
  addPasswordToAccount,
  hasPassword,
  type NexusUser,
  type SyncState,
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
  const [showPwd, setShowPwd] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const [sync_, setSync_] = useState<SyncState>({ status: "off" });
  useEffect(() => watchNexusUser(setUser), []);
  useEffect(() => watchSync(setSync_), []);

  // Le menu se ferme si on clique ailleurs, ou avec Echap.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function onReset() {
    if (!email.trim()) { setMsg({ text: "Entre d'abord ton adresse e-mail.", ok: false }); return; }
    setBusy(true); setMsg(null);
    try {
      await resetPassword(email);
      setMsg({ text: "E-mail envoye : ouvre-le pour choisir un nouveau mot de passe.", ok: true });
    } catch (err) {
      setMsg({ text: humanError(err), ok: false });
    } finally { setBusy(false); }
  }
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

  // Entree normale : ouverte a TOUT LE MONDE (aucune validation Google requise).
  async function connectGoogle() {
    setBusy(true); setMsg(null);
    try {
      const u = await googleSignInBasic();
      if (u) setGoogle({ name: u.displayName || "Google", photo: u.photoURL || "" });
    } catch (err) {
      setMsg({ text: humanError(err), ok: false });
    } finally { setBusy(false); }
  }

  // Acces a Gmail / Drive : demande en plus, seulement si l'utilisateur le veut.
  async function connectGmailDrive() {
    setBusy(true); setMsg(null);
    try {
      const r = await googleSignIn();
      if (r?.user) {
        setGoogle({ name: r.user.displayName || "Google", photo: r.user.photoURL || "" });
        setMsg({ text: "Gmail et Drive actives.", ok: true });
      }
    } catch (err) {
      setMsg({ text: humanError(err), ok: false });
    } finally { setBusy(false); }
  }

  // Ajoute un mot de passe a un compte cree via Google (meme compte, 2 entrees).
  async function onAddPassword() {
    if (password.length < 6) { setMsg({ text: "Choisis un mot de passe de 6 caracteres minimum.", ok: false }); return; }
    setBusy(true); setMsg(null);
    try {
      await addPasswordToAccount(password);
      setPassword("");
      setMsg({ text: "Mot de passe ajoute. Tu peux desormais entrer avec ton e-mail OU avec Google.", ok: true });
    } catch (err) {
      setMsg({ text: humanError(err), ok: false });
    } finally { setBusy(false); }
  }

  async function sync(dir: "up" | "down") {
    setBusy(true);
    setMsg(null);
    try {
      if (dir === "up") {
        await pushToCloud();
        setMsg({ text: "Sauvegarde envoyee sur ton compte.", ok: true });
      } else {
        const n = await pullFromCloud();
        setMsg({
          text: n > 0 ? `${n} element(s) restaure(s) depuis ton compte.` : "Rien de nouveau a restaurer.",
          ok: n > 0,
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
    <div className="relative" ref={boxRef}>
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
        <div className="nexus-fade-in absolute right-0 top-9 z-[1000010] w-80 rounded-xl border border-nexus-border bg-nexus-panel p-3.5 shadow-2xl backdrop-blur-[var(--glass-blur)]">
          <div className="mb-2 text-[11px] uppercase tracking-wider text-nexus-muted">
            Compte Nexus
          </div>

          {user ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs text-nexus-text">
                <Check size={13} className="text-emerald-400" />
                <span className="truncate">{user.email}</span>
              </div>
              <p className="flex items-center gap-1.5 text-[11px] leading-relaxed text-nexus-muted">
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{
                    backgroundColor:
                      sync_.status === "ok" ? "#34d399"
                      : sync_.status === "syncing" ? "#fbbf24"
                      : sync_.status === "error" ? "#f87171" : "#71717a",
                  }}
                />
                {sync_.status === "ok" ? "Synchronise en direct sur tous tes appareils."
                  : sync_.status === "syncing" ? "Synchronisation en cours..."
                  : sync_.status === "error" ? "Synchro bloquee (voir ci-dessous)."
                  : "En attente."}
              </p>
              {sync_.status === "error" && sync_.message && (
                <p className="rounded-lg bg-red-500/10 px-2.5 py-1.5 text-[11px] leading-relaxed text-red-300">
                  {sync_.message}
                </p>
              )}
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
              {!hasPassword() && (
                <div className="flex flex-col gap-1.5 rounded-lg border border-nexus-border p-2">
                  <span className="text-[10px] leading-relaxed text-nexus-muted">
                    Ce compte a ete cree via Google. Ajoute un mot de passe pour
                    pouvoir aussi entrer sans Google, depuis n'importe ou.
                  </span>
                  <div className="flex gap-1.5">
                    <input
                      type={showPwd ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Nouveau mot de passe"
                      className="min-w-0 flex-1 rounded-md border border-nexus-border bg-nexus-bg px-2 py-1 text-[11px] text-nexus-text outline-none focus:border-white/30"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((v) => !v)}
                      className="rounded-md border border-nexus-border px-1.5 text-nexus-muted hover:text-nexus-text"
                    >
                      {showPwd ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                    <button
                      onClick={onAddPassword}
                      disabled={busy}
                      className="rounded-md border px-2 py-1 text-[11px] disabled:opacity-50"
                      style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
                    >
                      Ajouter
                    </button>
                  </div>
                </div>
              )}
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
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mot de passe (6 min.)"
                  className="w-full rounded-lg border border-nexus-border bg-nexus-bg px-2.5 py-1.5 pr-8 text-xs text-nexus-text outline-none focus:border-white/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  title={showPwd ? "Masquer" : "Afficher le mot de passe"}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-nexus-muted transition-colors hover:text-nexus-text"
                >
                  {showPwd ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg border px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
              >
                {busy ? "..." : "Entrer dans Nexus"}
              </button>
              <button
                type="button"
                onClick={onReset}
                className="text-[10px] text-nexus-muted underline underline-offset-2 transition-colors hover:text-nexus-text"
              >
                Mot de passe oublie ?
              </button>
            </form>
          )}

          <div className="my-3 h-px bg-nexus-border" />

          <div className="mb-1.5 text-[11px] uppercase tracking-wider text-nexus-muted">
            Avec Google
          </div>
          {google ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-xs text-nexus-text">
                <Check size={13} className="text-emerald-400" />
                <span className="truncate">{google.name}</span>
              </div>
              <button
                onClick={connectGmailDrive}
                disabled={busy}
                className="w-full rounded-lg border border-nexus-border px-3 py-1.5 text-[11px] text-nexus-muted transition-colors hover:bg-white/[0.06] hover:text-nexus-text disabled:opacity-50"
              >
                Autoriser aussi Gmail et Drive
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={connectGoogle}
                disabled={busy}
                className="w-full rounded-lg border border-nexus-border px-3 py-1.5 text-xs text-nexus-text transition-colors hover:bg-white/[0.06] disabled:opacity-50"
              >
                Continuer avec Google
              </button>
              <p className="mt-1 text-[10px] leading-relaxed text-nexus-muted/80">
                Ouvert a tout le monde. C'est le meme compte Nexus : tes donnees
                te suivent, que tu entres par Google ou par mot de passe.
              </p>
            </>
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

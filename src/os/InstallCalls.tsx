import { useEffect, useState } from "react";
import { Download, BellRing, Check, MonitorSmartphone } from "lucide-react";
import { enablePushForCalls, notifyReady } from "../lib/nexusNotify";

/* Bloc « Recevoir les appels partout » : installer Nexus comme application,
   puis autoriser les notifications. Une fois les deux faits, tu recois les
   appels meme quand le navigateur est ferme — comme FaceTime.               */
export default function InstallCalls() {
  const [prompt, setPrompt] = useState<any>(null);
  const [installed, setInstalled] = useState(false);
  const [notif, setNotif] = useState(notifyReady());
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setPrompt(e); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const check = () =>
      setInstalled(window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as any).standalone === true);
    check();
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  async function installer() {
    if (!prompt) {
      setMsg("Ton navigateur n'affiche pas de bouton d'installation. Sur Safari : Fichier → « Ajouter au Dock ». Sur Chrome : l'icône ⊕ dans la barre d'adresse.");
      return;
    }
    prompt.prompt();
    const r = await prompt.userChoice;
    if (r?.outcome === "accepted") setInstalled(true);
    setPrompt(null);
  }

  async function activerAppels() {
    setBusy(true);
    const r = await enablePushForCalls();
    setNotif(notifyReady());
    setMsg(r.message);
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="text-xs uppercase tracking-wider text-nexus-muted">
        Recevoir les appels partout
      </span>
      <p className="text-[11px] leading-relaxed text-nexus-muted">
        Installe Nexus comme application et autorise les notifications : tu recevras
        les appels de tes amis même quand le navigateur est fermé, comme FaceTime.
      </p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button onClick={installer} disabled={installed}
          className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all ${
            installed ? "border-emerald-500/60 bg-emerald-500/10" : "border-nexus-border bg-white/[0.02] hover:bg-white/[0.06]"
          }`}>
          {installed ? <Check size={16} className="shrink-0 text-emerald-400" />
                     : <Download size={16} className="shrink-0" style={{ color: "var(--accent)" }} />}
          <span className="min-w-0">
            <span className="block text-xs font-bold text-nexus-text">
              {installed ? "Application installée" : "1 · Installer Nexus"}
            </span>
            <span className="block text-[10px] leading-relaxed text-nexus-muted">
              {installed ? "Nexus tourne comme une vraie application." : "Une icône sur ton Dock, comme une app native."}
            </span>
          </span>
        </button>

        <button onClick={activerAppels} disabled={busy || notif}
          className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all ${
            notif ? "border-emerald-500/60 bg-emerald-500/10" : "border-nexus-border bg-white/[0.02] hover:bg-white/[0.06]"
          }`}>
          {notif ? <Check size={16} className="shrink-0 text-emerald-400" />
                 : <BellRing size={16} className="shrink-0" style={{ color: "var(--accent)" }} />}
          <span className="min-w-0">
            <span className="block text-xs font-bold text-nexus-text">
              {notif ? "Notifications activées" : "2 · Autoriser les appels"}
            </span>
            <span className="block text-[10px] leading-relaxed text-nexus-muted">
              {notif ? "Tu seras prévenu de chaque appel." : "Une seule autorisation, une fois pour toutes."}
            </span>
          </span>
        </button>
      </div>

      {installed && notif && (
        <p className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-300">
          <MonitorSmartphone size={13} /> Tout est prêt : tu recevras les appels même Nexus fermé.
        </p>
      )}
      {msg && <p className="rounded-lg bg-white/[0.05] px-3 py-2 text-[11px] leading-relaxed text-nexus-muted">{msg}</p>}
    </div>
  );
}

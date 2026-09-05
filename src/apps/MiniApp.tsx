import { useEffect, useRef, useState } from "react";
import { pageComplete, lireMiniApps, type MiniApp as Def } from "../lib/miniApps";
import { addNexusTask } from "../lib/persist";
import { ajouterEvenement, comprendreQuand, comprendreQuoi } from "../lib/agenda";
import { useSettings } from "../os/useSettings";

/* ============ UNE PETITE APPLICATION DE NEXUS ============
   Elle tourne dans un cadre ISOLÉ :
     · `sandbox="allow-scripts"` SANS `allow-same-origin` — le cadre a donc une
       origine à lui, opaque. Il ne peut lire ni le rangement de Nexus, ni ses
       cookies, ni sa page. Ces deux mots ensemble annuleraient l'isolement :
       c'est l'erreur classique, et elle ouvre tout.
     · `srcDoc`, donc rien n'est chargé depuis internet.
     · Elle ne parle que par `postMessage`, et Nexus ne répond qu'à une liste
       FERMÉE de demandes.

   Autrement dit : elle peut ajouter une tâche si on le lui demande, mais elle
   ne peut pas lire les tiennes.                                             */

export default function MiniApp({ appId }: { appId?: string }) {
  const [def, setDef] = useState<Def | null>(null);
  const cadre = useRef<HTMLIFrameElement>(null);
  const setAccent = useSettings((s) => s.setAccent);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const relire = () => setDef(lireMiniApps().find((a) => a.id === appId) || null);
    relire();
    window.addEventListener("nexus:miniapps", relire);
    return () => window.removeEventListener("nexus:miniapps", relire);
  }, [appId]);

  // LA PORTE. Une seule, étroite, et l'on vérifie QUI frappe : le message doit
  // venir du cadre de CETTE application, et porter son identifiant.
  useEffect(() => {
    if (!def) return;
    const surMessage = (e: MessageEvent) => {
      const m = e.data;
      if (!m || m.nexusMini !== true || m.id !== def.id) return;
      if (cadre.current && e.source !== cadre.current.contentWindow) return;

      const repondre = (valeur: unknown) =>
        cadre.current?.contentWindow?.postMessage(
          { nexusReponse: true, jeton: m.jeton, valeur }, "*");

      const d = m.donnees || {};
      switch (m.quoi) {
        case "tache":
          addNexusTask(String(d.texte || "").slice(0, 200), d.quand ? String(d.quand) : undefined);
          setMessage("Tâche ajoutée");
          return repondre(true);
        case "agenda": {
          const t = String(d.titre || "").slice(0, 200);
          const q = comprendreQuand(String(d.quand || ""));
          if (!q.jour) return repondre(false);
          ajouterEvenement({ titre: comprendreQuoi(t) || t, jour: q.jour, heure: q.heure,
                             source: "nexus" });
          setMessage("Ajouté à l'agenda");
          return repondre(true);
        }
        case "note": {
          try {
            const cle = "nexus.notes";
            const l = JSON.parse(localStorage.getItem(cle) || "[]");
            l.unshift({ id: `n-${Date.now()}`, text: String(d.texte || "").slice(0, 4000),
                        createdAt: new Date().toISOString() });
            localStorage.setItem(cle, JSON.stringify(l));
            window.dispatchEvent(new CustomEvent("nexus:persist-update", { detail: { key: cle } }));
          } catch { /* rangement refusé */ }
          setMessage("Note enregistrée");
          return repondre(true);
        }
        case "dire":
          setMessage(String(d.texte || "").slice(0, 160));
          return repondre(true);
        case "accent": {
          // Seulement une couleur, et seulement écrite proprement : on ne laisse
          // pas une application poser n'importe quoi dans le style du site.
          const c = String(d.couleur || "");
          if (/^#[0-9a-f]{6}$/i.test(c)) setAccent(c);
          return repondre(/^#[0-9a-f]{6}$/i.test(c));
        }
        case "ranger": {
          // Son rangement à ELLE, sous son propre nom. Elle ne peut ni lire ni
          // écrire celui de Nexus.
          try {
            const cle = `nexus.miniapp.${def.id}`;
            const o = JSON.parse(localStorage.getItem(cle) || "{}");
            o[String(d.cle || "")] = d.valeur;
            localStorage.setItem(cle, JSON.stringify(o));
          } catch { /* rangement refusé */ }
          return repondre(true);
        }
        case "relire": {
          try {
            const o = JSON.parse(localStorage.getItem(`nexus.miniapp.${def.id}`) || "{}");
            return repondre(o[String(d.cle || "")] ?? null);
          } catch { return repondre(null); }
        }
        case "ouvrir": {
          const e2 = String(d.espace || "");
          if (/^[a-z0-9-]{2,40}$/.test(e2)) {
            (window as any).nexus?.ouvrir?.(e2);
            return repondre(true);
          }
          return repondre(false);
        }
        default:
          // Tout ce qui n'est pas prévu est refusé, sans exception.
          return repondre(null);
      }
    };
    window.addEventListener("message", surMessage);
    return () => window.removeEventListener("message", surMessage);
  }, [def, setAccent]);

  // Le petit bandeau de confirmation s'efface tout seul.
  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(() => setMessage(null), 2400);
    return () => window.clearTimeout(t);
  }, [message]);

  if (!def) {
    return (
      <div className="flex h-full items-center justify-center px-8 text-center text-xs text-nexus-muted">
        Cette petite application n'existe plus.
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col">
      <iframe
        ref={cadre}
        title={def.nom}
        srcDoc={pageComplete(def)}
        // « allow-scripts » SEUL. Ajouter « allow-same-origin » à côté rendrait
        // le cadre capable de tout lire chez Nexus : c'est la combinaison qui
        // annule l'isolement.
        sandbox="allow-scripts"
        className="h-full w-full flex-1 border-0 bg-transparent"
      />
      {message && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2
                        rounded-xl border border-nexus-border bg-nexus-panel px-3 py-1.5
                        text-[11.5px] text-nexus-text shadow-2xl backdrop-blur-xl">
          {message}
        </div>
      )}
    </div>
  );
}

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { APPS, tousLesEspaces } from "./appsRegistry";
import { useWindows } from "./useWindows";
import Icon from "./Icons";
import { queryNexusAIObject } from "../lib/nexusBrain";
import { NexusMessageRenderer } from "./NexusMessageRenderer";
import { Sparkles, Search, Calculator, ArrowRight, Monitor, AppWindow,
         FileText, Wand2 } from "lucide-react";
import { chercheurPC, type ResultatPC } from "../lib/recherchePC";
import { surWindows } from "../lib/pcWindows";

/// Minuscules et sans accents : « Réglages », « reglages » et « RÉGLAGES »
/// deviennent la même chose.
const sansAccent = (s: string) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export default function CommandPalette() {
  const open = useWindows((s) => s.paletteOpen);
  const setOpen = useWindows((s) => s.setPaletteOpen);
  const openApp = useWindows((s) => s.openApp);

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  // Quand la liste deborde, elle est tranchee net contre le bord du panneau :
  // on ne voit pas qu'elle defile, on voit un element coupe. Un degrade en bas
  // dit « ça continue » — et il s'efface des qu'on est arrive au bout.
  // ── LA BARRE QUI REPOND ─────────────────────────────────────────────────
  //
  // Aharon : « il faut que tous les éléments du site soient intelligents. »
  // On tapait une question, on choisissait « Demander à l'IA », le chat
  // s'ouvrait, et on attendait. Maintenant la barre répond ELLE-MÊME, sous ce
  // qu'on écrit, sans rien ouvrir. Entrée ouvre le chat si on veut continuer.
  //
  // On ne demande pas à chaque lettre : on attend que la frappe s'arrête, et
  // seulement si ça ressemble à une question. Sinon chaque nom d'espace tapé
  // déclencherait une requête pour rien.
  const [reponse, setReponse] = useState<{ texte: string; moteur: string } | null>(null);
  const [cherche, setCherche] = useState(false);

  // ── CE QU'IL Y A SUR LE PC ──────────────────────────────────────────────
  //
  // Dans l'application Windows, la barre ne cherche plus seulement dans Nexus :
  // elle cherche sur la MACHINE. Un fichier, une application, une fenêtre déjà
  // ouverte, une automatisation. C'est ce que Windows n'a pas et que le Mac a
  // depuis toujours — et c'est la raison d'être de cette application.
  //
  // Sur le site et sur le Mac, cette liste reste vide et rien ne change : le
  // même code tourne partout, il n'y a pas deux versions à tenir à jour.
  const [surPC, setSurPC] = useState<ResultatPC[]>([]);
  const chercheur = useRef(chercheurPC());
  const demandeEnCours = useRef(0);
  const [resteEnBas, setResteEnBas] = useState(false);
  const listeRef = useRef<HTMLUListElement>(null);
  const mesurerDefilement = useCallback(() => {
    const el = listeRef.current;
    if (!el) return;
    setResteEnBas(el.scrollHeight - el.scrollTop - el.clientHeight > 4);
  }, []);

  // Safe Math Evaluator
  const mathResult = useMemo(() => {
    const q = query.trim();
    if (/^[0-9+\-*/().\s^]+$/.test(q) && q.length > 1 && /[0-9]/.test(q)) {
      try {
        const sanitized = q.replace(/\^/g, "**");
        const val = Function(`"use strict"; return (${sanitized})`)();
        if (typeof val === "number" && !isNaN(val) && isFinite(val)) {
          return String(val);
        }
      } catch {
        return null;
      }
    }
    return null;
  }, [query]);

  // App matches
  const appMatches = useMemo(() => {
    // On replie les accents des DEUX cotes : taper « réglages » doit trouver
    // « reglages », et l'inverse aussi. Sans ca, ecrire correctement le
    // francais empechait de trouver — l'exact contraire du bon sens.
    const q = sansAccent(query.trim());
    // La recherche doit trouver AUSSI les applications fabriquées.
    const visible = tousLesEspaces().filter((a) => !a.hidden);
    if (!q) return visible;
    return visible.filter(
      (a) =>
        sansAccent(a.title).includes(q) || sansAccent(a.keywords).includes(q)
    );
  }, [query]);

  // Combined action items
  const items = useMemo(() => {
    const q = query.trim();
    const list: Array<{
      type: "app" | "ai" | "web" | "math" | "pc";
      id: string;
      title: string;
      subtitle?: string;
      icon: string | React.ReactNode;
      appId?: string;
      agir?: () => Promise<unknown>;
    }> = [];

    if (mathResult !== null) {
      list.push({
        type: "math",
        id: "math-action",
        title: `= ${mathResult}`,
        subtitle: `Calcul instantané pour "${q}"`,
        icon: <Calculator className="w-4 h-4 text-emerald-400" />,
      });
    }

    // Ce qui est sur le PC passe AVANT « demander à l'IA » : quand on tape le
    // nom d'un fichier, on veut le fichier, pas une dissertation dessus.
    const icones: Record<ResultatPC["sorte"], React.ReactNode> = {
      fenetre: <AppWindow className="h-4 w-4 text-cyan-400" />,
      application: <Monitor className="h-4 w-4 text-indigo-400" />,
      fichier: <FileText className="h-4 w-4 text-amber-400" />,
      automatisation: <Wand2 className="h-4 w-4 text-emerald-400" />,
    };
    surPC.forEach((r, i) => {
      list.push({
        type: "pc",
        id: `pc-${r.sorte}-${i}`,
        title: r.titre,
        subtitle: r.detail,
        icon: icones[r.sorte],
        agir: r.agir,
      });
    });

    if (q) {
      list.push({
        type: "ai",
        id: "ai-action",
        title: `Demander à l'IA : "${q}"`,
        subtitle: "Lancer la réponse intelligente Nexus AI",
        icon: <Sparkles className="w-4 h-4 text-purple-400" />,
      });

      list.push({
        type: "web",
        id: "web-action",
        title: `Rechercher "${q}" sur le Web & Wikipedia`,
        subtitle: "Ouvrir le moteur de recherche Nexus",
        icon: <Search className="w-4 h-4 text-cyan-400" />,
      });
    }

    appMatches.forEach((app) => {
      list.push({
        type: "app",
        id: app.id,
        title: app.title,
        // Le sous-titre disait « Ouvrir l'application X » sous un titre deja
        // nomme X : du bruit. On montre ce qu'on FAIT dans cet espace.
        subtitle: (app.keywords || "")
          .split(/\s+/).filter(Boolean).slice(0, 5).join(" · "),
        icon: app.icon,
        appId: app.id,
      });
    });

    return list;
  }, [query, mathResult, appMatches, surPC]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // ATTENTION : ce hook doit rester AVANT le retour anticipe ci-dessous. Place
  // apres, il n'est appele que lorsque la palette est ouverte — le nombre de
  // hooks change d'un rendu a l'autre et React s'arrete net (erreur 310,
  // ecran noir). Le nombre de resultats change a chaque frappe : on remesure.
  // Est-ce une question, ou juste le nom d'un espace ?
  const ressembleAUneQuestion = (t: string) => {
    const q = t.trim();
    if (q.length < 8) return false;
    if (q.endsWith("?")) return true;
    // Un mot interrogatif au début, ou une vraie phrase (quatre mots ou plus).
    if (/^(qui|que|quoi|quel|quelle|quels|quelles|quand|où|ou|comment|pourquoi|combien|explique|résume|resume|traduis|calcule|donne|écris|ecris|fais|aide)\b/i.test(q)) return true;
    return q.split(/\s+/).length >= 4;
  };

  useEffect(() => {
    setReponse(null);
    const q = query.trim();
    if (!open || !ressembleAUneQuestion(q)) { setCherche(false); return; }
    const mien = ++demandeEnCours.current;
    const t = window.setTimeout(async () => {
      setCherche(true);
      try {
        const r = await queryNexusAIObject(q, []);
        // Une réponse arrivée après qu'on a continué à taper n'intéresse plus
        // personne : on la jette plutôt que d'écraser la suivante.
        if (mien !== demandeEnCours.current) return;
        setReponse({ texte: r.reply, moteur: r.modelUsed });
      } catch {
        if (mien === demandeEnCours.current) setReponse(null);
      } finally {
        if (mien === demandeEnCours.current) setCherche(false);
      }
    }, 700);
    return () => window.clearTimeout(t);
  }, [query, open]);

  useEffect(() => {
    if (!open) { chercheur.current.oublier(); setSurPC([]); return; }
    chercheur.current.chercher(query, setSurPC);
  }, [query, open]);

  useEffect(mesurerDefilement, [mesurerDefilement, items, open]);

  if (!open) return null;

  function executeItem(item: typeof items[0]) {
    if (!item) return;

    if (item.type === "pc" && item.agir) {
      // On ferme TOUT DE SUITE, sans attendre la machine : ouvrir Word prend
      // deux secondes, et une barre qui reste figée pendant ce temps donne
      // l'impression que le clic n'a pas été pris.
      setOpen(false);
      item.agir().catch((e) => {
        window.dispatchEvent(new CustomEvent("nexus:toast", {
          detail: { texte: e instanceof Error ? e.message : String(e) },
        }));
      });
      return;
    }

    if (item.type === "app" && item.appId) {
      const app = tousLesEspaces().find((a) => a.id === item.appId);
      openApp(item.appId, app ? { width: app.width, height: app.height } : undefined);
    } else if (item.type === "ai") {
      window.dispatchEvent(new CustomEvent("nexus:open-ai"));
      // Trigger question in AI
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("nexus:ai-query", { detail: { query: query.trim() } })
        );
      }, 200);
    } else if (item.type === "web") {
      openApp("web", { width: 620, height: 480 });
    } else if (item.type === "math") {
      navigator.clipboard.writeText(mathResult || "");
    }

    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (items[selectedIndex]) executeItem(items[selectedIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[900] flex items-start justify-center bg-black/45 px-4 pt-[13vh] backdrop-blur-[3px]"
      onClick={() => setOpen(false)}
    >
      <div
        className="nexus-naissance nx-palette w-full max-w-2xl overflow-hidden rounded-[26px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex items-center gap-3 border-b border-white/10 px-5 py-4">
          <Search className="h-[18px] w-[18px] shrink-0 text-nexus-muted" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={surWindows()
              ? "Cherche un fichier, une application, ou demande n'importe quoi"
              : "Chercher un espace, calculer, ou demander à l'IA"}
            className="nx-champ w-full bg-transparent text-nexus-text outline-none placeholder:text-nexus-muted font-sans"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-xs text-nexus-muted hover:text-nexus-text px-2 py-0.5 rounded bg-nexus-card"
            >
              Effacer
            </button>
          )}
        </div>

        {/* La réponse, sous le champ. Elle ne pousse pas la liste : elle se
            met AVANT, parce que c'est ce qu'on est venu chercher quand on pose
            une question. */}
        {(cherche || reponse) && (
          <div className="nx-entre border-b border-white/10 px-5 py-3.5">
            {cherche && !reponse ? (
              <div className="flex items-center gap-2 text-[12px] text-nexus-muted">
                <Sparkles className="h-3.5 w-3.5 animate-pulse text-purple-400" />
                Nexus réfléchit…
              </div>
            ) : reponse ? (
              <>
                <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-nexus-muted">
                  <Sparkles className="h-3 w-3 text-purple-400" />
                  {reponse.moteur}
                </div>
                <div className="max-h-[220px] overflow-y-auto pr-1 text-[13px] leading-relaxed">
                  <NexusMessageRenderer content={reponse.texte} />
                </div>
              </>
            ) : null}
          </div>
        )}

        <ul
          ref={listeRef}
          onScroll={mesurerDefilement}
          className="nx-entre-liste max-h-[min(52vh,420px)] overflow-y-auto p-2 pb-3 space-y-1 [scrollbar-width:thin]"
          style={
            // C'est le CONTENU qui s'efface, pas un voile de couleur pose
            // par-dessus : un degrade colore reclamerait la teinte exacte du
            // panneau, differente en mode clair et en mode sombre, et laisserait
            // une trace grise des qu'on se trompe. Le masque, lui, est juste.
            resteEnBas
              ? { maskImage: "linear-gradient(to bottom, #000 calc(100% - 38px), transparent)",
                  WebkitMaskImage: "linear-gradient(to bottom, #000 calc(100% - 38px), transparent)" }
              : undefined
          }
        >
          {items.map((item, i) => {
            const isSelected = i === selectedIndex;
            return (
              <li key={item.id}>
                <button
                  onClick={() => executeItem(item)}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className={`flex w-full items-center justify-between gap-3 rounded-2xl px-3.5 py-2.5 text-left transition-all duration-[220ms] [transition-timing-function:var(--appui)] ${
                    isSelected
                      ? "bg-cyan-500/15 border border-cyan-500/40 text-nexus-text"
                      : "text-nexus-muted hover:bg-nexus-card hover:text-nexus-text"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="nx-chip shrink-0 flex items-center justify-center w-7 h-7">
                      {typeof item.icon === "string" ? (
                        <Icon name={item.icon} size={16} />
                      ) : (
                        item.icon
                      )}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[13px] font-semibold truncate text-nexus-text">
                        {item.title}
                      </span>
                      {item.subtitle && (
                        <span className="text-[11px] text-nexus-muted truncate">
                          {item.subtitle}
                        </span>
                      )}
                    </div>
                  </div>

                  <ArrowRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${isSelected ? "text-cyan-400 translate-x-0.5" : "text-nexus-muted"}`} />
                </button>
              </li>
            );
          })}

          {items.length === 0 && (
            <li className="px-3 py-8 text-center text-xs text-slate-400">
              Tape une question ou le nom d'un outil...
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

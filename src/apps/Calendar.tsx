import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, Trash2, Download, Clock } from "lucide-react";
import {
  lireEvenements, ajouterEvenement, retirerEvenement, telechargerIcs,
  comprendreQuand, comprendreQuoi, enJour, enFrancais, type Evenement,
} from "../lib/agenda";

/* ============================ AGENDA NEXUS ============================
   Aharon : « il faut que la mascotte puisse ajouter un évènement dans mon
   agenda quand je lui demande ».

   C'était impossible : cet écran était une grille de mois, quatre-vingt-dix-
   neuf lignes, qui ne contenait AUCUN évènement. On ne pouvait rien y écrire
   parce qu'il n'y avait pas d'endroit où écrire. Le voici.

   Et les mois s'écrivaient « fevrier », « aout », « decembre » — sans accents,
   sur un site en français.                                                  */

const JOURS = ["L", "M", "M", "J", "V", "S", "D"];
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet",
              "août", "septembre", "octobre", "novembre", "décembre"];

export default function Calendar() {
  const aujourdhui = new Date();
  const [vue, setVue] = useState(new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), 1));
  const [evenements, setEvenements] = useState<Evenement[]>(() => lireEvenements());
  const [jourChoisi, setJourChoisi] = useState<string>(enJour(aujourdhui));
  const [saisie, setSaisie] = useState("");

  // L'agenda ouvert se met à jour quand la mascotte y écrit, sans qu'on ait à
  // le fermer et le rouvrir.
  useEffect(() => {
    const relire = () => setEvenements(lireEvenements());
    window.addEventListener("nexus:persist-update", relire);
    window.addEventListener("storage", relire);
    return () => {
      window.removeEventListener("nexus:persist-update", relire);
      window.removeEventListener("storage", relire);
    };
  }, []);

  const an = vue.getFullYear();
  const mois = vue.getMonth();

  // Lundi = premier jour de la semaine.
  const premier = (new Date(an, mois, 1).getDay() + 6) % 7;
  const combien = new Date(an, mois + 1, 0).getDate();
  const cases: (number | null)[] = [
    ...Array(premier).fill(null),
    ...Array.from({ length: combien }, (_, i) => i + 1),
  ];

  /// Combien d'évènements ce jour-là — pour le point sous la date.
  const parJour = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of evenements) m.set(e.jour, (m.get(e.jour) || 0) + 1);
    return m;
  }, [evenements]);

  const duJour = evenements.filter((e) => e.jour === jourChoisi);

  const estAujourdhui = (d: number) =>
    d === aujourdhui.getDate() && mois === aujourdhui.getMonth() && an === aujourdhui.getFullYear();
  const jourDe = (d: number) => enJour(new Date(an, mois, d));

  function ajouter() {
    const t = saisie.trim();
    if (!t) return;
    // On comprend « contrôle de maths vendredi à 14h » directement dans le
    // champ : sans date écrite, c'est le jour sélectionné qui compte.
    const q = comprendreQuand(t);
    ajouterEvenement({
      titre: comprendreQuoi(t),
      jour: q.jour || jourChoisi,
      heure: q.heure,
      source: "moi",
    });
    setSaisie("");
    if (q.jour) { setJourChoisi(q.jour);
      const [a, m] = q.jour.split("-").map(Number);
      setVue(new Date(a, m - 1, 1)); }
    setEvenements(lireEvenements());
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <button onClick={() => setVue(new Date(an, mois - 1, 1))}
                className="nx-btn nx-btn-secondary text-sm">‹</button>
        <span className="text-sm font-medium capitalize text-nexus-text">
          {MOIS[mois]} {an}
        </span>
        <button onClick={() => setVue(new Date(an, mois + 1, 1))}
                className="nx-btn nx-btn-secondary text-sm">›</button>
      </div>

      <div className="grid shrink-0 grid-cols-7 gap-1 text-center">
        {JOURS.map((d, i) => (
          <span key={i} className="py-1 text-[10px] uppercase text-nexus-muted">{d}</span>
        ))}
        {cases.map((d, i) => {
          if (!d) return <div key={i} className="aspect-square" />;
          const j = jourDe(d);
          const combien = parJour.get(j) || 0;
          const choisi = j === jourChoisi;
          return (
            <button
              key={i}
              onClick={() => setJourChoisi(j)}
              className={`relative flex aspect-square items-center justify-center rounded-lg text-sm
                transition-all duration-[var(--t-petit)] [transition-timing-function:var(--appui)]
                active:scale-90 ${
                  choisi ? "ring-1 ring-[var(--accent)]" : "hover:bg-nexus-card"
                }`}
              style={estAujourdhui(d)
                ? { backgroundColor: "var(--accent)", color: "#09090b", fontWeight: 600 }
                : undefined}
            >
              {d}
              {/* Le point qui dit « il y a quelque chose ce jour-là ». */}
              {combien > 0 && (
                <span
                  className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full"
                  style={{ backgroundColor: estAujourdhui(d) ? "#09090b" : "var(--accent)" }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* CE QU'IL Y A CE JOUR-LÀ.
          `min-h` n'est pas un détail : dans une fenêtre courte, la grille se
          servait la première et cette liste tombait à ZÉRO pixel. On voyait le
          point sous la date, on cliquait, et rien n'apparaissait — sans une
          seule erreur. C'est le piège qui a déjà coûté cher ailleurs. */}
      <div className="min-h-[86px] flex-1 overflow-y-auto">
        {duJour.length === 0 ? (
          <p className="px-1 py-3 text-[11.5px] leading-relaxed text-nexus-muted">
            Rien le {enFrancais({ id: "", titre: "", jour: jourChoisi })}.
            <br />
            Écris ci-dessous — ou demande-le à Nexus : « ajoute contrôle de maths vendredi à 14h ».
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {duJour.map((e) => (
              <li key={e.id}
                  className="group flex items-center gap-2 rounded-xl border border-nexus-border
                             bg-nexus-card px-2.5 py-2">
                {e.heure && (
                  <span className="flex shrink-0 items-center gap-1 text-[11px] tabular-nums text-nexus-muted">
                    <Clock size={11} />{e.heure}
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate text-[12.5px] text-nexus-text">
                  {e.titre}
                </span>
                {/* Le pont vers le Calendrier de macOS : un fichier que le Mac
                    sait ouvrir. Un site n'a pas le droit d'écrire dans l'agenda
                    du système — prétendre le contraire serait mentir. */}
                <button onClick={() => telechargerIcs(e)}
                        title="Ajouter au Calendrier de macOS"
                        className="shrink-0 rounded-lg p-1 text-nexus-muted opacity-0
                                   transition-opacity hover:text-nexus-text group-hover:opacity-100">
                  <Download size={13} />
                </button>
                <button onClick={() => { retirerEvenement(e.id); setEvenements(lireEvenements()); }}
                        title="Retirer"
                        className="shrink-0 rounded-lg p-1 text-nexus-muted opacity-0
                                   transition-opacity hover:text-rose-400 group-hover:opacity-100">
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex shrink-0 gap-2">
        <input
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ajouter()}
          placeholder="Contrôle de maths vendredi à 14h…"
          className="min-w-0 flex-1 rounded-xl border border-nexus-border bg-nexus-card px-3
                     py-2 text-xs text-nexus-text outline-none placeholder:text-nexus-muted
                     focus:border-[var(--accent)]"
        />
        <button onClick={ajouter} disabled={!saisie.trim()}
                className="nx-btn nx-btn-primary shrink-0 disabled:opacity-40">
          <CalendarPlus size={14} />
        </button>
      </div>

      <button
        onClick={() => { const d = new Date(); setVue(new Date(d.getFullYear(), d.getMonth(), 1));
                         setJourChoisi(enJour(d)); }}
        className="nx-btn nx-btn-secondary text-xs"
      >
        Revenir à aujourd'hui
      </button>
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Monitor, Cpu, HardDrive, BatteryCharging, Wifi, WifiOff, Power, Link2,
  MousePointerClick, Wand2, Timer, ScanText, FolderOpen, Play, Trash2,
  Check, Download, Sparkles, AlertTriangle,
} from "lucide-react";
import { useSettings } from "../os/useSettings";
import { pc, surWindows, type MachinePC, type IntegrationsPC,
         type SeancePC, type ScriptPC } from "../lib/pcWindows";

/* ============================================================================
   SUR TON PC
   ---------------------------------------------------------------------------
   Aharon : « fais l'application Windows complète, elle doit être largement
   meilleure au niveau des fonctions », et « garde notre beau style en
   l'améliorant ».

   Cet espace est le tableau de bord de l'application Windows. Il montre CE QUE
   NEXUS PEUT FAIRE ICI ET PAS AILLEURS, et il le fait faire en un clic :

     · la machine, en vrai, mesurée à l'instant ;
     · Nexus branché dans Windows — démarrage, adresse nexus://, clic droit
       de l'Explorateur ;
     · le mode concentration, pour travailler une heure sans être rappelé ;
     · les automatisations écrites par la mascotte, lisibles et effaçables ;
     · la lecture de l'écran, avec la reconnaissance de texte de Windows.

   Et quand on n'est PAS dans l'application — sur le site, sur le Mac — le même
   espace explique comment l'obtenir, au lieu de montrer des boutons morts.
============================================================================ */

/// Un anneau de progression. C'est plus lisible qu'une barre pour « il reste
/// tant », et ça tient dans un coin de carte.
function Anneau({ part, couleur, taille = 46 }: { part: number; couleur: string; taille?: number }) {
  const r = (taille - 6) / 2;
  const tour = 2 * Math.PI * r;
  const rempli = Math.max(0, Math.min(1, part));
  return (
    <svg width={taille} height={taille} className="shrink-0 -rotate-90">
      <circle cx={taille / 2} cy={taille / 2} r={r} fill="none"
              stroke="currentColor" strokeWidth="4" className="text-nexus-border" />
      <circle
        cx={taille / 2} cy={taille / 2} r={r} fill="none"
        stroke={couleur} strokeWidth="4" strokeLinecap="round"
        strokeDasharray={tour} strokeDashoffset={tour * (1 - rempli)}
        style={{ transition: "stroke-dashoffset 620ms var(--ressort, cubic-bezier(.32,.72,0,1))" }}
      />
    </svg>
  );
}

/// Une touche du clavier, dessinée. « Alt+Espace » écrit en texte se lit comme
/// une note de bas de page ; dessiné, ça se retient.
function Touche({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded-[7px] border border-nexus-border bg-nexus-card px-2 py-[3px]
                    text-[11px] font-semibold text-nexus-text shadow-[0_1.5px_0_rgba(0,0,0,.35)]">
      {children}
    </kbd>
  );
}

function Carte({ titre, icone, accent, children, aside }: {
  titre: string; icone: React.ReactNode; accent: string;
  children: React.ReactNode; aside?: React.ReactNode;
}) {
  return (
    <div className="nx-widget !gap-3 !p-4 shrink-0">
      <div className="nx-widget-title">
        <span className="nx-widget-icon" style={{ backgroundColor: accent + "26", color: accent }}>
          {icone}
        </span>
        <span className="min-w-0 flex-1 truncate">{titre}</span>
        {aside}
      </div>
      {children}
    </div>
  );
}

/// Un interrupteur. Le même partout dans Nexus : on le reconnaît sans lire.
function Bascule({ actif, surClic, libelle, detail, occupe }: {
  actif: boolean; surClic: () => void; libelle: string; detail: string; occupe?: boolean;
}) {
  return (
    <button
      onClick={surClic}
      disabled={occupe}
      className="nx-item flex w-full items-start gap-3 text-left disabled:opacity-50"
    >
      <span
        className="mt-[3px] flex h-[18px] w-[32px] shrink-0 items-center rounded-full p-[2px]
                   transition-colors duration-[280ms]"
        style={{ backgroundColor: actif ? "var(--accent)" : "var(--nexus-border)" }}
      >
        <span
          className="h-[14px] w-[14px] rounded-full bg-white shadow"
          style={{
            transform: actif ? "translateX(14px)" : "translateX(0)",
            transition: "transform 280ms var(--ressort, cubic-bezier(.34,1.32,.5,1))",
          }}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-[12.5px] font-medium text-nexus-text">{libelle}</span>
        <span className="block text-[11px] leading-relaxed text-nexus-muted">{detail}</span>
      </span>
    </button>
  );
}

const DUREES = [15, 25, 45, 60, 90];

export default function NexusPC() {
  const accent = useSettings((s) => s.accent);
  const dansLApp = surWindows();

  const [machine, setMachine] = useState<MachinePC | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationsPC | null>(null);
  const [scripts, setScripts] = useState<ScriptPC[]>([]);
  const [seance, setSeance] = useState<SeancePC | null>(null);
  const [distractions, setDistractions] = useState<string[]>([]);
  const [duree, setDuree] = useState(45);
  const [choisies, setChoisies] = useState<string[]>([]);
  const [lecture, setLecture] = useState<{ png: string; texte: string } | null>(null);
  const [occupe, setOccupe] = useState<string | null>(null);
  const [souci, setSouci] = useState<string | null>(null);
  const vivant = useRef(true);

  const dire = useCallback((e: unknown) => {
    setSouci(e instanceof Error ? e.message : String(e));
  }, []);

  const relire = useCallback(async () => {
    if (!dansLApp) return;
    try {
      const [m, i, s, c, d] = await Promise.all([
        pc.etatMachine(), pc.etatIntegrations(), pc.listerScripts(),
        pc.etatConcentration(), pc.distractionsOuvertes(),
      ]);
      if (!vivant.current) return;
      setMachine(m); setIntegrations(i); setScripts(s); setSeance(c);
      setDistractions(d);
      setChoisies((avant) => (avant.length ? avant : d));
    } catch (e) { dire(e); }
  }, [dansLApp, dire]);

  useEffect(() => {
    vivant.current = true;
    relire();
    return () => { vivant.current = false; };
  }, [relire]);

  // Le compte à rebours de la séance. Une minuterie qui ne s'arrête pas quand
  // on ferme l'espace continue de tourner pour rien — et sur un portable, ça
  // se voit sur la batterie.
  useEffect(() => {
    if (!seance?.en_cours) return;
    const t = window.setInterval(() => {
      setSeance((s) => {
        if (!s || !s.en_cours) return s;
        const reste = s.secondes_restantes - 1;
        if (reste <= 0) { relire(); return { ...s, en_cours: false, secondes_restantes: 0 }; }
        return { ...s, secondes_restantes: reste };
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [seance?.en_cours, relire]);

  async function faire(quoi: string, action: () => Promise<unknown>) {
    setOccupe(quoi); setSouci(null);
    try { await action(); await relire(); }
    catch (e) { dire(e); }
    finally { if (vivant.current) setOccupe(null); }
  }

  // ── PAS DANS L'APPLICATION : on explique, on ne fait pas semblant ────────
  if (!dansLApp) {
    return (
      <div className="flex h-full flex-col gap-3 overflow-y-auto p-2">
        <Carte titre="Nexus sur ton PC Windows" accent={accent}
               icone={<Monitor size={13} strokeWidth={2.4} />}>
          <p className="text-xs leading-relaxed text-nexus-muted">
            Il existe une vraie application Nexus pour Windows. Elle fait tout ce
            que fait ce site, <span className="text-nexus-text">et ce qu'un site
            n'a pas le droit de faire</span> : ouvrir tes applications, retrouver
            un fichier n'importe où sur le disque, lire l'écran, écrire des
            automatisations.
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11.5px] text-nexus-muted">
            <span>Elle s'ouvre par-dessus tout avec</span>
            <Touche>Alt</Touche><span className="text-nexus-muted">+</span><Touche>Espace</Touche>
          </div>
        </Carte>

        <Carte titre="Comment l'obtenir" accent="#22c55e"
               icone={<Download size={13} strokeWidth={2.4} />}>
          <ol className="flex flex-col gap-2 text-[11.5px] leading-relaxed text-nexus-muted">
            <li><span className="text-nexus-text">1.</span> Va sur ton dépôt GitHub,
              onglet <span className="text-nexus-text">Actions</span>.</li>
            <li><span className="text-nexus-text">2.</span> À gauche, choisis
              <span className="text-nexus-text"> « Nexus pour Windows »</span>, puis
              le bouton <span className="text-nexus-text">Run workflow</span>.</li>
            <li><span className="text-nexus-text">3.</span> Dix minutes plus tard,
              l'installateur est en bas de la page, dans
              <span className="text-nexus-text"> Artifacts</span>.</li>
            <li><span className="text-nexus-text">4.</span> Sur le PC : double-clic,
              et c'est fini. <span className="text-nexus-text">Aucun mot de passe
              administrateur n'est demandé</span> — Nexus s'installe pour toi seul.</li>
          </ol>
        </Carte>

        <Carte titre="Ce qu'elle a de plus que le Mac" accent="#8b5cf6"
               icone={<Sparkles size={13} strokeWidth={2.4} />}>
          <ul className="flex flex-col gap-1.5 text-[11.5px] leading-relaxed text-nexus-muted">
            <li>• <span className="text-nexus-text">Chercher dans le contenu</span> de
              tous tes documents, sans aucune autorisation à donner.</li>
            <li>• <span className="text-nexus-text">« Analyser avec Nexus »</span> dans
              le clic droit de l'Explorateur, sur n'importe quel fichier.</li>
            <li>• <span className="text-nexus-text">Des automatisations</span> qui
              s'installent sans qu'Apple demande un clic de confirmation.</li>
            <li>• <span className="text-nexus-text">Installer un logiciel</span> à la
              demande, avec winget.</li>
            <li>• <span className="text-nexus-text">Lire l'écran</span> sans
              l'autorisation « Enregistrement de l'écran » qu'exige macOS.</li>
          </ul>
        </Carte>
      </div>
    );
  }

  // ── DANS L'APPLICATION ──────────────────────────────────────────────────
  const memoireUtilisee = machine
    ? 1 - machine.memoire_libre_go / Math.max(machine.memoire_go, 0.1)
    : 0;
  const disqueUtilise = machine
    ? 1 - machine.disque_libre_go / Math.max(machine.disque_go, 0.1)
    : 0;
  const mmss = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-2">
      {souci && (
        <div className="nx-entre flex items-start gap-2 rounded-xl border border-red-500/30
                        bg-red-500/10 px-3 py-2 text-[11.5px] leading-relaxed text-nexus-text">
          <AlertTriangle size={13} className="mt-[2px] shrink-0 text-red-400" />
          <span className="min-w-0 whitespace-pre-line">{souci}</span>
        </div>
      )}

      {/* ── LA MACHINE ── */}
      <Carte
        titre={machine?.nom || "Cette machine"}
        accent={accent}
        icone={<Cpu size={13} strokeWidth={2.4} />}
        aside={
          <span className="shrink-0 text-[10px] text-nexus-muted">
            {machine?.windows?.split(" ").slice(0, 3).join(" ")}
          </span>
        }
      >
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Anneau part={memoireUtilisee} couleur={accent} />
              <span className="absolute inset-0 grid place-items-center text-[10px] font-semibold text-nexus-text">
                {Math.round(memoireUtilisee * 100)}%
              </span>
            </div>
            <span className="min-w-0">
              <span className="block text-[11px] font-medium text-nexus-text">Mémoire</span>
              <span className="block text-[10.5px] text-nexus-muted">
                {machine ? `${machine.memoire_go} Go` : "…"}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Anneau part={disqueUtilise} couleur="#38bdf8" />
              <span className="absolute inset-0 grid place-items-center text-[10px] font-semibold text-nexus-text">
                {Math.round(disqueUtilise * 100)}%
              </span>
            </div>
            <span className="min-w-0">
              <span className="block text-[11px] font-medium text-nexus-text">Disque</span>
              <span className="block text-[10.5px] text-nexus-muted">
                {machine ? `${Math.round(machine.disque_libre_go)} Go libres` : "…"}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="grid h-[46px] w-[46px] place-items-center rounded-full border border-nexus-border">
              <BatteryCharging size={17} className="text-emerald-400" />
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] font-medium text-nexus-text">Batterie</span>
              <span className="block text-[10.5px] text-nexus-muted">
                {/* On ne dit PAS « 100 % » sur une machine sans batterie. */}
                {machine?.batterie == null
                  ? "pas de batterie"
                  : `${machine.batterie}% · ${machine.sur_secteur ? "branché" : "sur batterie"}`}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="grid h-[46px] w-[46px] place-items-center rounded-full border border-nexus-border">
              {machine?.reseau
                ? <Wifi size={17} className="text-emerald-400" />
                : <WifiOff size={17} className="text-amber-400" />}
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] font-medium text-nexus-text">Réseau</span>
              <span className="block text-[10.5px] text-nexus-muted">
                {machine?.reseau ? "connecté" : "hors ligne"}
              </span>
            </span>
          </div>
        </div>
        {machine?.processeur && (
          <p className="truncate text-[10.5px] text-nexus-muted">{machine.processeur}</p>
        )}
      </Carte>

      {/* ── NEXUS DANS WINDOWS ── */}
      <Carte
        titre="Nexus dans Windows"
        accent="#22c55e"
        icone={<Link2 size={13} strokeWidth={2.4} />}
        aside={
          <button
            onClick={() => faire("tout", () => pc.toutBrancher())}
            disabled={occupe !== null}
            className="nx-btn nx-btn-secondary shrink-0 !px-2 !py-[3px] !text-[10.5px]"
          >
            Tout brancher
          </button>
        }
      >
        <div className="mb-1 flex flex-wrap items-center gap-2 text-[11.5px] text-nexus-muted">
          <span>Nexus s'ouvre par-dessus tout avec</span>
          <Touche>Alt</Touche><span>+</span><Touche>Espace</Touche>
        </div>
        <div className="flex flex-col gap-1.5">
          <Bascule
            actif={!!integrations?.demarrage}
            occupe={occupe !== null}
            surClic={() => faire("dem", () => pc.reglerDemarrage(!integrations?.demarrage))}
            libelle="Démarrer avec Windows"
            detail="Nexus se met discrètement près de l'horloge. C'est ce qui rend Alt+Espace instantané : il est déjà là."
          />
          <Bascule
            actif={!!integrations?.menu_contextuel}
            occupe={occupe !== null}
            surClic={() => faire("menu", () => pc.reglerMenuContextuel(!integrations?.menu_contextuel))}
            libelle="« Analyser avec Nexus » au clic droit"
            detail="Sur n'importe quel fichier et n'importe quel dossier, dans l'Explorateur."
          />
          <Bascule
            actif={!!integrations?.protocole}
            occupe={occupe !== null}
            surClic={() => faire("proto", () => pc.reglerProtocole(!integrations?.protocole))}
            libelle="Les liens nexus:// ouvrent l'application"
            detail="Un lien dans un mail ou un document ouvre Nexus sur la bonne page."
          />
        </div>
        <p className="flex items-start gap-1.5 text-[10.5px] leading-relaxed text-nexus-muted">
          <Check size={11} className="mt-[2px] shrink-0 text-emerald-400" />
          Tout se règle dans TON espace de Windows : aucun mot de passe
          administrateur n'est jamais demandé, et « Tout retirer » remet tout
          comme avant.
        </p>
      </Carte>

      {/* ── LA CONCENTRATION ── */}
      <Carte
        titre="Mode concentration"
        accent="#f59e0b"
        icone={<Timer size={13} strokeWidth={2.4} />}
        aside={
          seance?.en_cours ? (
            <span className="shrink-0 font-mono text-[13px] font-semibold" style={{ color: accent }}>
              {mmss(seance.secondes_restantes)}
            </span>
          ) : undefined
        }
      >
        {seance?.en_cours ? (
          <>
            <p className="text-[11.5px] leading-relaxed text-nexus-muted">
              Séance en cours. Si l'une de ces applications revient, Nexus la
              referme — c'est bien pour ça qu'on est là.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {seance.applications.map((a) => (
                <span key={a} className="nx-chip !py-[2px] !text-[10.5px]">{a}</span>
              ))}
            </div>
            <button
              onClick={() => faire("stop", () => pc.arreterConcentration())}
              disabled={occupe !== null}
              className="nx-btn nx-btn-secondary w-full"
            >
              Arrêter la séance
            </button>
          </>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5">
              {DUREES.map((d) => (
                <button
                  key={d}
                  onClick={() => setDuree(d)}
                  className={`nx-chip !py-[3px] !text-[11px] ${duree === d ? "nx-chip-active" : ""}`}
                >
                  {d} min
                </button>
              ))}
            </div>
            {distractions.length > 0 ? (
              <>
                <p className="text-[11px] text-nexus-muted">
                  Ouvertes en ce moment — décoche ce que tu veux garder :
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {distractions.map((a) => {
                    const prise = choisies.includes(a);
                    return (
                      <button
                        key={a}
                        onClick={() =>
                          setChoisies((c) => (prise ? c.filter((x) => x !== a) : [...c, a]))
                        }
                        className={`nx-chip !py-[3px] !text-[11px] ${prise ? "nx-chip-active" : ""}`}
                      >
                        {prise && <Check size={10} className="mr-1 inline" />}
                        {a}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="text-[11px] leading-relaxed text-nexus-muted">
                Rien de distrayant n'est ouvert en ce moment. La séance coupera
                quand même les notifications de Windows.
              </p>
            )}
            <button
              onClick={() => faire("go", () => pc.demarrerConcentration(duree, choisies))}
              disabled={occupe !== null}
              className="nx-btn nx-btn-primary w-full"
            >
              Travailler {duree} minutes
            </button>
          </>
        )}
      </Carte>

      {/* ── LIRE L'ÉCRAN ── */}
      <Carte titre="Lire l'écran" accent="#38bdf8"
             icone={<ScanText size={13} strokeWidth={2.4} />}>
        <p className="text-[11.5px] leading-relaxed text-nexus-muted">
          Windows sait lire le texte d'une image, tout seul et hors ligne. Nexus
          s'en sert <span className="text-nexus-text">avant</span> de parler au
          modèle : un exercice photographié est donc lu exactement, accents
          compris, au lieu d'être deviné.
        </p>
        <button
          onClick={() =>
            faire("ecran", async () => {
              const c = await pc.capturerEcran();
              setLecture({ png: c.png, texte: c.texte });
            })
          }
          disabled={occupe !== null}
          className="nx-btn nx-btn-secondary w-full"
        >
          {occupe === "ecran" ? "Lecture…" : "Capturer et lire l'écran"}
        </button>
        {lecture && (
          <div className="nx-entre flex flex-col gap-2">
            <img
              src={`data:image/png;base64,${lecture.png}`}
              alt="Ce que Nexus a capturé"
              className="w-full rounded-xl border border-nexus-border"
            />
            {lecture.texte ? (
              <div className="max-h-[180px] overflow-y-auto whitespace-pre-wrap rounded-xl
                              border border-nexus-border bg-nexus-card p-2.5
                              text-[11.5px] leading-relaxed text-nexus-text">
                {lecture.texte}
              </div>
            ) : (
              <p className="text-[11px] text-nexus-muted">
                Aucun texte trouvé sur cette image.
              </p>
            )}
          </div>
        )}
      </Carte>

      {/* ── LES AUTOMATISATIONS ── */}
      <Carte
        titre="Automatisations"
        accent="#8b5cf6"
        icone={<Wand2 size={13} strokeWidth={2.4} />}
        aside={
          <button
            onClick={() => faire("dossier", () => pc.montrerScripts())}
            className="nx-btn nx-btn-icon shrink-0 !p-1.5"
            title="Ouvrir le dossier"
          >
            <FolderOpen size={12} />
          </button>
        }
      >
        {scripts.length === 0 ? (
          <p className="text-[11.5px] leading-relaxed text-nexus-muted">
            Tu n'en as encore aucune. Demande à la mascotte :
            <span className="text-nexus-text"> « fais une automatisation qui range
            mon bureau »</span>. Elle l'écrit, te la montre, et ne la lance que si
            tu le demandes.
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {scripts.map((s) => (
              <div key={s.chemin} className="nx-item flex items-center gap-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-medium text-nexus-text">
                    {s.nom}
                  </span>
                  <span className="block truncate text-[10.5px] text-nexus-muted">
                    {s.quoi || "Automatisation Nexus"}
                  </span>
                </span>
                <button
                  onClick={() => faire("run" + s.nom, () => pc.lancerScript(s.nom))}
                  disabled={occupe !== null}
                  className="nx-btn nx-btn-icon shrink-0 !p-1.5"
                  title="Lancer"
                >
                  <Play size={12} />
                </button>
                <button
                  onClick={() => faire("del" + s.nom, () => pc.supprimerScript(s.nom))}
                  disabled={occupe !== null}
                  className="nx-btn nx-btn-icon shrink-0 !p-1.5"
                  title="Supprimer"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Carte>

      <div className="flex gap-2 pb-1">
        <button
          onClick={() => faire("off", () => pc.toutDebrancher())}
          disabled={occupe !== null}
          className="nx-btn nx-btn-secondary flex-1"
        >
          <MousePointerClick size={12} /> Tout retirer de Windows
        </button>
        <button onClick={() => pc.quitter()} className="nx-btn nx-btn-danger shrink-0">
          <Power size={12} /> Quitter Nexus
        </button>
      </div>
    </div>
  );
}

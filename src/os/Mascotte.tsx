import React, { useEffect, useRef, useState } from "react";

/* ============================ MASCOTTE NEXUS ============================
   Petit robot bleu, tete arrondie avec un visage de terminal, petit corps,
   bras et pieds. Ses DEUX YEUX sont les raccourcis :
     - oeil gauche  : ajouter un fichier
     - oeil droit   : cle API
   Le corps ouvre l'assistant.
   Elle suit la souris du regard, cligne, et respire doucement.               */

/// L'HUMEUR de la mascotte.
///
/// Aharon : « il faut que l'utilisateur, même après beaucoup d'usage, soit
/// toujours épaté de découvrir un comportement qu'il ne connaissait pas. »
/// D'où deux sortes de réactions : celles que le reste de Nexus lui demande
/// (elle reçoit un fichier, elle réfléchit, elle a trouvé), et celles qu'elle
/// a toute seule — elle s'endort si on l'oublie, elle fait un clin d'œil de
/// temps en temps, elle bâille la nuit. Aucune n'est fréquente : une surprise
/// qu'on voit tous les jours n'est plus une surprise.
export type Humeur = "normal" | "surprise" | "pense" | "content";

/// Ce que l'utilisateur a déjà découvert. Gardé d'une visite à l'autre :
/// une trouvaille qu'on oublie n'en est pas une.
const CLE_TROUVAILLES = "nexus.mascotte.trouvailles";
/// Tout ce qu'elle sait faire quand on la provoque. Sert au petit compteur.
export const TOUTES_LES_TROUVAILLES = ["tourne", "tournis", "salue", "dort", "fichier"];

export default function Mascotte({
  onBody, onLeftEye, onRightEye, active, size = 58, humeur = "normal",
}: {
  onBody: () => void;
  onLeftEye: () => void;
  onRightEye: () => void;
  active?: boolean;
  size?: number;
  humeur?: Humeur;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const [look, setLook] = useState({ x: 0, y: 0 });
  const [blink, setBlink] = useState(false);
  const [hover, setHover] = useState<"none" | "left" | "right">("none");
  /// Ce qu'elle fait d'elle-même, en ce moment.
  const [manege, setManege] = useState<
    "rien" | "dort" | "clin" | "baille" | "curieuse"
    | "tourne" | "tournis" | "salue"
  >("rien");

  // Pourquoi ce n'est pas un simple onClick : la mascotte est deplaçable, et le
  // systeme de glisser-deposer CAPTURE le pointeur. Le relachement ne revient
  // donc jamais a l'element clique. On ecoute donc le relachement au niveau du
  // document, et on declenche si le pointeur a peu bouge (= un vrai appui).
  function press(action: () => void) {
    return {
      onPointerDown: (e: React.PointerEvent) => {
        const x0 = e.clientX, y0 = e.clientY;
        const up = (ev: PointerEvent) => {
          window.removeEventListener("pointerup", up, true);
          if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < 6) action();
        };
        window.addEventListener("pointerup", up, true);
      },
    };
  }

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy) || 1;
      const amp = Math.min(2.2, d / 100);
      setLook({ x: (dx / d) * amp, y: (dy / d) * amp });
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  // Le clignement, et de temps a autre autre chose. Un clin d'oeil arrive
  // environ une fois sur seize, un petit tour de curiosite une fois sur douze :
  // assez rare pour qu'on se demande si on a bien vu.
  useEffect(() => {
    let t: number;
    const boucle = () => {
      t = window.setTimeout(() => {
        const dé = Math.random();
        if (dé < 0.06) {
          setManege("clin");
          window.setTimeout(() => setManege("rien"), 420);
        } else if (dé < 0.14) {
          setManege("curieuse");
          window.setTimeout(() => setManege("rien"), 1500);
        } else {
          setBlink(true);
          window.setTimeout(() => setBlink(false), 120);
        }
        boucle();
      }, 2800 + Math.random() * 4000);
    };
    boucle();
    return () => window.clearTimeout(t);
  }, []);

  // ELLE S'ENDORT si on l'oublie. Deux minutes sans un geste, et ses yeux se
  // ferment ; le moindre mouvement la reveille. C'est le comportement qu'on
  // decouvre le plus tard, et celui qui fait toujours sourire.
  useEffect(() => {
    let t: number;
    const reveiller = () => {
      setManege((m) => (m === "dort" ? "rien" : m));
      window.clearTimeout(t);
      t = window.setTimeout(() => { setManege("dort"); noter("dort"); }, 120000);
    };
    reveiller();
    for (const n of ["mousemove", "keydown", "pointerdown", "wheel"]) {
      window.addEventListener(n, reveiller, { passive: true });
    }
    return () => {
      window.clearTimeout(t);
      for (const n of ["mousemove", "keydown", "pointerdown", "wheel"]) {
        window.removeEventListener(n, reveiller);
      }
    };
  }, []);

  // LA NUIT, elle baille. Entre 23 h et 5 h, une fois de temps en temps.
  useEffect(() => {
    const t = window.setInterval(() => {
      const h = new Date().getHours();
      if ((h >= 23 || h < 5) && Math.random() < 0.25) {
        setManege("baille");
        window.setTimeout(() => setManege("rien"), 1400);
      }
    }, 45000);
    return () => window.clearInterval(t);
  }, []);


  // ── CE QU'ELLE FAIT QUAND ON LA PROVOQUE ────────────────────────────────
  //
  // Aharon : « j'ai rien découvert avec la mascotte ». Il avait raison, et la
  // faute était de conception : toutes ses surprises étaient TIRÉES AU SORT.
  // Un clin d'œil de quatre dixièmes de seconde sur un robot de 58 pixels dans
  // un coin, pendant qu'on lit autre chose — on ne le voit jamais. Et comme
  // rien ne le provoque, on n'a aucune raison de recommencer.
  //
  // Les réactions ci-dessous sont CAUSALES : c'est lui qui les déclenche, donc
  // il les voit, et il peut les refaire pour les montrer.

  /// Ce qu'il a déjà trouvé, gardé d'une visite à l'autre.
  const [trouvailles, setTrouvailles] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(CLE_TROUVAILLES) || "[]"); }
    catch { return []; }
  });
  // On ÉCRIT DANS UN EFFET, pas dans la fonction de mise à jour.
  //
  // Ranger depuis l'intérieur d'un `setState` est un effet de bord au milieu
  // d'un rendu : React peut rejouer la fonction, ou ne pas la jouer du tout.
  // Vu en essayant : la mascotte faisait bien son tournis, et la trouvaille
  // n'était PAS retenue. Rien n'avertit.
  const noter = (quoi: string) => {
    setTrouvailles((v) => (v.includes(quoi) ? v : [...v, quoi]));
  };
  useEffect(() => {
    try { localStorage.setItem(CLE_TROUVAILLES, JSON.stringify(trouvailles)); }
    catch { /* rangement refusé */ }
  }, [trouvailles]);

  /// La dernière trouvaille, le temps de l'annoncer. Aharon : « j'ai rien
  /// découvert » — il faut donc qu'on lui DISE quand il vient de trouver, et
  /// qu'il reste quelque chose à chercher.
  const [annonce, setAnnonce] = useState<number | null>(null);
  const connues = useRef<string[] | null>(null);
  useEffect(() => {
    // Au premier rendu on ne fête rien : ce sont les trouvailles d'avant.
    if (connues.current === null) { connues.current = trouvailles; return; }
    if (trouvailles.length > connues.current.length) {
      connues.current = trouvailles;
      setAnnonce(trouvailles.length);
      const t = window.setTimeout(() => setAnnonce(null), 2600);
      return () => window.clearTimeout(t);
    }
    connues.current = trouvailles;
  }, [trouvailles]);

  /// Deux appuis rapprochés : elle fait un tour sur elle-même, de joie.
  const dernierAppui = useRef(0);
  useEffect(() => {
    const surAppui = () => {
      const t = Date.now();
      if (t - dernierAppui.current < 420) {
        setManege("tourne");
        noter("tourne");
        window.setTimeout(() => setManege("rien"), 900);
      }
      dernierAppui.current = t;
    };
    const el = ref.current?.ownerSVGElement || ref.current;
    el?.addEventListener("pointerdown", surAppui);
    return () => el?.removeEventListener("pointerdown", surAppui);
  }, []);

  /// On la SECOUE : elle a le tournis. On regarde les changements de sens du
  /// déplacement — quatre allers-retours en moins d'une seconde.
  useEffect(() => {
    let dernierX = 0, sens = 0, virages = 0, debut = 0;
    const bouge = (e: PointerEvent) => {
      if (!(e.buttons & 1)) { virages = 0; return; }
      const d = e.clientX - dernierX;
      dernierX = e.clientX;
      if (Math.abs(d) < 6) return;
      const s = Math.sign(d);
      if (sens && s !== sens) {
        if (!virages) debut = Date.now();
        virages++;
        if (virages >= 4 && Date.now() - debut < 1100) {
          virages = 0;
          setManege("tournis");
          noter("tournis");
          window.setTimeout(() => setManege("rien"), 1600);
        }
      }
      sens = s;
    };
    window.addEventListener("pointermove", bouge);
    return () => window.removeEventListener("pointermove", bouge);
  }, []);

  /// Elle salue quand on revient après être parti voir ailleurs.
  useEffect(() => {
    let partiA = 0;
    const change = () => {
      if (document.hidden) { partiA = Date.now(); return; }
      // Moins de vingt secondes, ce n'est pas une absence : c'est un aller-retour.
      if (partiA && Date.now() - partiA > 20000) {
        setManege("salue");
        noter("salue");
        window.setTimeout(() => setManege("rien"), 1500);
      }
      partiA = 0;
    };
    document.addEventListener("visibilitychange", change);
    return () => document.removeEventListener("visibilitychange", change);
  }, []);

  /// Un fichier qui arrive sur elle : ça compte aussi comme une découverte.
  useEffect(() => {
    if (humeur === "surprise") noter("fichier");
  }, [humeur]);

  const EY = 42;                       // hauteur des yeux

  // ── Ce que les yeux racontent ───────────────────────────────────────────
  // Un seul endroit décide de leur forme : sinon chaque comportement ajoute
  // sa condition dans le dessin, et plus personne ne sait ce qui l'emporte.
  const dort = manege === "dort";
  const baille = manege === "baille";
  const clin = manege === "clin";
  const fermes = blink || dort;                       // les deux yeux clos
  const gaucheFerme = fermes || clin;                 // le clin ne ferme que le gauche
  const droitFerme = fermes;
  // Surprise : les yeux s'ouvrent grand. Elle réfléchit : ils se plissent.
  const ampleur = humeur === "surprise" ? 1.55 : humeur === "pense" ? 0.6 : 1;
  const ry = fermes ? 1 : 7.5 * ampleur;
  // Endormie ou pensive, elle ne suit plus la souris : elle est ailleurs.
  const suit = !dort && humeur !== "pense";
  // Curieuse, elle regarde autour d'elle sans qu'on lui demande rien.
  const rx = suit ? look.x : manege === "curieuse" ? 2.2 : 0;
  const rly = suit ? look.y : manege === "curieuse" ? -1.4 : 0;
  const zzz = dort;

  return (
    <svg
      ref={ref}
      width={size} height={size} viewBox="0 0 100 100"
      className={`nx-mascotte cursor-pointer select-none overflow-visible${
        manege === "tourne" ? " nx-mascotte-tourne"
        : manege === "tournis" ? " nx-mascotte-tournis"
        : manege === "salue" ? " nx-mascotte-salue" : ""}`}
      aria-label="Nexus — assistant"
    >
      <defs>
        <linearGradient id="mHead" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="color-mix(in srgb, var(--accent) 45%, white)" />
          <stop offset="55%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="color-mix(in srgb, var(--accent) 68%, black)" />
        </linearGradient>
        <linearGradient id="mBodyG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="color-mix(in srgb, var(--accent) 30%, white)" />
          <stop offset="100%" stopColor="color-mix(in srgb, var(--accent) 55%, black)" />
        </linearGradient>
        <filter id="mGlow2" x="-70%" y="-70%" width="240%" height="240%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <ellipse cx="50" cy="56" rx="40" ry="38" fill="var(--accent)"
               opacity={active ? 0.28 : 0.15} filter="url(#mGlow2)" />

      <g className="nx-mascotte-body" {...press(onBody)}>
        {/* petites antennes */}
        <g stroke="color-mix(in srgb, var(--accent) 60%, white)" strokeWidth="2.6" strokeLinecap="round">
          <line x1="33" y1="17" x2="29" y2="8" />
          <line x1="67" y1="17" x2="71" y2="8" />
        </g>
        <circle cx="29" cy="7" r="3" fill="#fff" opacity={active ? 1 : .8} />
        <circle cx="71" cy="7" r="3" fill="#fff" opacity={active ? 1 : .8}>
          <animate attributeName="opacity" values=".5;1;.5" dur="2.4s" repeatCount="indefinite" />
        </circle>

        {/* bras */}
        <rect x="6" y="46" width="12" height="24" rx="6" fill="url(#mBodyG)" stroke="rgba(255,255,255,.28)" strokeWidth="1.2" />
        <rect x="82" y="46" width="12" height="24" rx="6" fill="url(#mBodyG)" stroke="rgba(255,255,255,.28)" strokeWidth="1.2" />

        {/* corps, avec un petit ecran ">_" */}
        <rect x="24" y="62" width="52" height="30" rx="12" fill="url(#mBodyG)" stroke="rgba(255,255,255,.32)" strokeWidth="1.4" />
        <rect x="34" y="70" width="32" height="14" rx="5" fill="#0b0f1a" opacity=".85" />
        <g stroke="color-mix(in srgb, var(--accent) 30%, white)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M40 74.5 L43.5 77 L40 79.5" />
          <line x1="47" y1="79.5" x2="54" y2="79.5" />
        </g>

        {/* pieds */}
        <rect x="30" y="90" width="14" height="7" rx="3.5" fill="color-mix(in srgb, var(--accent) 62%, black)" />
        <rect x="56" y="90" width="14" height="7" rx="3.5" fill="color-mix(in srgb, var(--accent) 62%, black)" />

        {/* tete arrondie */}
        <rect x="16" y="17" width="68" height="46" rx="20" fill="url(#mHead)" stroke="rgba(255,255,255,.42)" strokeWidth="1.6" />
        {/* visage : ecran sombre */}
        <rect x="23" y="25" width="54" height="30" rx="14" fill="#0b0f1a" opacity=".92" />
        {/* reflet */}
        <path d="M26 30 Q40 22 62 26" stroke="rgba(255,255,255,.22)" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>

      {/* ---- OEIL GAUCHE : ajouter un fichier ---- */}
      <g {...press(onLeftEye)}
         onMouseEnter={() => setHover("left")} onMouseLeave={() => setHover("none")}>
        <ellipse cx="38" cy={EY} rx="9" ry={ry + (hover === "left" ? 1.8 : 0)} fill="transparent" />
        {!gaucheFerme && (
          <g stroke="#8be9ff" strokeWidth="3" strokeLinecap="round"
             style={{ filter: hover === "left" ? "drop-shadow(0 0 5px #8be9ff)" : "drop-shadow(0 0 2px #8be9ff)" }}>
            <line x1={34 + rx} y1={EY + rly} x2={42 + rx} y2={EY + rly} />
            <line x1={38 + rx} y1={EY - 4 * ampleur + rly} x2={38 + rx} y2={EY + 4 * ampleur + rly} />
          </g>
        )}
        {gaucheFerme && <line x1="33" y1={EY} x2="43" y2={EY} stroke="#8be9ff" strokeWidth="3" strokeLinecap="round" />}
      </g>

      {/* ---- OEIL DROIT : clé API ---- */}
      <g {...press(onRightEye)}
         onMouseEnter={() => setHover("right")} onMouseLeave={() => setHover("none")}>
        <ellipse cx="62" cy={EY} rx="9" ry={ry + (hover === "right" ? 1.8 : 0)} fill="transparent" />
        {!droitFerme && (
          <g fill="#8be9ff" stroke="#8be9ff" strokeWidth="1.6" strokeLinecap="round"
             style={{ filter: hover === "right" ? "drop-shadow(0 0 5px #8be9ff)" : "drop-shadow(0 0 2px #8be9ff)" }}>
            <circle cx={59 + rx} cy={EY + rly} r={2.6 * ampleur} fill="none" />
            <line x1={61.5 + rx} y1={EY + rly} x2={67 + rx} y2={EY + rly} />
            <line x1={65 + rx} y1={EY + rly} x2={65 + rx} y2={EY + 3 + rly} />
          </g>
        )}
        {droitFerme && <line x1="57" y1={EY} x2="67" y2={EY} stroke="#8be9ff" strokeWidth="3" strokeLinecap="round" />}
      </g>

      {/* La bouche dit l'humeur : elle bâille (grand rond), elle sourit quand
          elle a trouvé ou quand l'assistant est ouvert, elle fait une petite
          moue quand elle réfléchit. */}
      {baille ? (
        <ellipse cx="50" cy="52" rx="5" ry="6.5" fill="none"
                 stroke="#8be9ff" strokeWidth="2.2" opacity=".85" />
      ) : (
        <path d={humeur === "content" || active ? "M44 51 Q50 56 56 51"
                 : humeur === "pense" ? "M45 52 Q50 50 55 52"
                 : humeur === "surprise" ? "M47 52 Q50 55 53 52"
                 : "M45 52 L55 52"}
              fill="none" stroke="#8be9ff" strokeWidth="2.2" strokeLinecap="round" opacity=".8" />
      )}

      {/* Elle dort : trois « z » qui montent. C'est le comportement qu'on
          découvre le plus tard — deux minutes sans rien faire — et celui qui
          fait toujours sourire. */}
      {/* LE TOURNIS : trois étoiles qui tournent au-dessus de la tête. On
          l'obtient en la secouant — un geste que tout le monde essaie une
          fois, et qui ne donnait rien jusqu'ici. */}
      {manege === "tournis" && (
        <g>
          <g style={{ transformOrigin: "50px 10px" }}>
            <animateTransform attributeName="transform" type="rotate"
                              from="0 50 10" to="360 50 10" dur="1.1s" repeatCount="indefinite" />
            {[0, 1, 2].map((i) => {
              const a = (i * 120) * Math.PI / 180;
              return (
                <text key={i} x={50 + Math.cos(a) * 14} y={12 + Math.sin(a) * 7}
                      fontSize="10" fill="#ffe082" textAnchor="middle">★</text>
              );
            })}
          </g>
        </g>
      )}

      {/* ELLE SALUE quand on revient après être parti un moment. */}
      {manege === "salue" && (
        <g stroke="color-mix(in srgb, var(--accent) 30%, white)" strokeWidth="4.2"
           strokeLinecap="round" style={{ transformOrigin: "20px 62px" }}>
          <line x1="20" y1="62" x2="12" y2="46" />
          <animateTransform attributeName="transform" type="rotate"
                            values="-16 20 62; 16 20 62; -16 20 62" dur=".42s"
                            repeatCount="3" />
        </g>
      )}

      {/* « ★ 2 sur 5 » : la seule façon de savoir qu'il y a autre chose à
          trouver. Sans ça, une surprise trouvée reste un accident. */}
      {annonce !== null && (
        <g style={{ pointerEvents: "none" }}>
          <rect x="8" y="-16" width="84" height="19" rx="9.5"
                fill="rgba(12,12,20,.92)" stroke="rgba(255,255,255,.18)" strokeWidth="1">
            <animate attributeName="opacity" values="0;1;1;0" dur="2.6s" fill="freeze" />
          </rect>
          <text x="50" y="-2.6" textAnchor="middle" fontSize="10" fontWeight="600"
                fill="#ffe082"
                style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
            ★ trouvé · {annonce} sur {TOUTES_LES_TROUVAILLES.length}
            <animate attributeName="opacity" values="0;1;1;0" dur="2.6s" fill="freeze" />
          </text>
        </g>
      )}

      {zzz && (
        <g fill="#8be9ff" fontSize="11" fontWeight="700" opacity=".75"
           style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
          {[0, 1, 2].map((i) => (
            <text key={i} x={72 + i * 6} y={22 - i * 7} fontSize={11 - i * 2}>
              z
              <animate attributeName="opacity" values="0;1;0" dur="2.4s"
                       begin={`${i * 0.4}s`} repeatCount="indefinite" />
            </text>
          ))}
        </g>
      )}
    </svg>
  );
}

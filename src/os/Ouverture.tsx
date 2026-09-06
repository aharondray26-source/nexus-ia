import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ============================ L'OUVERTURE ============================
   Aharon : « avant de voir quoi que ce soit, il y a une belle animation avec
   notre logo. Ensuite la barre latérale apparaît d'une partie du logo animé,
   qui se propage comme une bulle vers le côté pour exploser en barre latérale.
   Pareil pour la dynamique et le reste de l'écran. Je compte sur toi. »

   L'IDÉE, et elle n'est pas décorative : le logo de Nexus est un cœur relié à
   TROIS satellites. Ces trois satellites SONT l'interface. Ils se détachent et
   vont chacun prendre leur place — l'un file à gauche et devient la barre
   latérale, l'un monte et devient la barre du haut, l'un descend à droite et
   devient la mascotte. Le logo ne s'efface pas : il se déplie.

   Ce n'est pas un chargement : on ne fait attendre personne pour rien. Un clic,
   une touche, et l'on passe. Et si quelqu'un a demandé moins d'animations dans
   les réglages de son système, il ne voit rien du tout.                     */

const DUREE = 2600;                    // ce que dure l'ouverture, en entier

/// Là où chaque satellite arrive, en fraction de l'écran. C'est ce qui fait
/// que la bulle « explose » EXACTEMENT à l'endroit de l'élément réel.
/// Une destination MESURÉE : centre, taille, arrondi, et la couleur de fond de
/// l'élément réel — c'est elle qui permet à la bulle de devenir l'élément au
/// lieu de s'effacer devant lui.
type Cible = { x: number; y: number; w: number; h: number; r: number; fond: string };

export default function Ouverture({ surFin }: { surFin: () => void }) {
  // POUR TRAVAILLER L'OUVERTURE : « ?ouverture=0 », « =1 » ou « =2 » fige une
  // étape et coupe l'enchaînement. Sans ça, on ne peut pas la regarder — elle
  // dure deux secondes et demie, et un volet qui ne peint pas ne joue AUCUNE
  // animation : on croit voir un écran noir ou une forme de travers.
  const figee = (() => {
    try {
      const v = new URLSearchParams(location.search).get("ouverture");
      return v === null ? null : Math.max(0, Math.min(2, Number(v) || 0));
    } catch { return null; }
  })();
  const [phase, setPhase] = useState(figee ?? 0);   // 0 naissance · 1 nom · 2 éclatement · 3 fini
  const fini = useRef(false);

  // Réduire les animations, c'est un réglage d'accessibilité du système. On ne
  // le contourne pas : on n'affiche rien.
  const sobre = typeof window !== "undefined"
    && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (figee !== null) return;              // on regarde une étape : on n'avance pas
    if (sobre) { surFin(); return; }
    const terminer = () => {
      if (fini.current) return;
      fini.current = true;
      surFin();
    };
    const t1 = window.setTimeout(() => setPhase(1), 780);
    // On mesure JUSTE AVANT l'éclatement : l'interface est déjà en place
    // derrière le voile, donc les vraies positions sont connues.
    const t2 = window.setTimeout(() => { cibles.current = mesurer(); setPhase(2); }, 1420);
    const t3 = window.setTimeout(() => { setPhase(3); terminer(); }, DUREE);

    // On passe au premier geste : personne ne doit subir une animation.
    const passer = () => { setPhase(3); terminer(); };
    window.addEventListener("pointerdown", passer);
    window.addEventListener("keydown", passer);
    return () => {
      window.clearTimeout(t1); window.clearTimeout(t2); window.clearTimeout(t3);
      window.removeEventListener("pointerdown", passer);
      window.removeEventListener("keydown", passer);
    };
  }, [sobre, surFin, figee]);

  if (sobre) return null;

  // Les trois destinations, dans l'ordre des satellites du logo.
  // ── OÙ CHAQUE BULLE DOIT ARRIVER ────────────────────────────────────────
  //
  // On ne devine PLUS les coordonnées. On MESURE les vrais éléments — la barre
  // latérale, la pastille du haut, la mascotte — et la bulle prend exactement
  // leur place, leur forme et leur couleur.
  //
  // C'est ce qui change tout. Avant, la bulle arrivait « à peu près » et
  // s'effaçait en opacité : on voyait une tache disparaître, puis on
  // remarquait qu'il y avait une barre latérale au même endroit. Aharon :
  // « c'est pas beau, je veux qu'on ait l'impression que ces bulles se
  // transforment elles-mêmes en la barre latérale ».
  // Mesurée, la bulle ne s'efface pas : elle EST la barre latérale, et l'on
  // retire simplement le calque quand les deux sont superposés au pixel.
  const cibles = useRef<Cible[]>([]);
  function mesurer(): Cible[] {
    const par = (sel: string, secours: Cible): Cible => {
      const e = document.querySelector(sel) as HTMLElement | null;
      if (!e) return secours;
      const r = e.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) return secours;
      const st = getComputedStyle(e);
      return {
        x: r.left + r.width / 2, y: r.top + r.height / 2,
        w: r.width, h: r.height,
        r: parseFloat(st.borderRadius) || 18,
        fond: st.backgroundColor && st.backgroundColor !== "rgba(0, 0, 0, 0)"
          ? st.backgroundColor : "rgba(12,12,15,.62)",
      };
    };
    const W = window.innerWidth, H = window.innerHeight;
    return [
      // La pastille du haut (le nom de l'espace ouvert).
      par("[data-nx-ile]", { x: W / 2, y: 26, w: 300, h: 32, r: 16, fond: "rgba(12,12,15,.7)" }),
      // La barre latérale.
      par(".nx-dock", { x: 42, y: H / 2, w: 64, h: H * 0.86, r: 22, fond: "rgba(12,12,15,.62)" }),
      // La mascotte.
      par("[data-nx-mascotte]", { x: W - 41, y: H - 125, w: 58, h: 58, r: 29,
                                  fond: "rgba(99,102,241,.18)" }),
    ];
  }

  // La position de départ de chaque satellite, sur le logo (viewBox 24×24,
  // dessiné à 132 px, centré). On calcule en pixels depuis le centre.
  // La taille du logo à l'écran. À 132 px les trois satellites se noyaient
  // dans un seul halo et l'on ne lisait plus la forme : c'est le logo qui doit
  // se voir, pas la lumière.
  const T = 196;
  // Les satellites du logo sont à 7 unités du cœur sur 24 : à l'écran, ils
  // touchaient presque le cœur et l'ensemble se lisait comme un anneau, pas
  // comme un réseau. On les écarte — c'est le MÊME logo, respiré.
  const POS: [number, number][] = [[12, 2.6], [3.4, 19.4], [20.6, 19.4]];
  const depart = POS.map(([x, y]) => ({ dx: (x - 12) / 24 * T, dy: (y - 12) / 24 * T }));
  // Le centre de l'écran : c'est là qu'est le logo, donc le point de départ
  // des trois bulles. On le prend en pixels, pas en pourcentage : la bulle
  // voyage ensuite vers des coordonnées mesurées, elles aussi en pixels.
  const cx = typeof window !== "undefined" ? window.innerWidth / 2 : 0;
  const cy = typeof window !== "undefined" ? window.innerHeight / 2 : 0;

  return (
    <AnimatePresence>
      {phase < 3 && (
        <motion.div
          className="fixed inset-0 z-[2000000] flex items-center justify-center bg-[#09090b]"
          initial={{ opacity: 1 }}
          // Le voile s'en va DERRIÈRE l'onde : il attend qu'elle soit partie,
          // puis disparaît vite. On voit donc l'onde découvrir le bureau.
          animate={phase >= 2
            ? { opacity: 0, transition: { duration: 0.5, delay: 0.62,
                                          ease: [0.4, 0, 0.2, 1] } }
            : { opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] } }}
        >
          {/* LE CŒUR DEVIENT LE BUREAU.
              Aharon : « le bureau, qui est censé être le cœur des satellites,
              c'est pas assez visible ». Il avait raison : le cœur se contentait
              de grossir et de s'effacer, on ne voyait rien passer.
              Maintenant une ONDE part du centre au moment de l'éclatement et
              balaie l'écran. Le voile s'en va derrière elle : c'est l'onde qui
              découvre le bureau, pas un fondu. */}
          {phase >= 2 && (
            <motion.div
              className="pointer-events-none absolute rounded-full"
              style={{
                left: "50%", top: "50%", translate: "-50% -50%",
                border: "2px solid color-mix(in srgb, var(--accent) 70%, transparent)",
                boxShadow: "0 0 60px color-mix(in srgb, var(--accent) 45%, transparent),"
                         + " inset 0 0 60px color-mix(in srgb, var(--accent) 30%, transparent)",
              }}
              initial={{ width: 40, height: 40, opacity: 0.95 }}
              animate={{
                width: Math.hypot(window.innerWidth, window.innerHeight) * 2.1,
                height: Math.hypot(window.innerWidth, window.innerHeight) * 2.1,
                opacity: [0.95, 0.6, 0],
                transition: { duration: 1.0, ease: [0.22, 0.61, 0.36, 1] },
              }}
            />
          )}

          {/* La respiration derrière le logo : c'est elle qui donne la
              sensation que quelque chose s'éveille, avant même le dessin. */}
          <motion.div
            className="pointer-events-none absolute"
            style={{
              width: 620, height: 620, borderRadius: "50%",
              background: "radial-gradient(circle, color-mix(in srgb, var(--accent) 34%, transparent) 0%, transparent 62%)",
              filter: "blur(26px)",
            }}
            initial={{ opacity: 0.4, scale: 1 }}
            animate={phase >= 2
              ? { opacity: 0, scale: 2.4, transition: { duration: 0.9, ease: [0.32, 0.72, 0, 1] } }
              : { opacity: [0.28, 0.5, 0.38], scale: [0.94, 1.05, 1],
                  transition: { duration: 1.4, ease: [0.4, 0, 0.2, 1] } }}
          />

          {/* LE LOGO. Dessiné, pas une image : chaque morceau doit pouvoir
              partir de son côté. */}
          <div className="relative" style={{ width: T, height: T }}>
            <svg viewBox="0 0 24 24" width={T} height={T} className="absolute inset-0 overflow-visible">
              {/* Les trois liens se TRACENT, du cœur vers chaque satellite. */}
              {POS.map(([x, y], i) => (
                <motion.line
                  key={i}
                  x1={12} y1={12} x2={x} y2={y}
                  stroke="#ffffff" strokeWidth={0.7} strokeLinecap="round"
                  // RÈGLE DE SÛRETÉ : l'état de repos est VISIBLE.
                  //
                  // Ma première version partait d'une opacité nulle et comptait
                  // sur l'animation pour la lever. Or une animation ne tourne
                  // pas toujours : onglet en arrière-plan, batterie faible,
                  // « réduire les animations ». Résultat vu à l'écran : un
                  // ÉCRAN NOIR pendant deux secondes et demie. Maintenant, si
                  // rien ne s'anime, on voit le logo — simplement immobile.
                  initial={{ pathLength: 1, opacity: 0.55 }}
                  animate={phase >= 2
                    ? { opacity: 0, transition: { duration: 0.28 } }
                    : { pathLength: 1, opacity: 0.38 }}
                />
              ))}
              {/* Le cœur : il reste jusqu'au bout, puis se dilate et s'efface —
                  c'est lui qui « devient » le bureau. */}
              <motion.circle
                cx={12} cy={12} r={2.6}
                fill="#09090b" stroke="var(--accent)" strokeWidth={1.5}
                initial={{ scale: 1, opacity: 1 }}
                animate={phase >= 2
                  ? { scale: [1, 0.7, 9], opacity: [1, 1, 0],
                      transition: { duration: 0.8, times: [0, 0.2, 1],
                                    ease: [0.32, 0.72, 0, 1] } }
                  : { scale: 1, opacity: 1 }}
                style={{ transformOrigin: "12px 12px" }}
              />
            </svg>

          </div>

          {/* LES TROIS SATELLITES, SUR UN CALQUE QUI COUVRE L'ÉCRAN.
              Ils étaient DANS le logo, un carré de 196 px : « left: 32px »
              voulait alors dire « 32 px depuis le bord du logo », pas depuis le
              bord de l'écran. Ils ne pouvaient donc PAS atteindre la barre
              latérale — l'éclatement n'allait nulle part. Ici, leurs
              coordonnées sont celles de l'écran, et le centre de l'écran est
              exactement là où se trouve le logo. */}
          <div className="pointer-events-none fixed inset-0">
            {[0, 1, 2].map((i) => {
              const c = cibles.current[i];
              return (
              <motion.div
                key={i}
                className="absolute"
                style={{
                  left: 0, top: 0,
                  // On centre par `translate`, séparé de `transform` : x/y
                  // restent libres pour l'animation.
                  translate: "-50% -50%",
                  background: "var(--accent)",
                  boxShadow: "0 0 14px color-mix(in srgb, var(--accent) 55%, transparent)",
                }}
                initial={{
                  x: cx + depart[i].dx, y: cy + depart[i].dy,
                  width: 21, height: 21, borderRadius: 11, opacity: 1,
                }}
                animate={phase >= 2 && c
                  ? {
                      // TROIS TEMPS, et aucun n'est un fondu.
                      //
                      // 1) elle FONCE sur le côté, en restant une bulle, et
                      //    elle grossit un peu — le poids se sent ;
                      // 2) elle se DÉROULE dans la forme de l'élément, avec un
                      //    léger dépassement : c'est ce qui fait « exploser » ;
                      // 3) sa couleur devient celle de l'élément réel, posé
                      //    dessous au pixel près. On retire alors le calque :
                      //    rien ne disparaît, la bulle EST devenue la barre.
                      x: [cx + depart[i].dx, c.x, c.x],
                      y: [cy + depart[i].dy, c.y, c.y],
                      width: [21, 44, c.w],
                      height: [21, 44, c.h],
                      borderRadius: [11, 22, c.r],
                      background: ["var(--accent)", "var(--accent)", c.fond],
                      boxShadow: [
                        "0 0 14px color-mix(in srgb, var(--accent) 55%, transparent)",
                        "0 0 34px color-mix(in srgb, var(--accent) 85%, transparent)",
                        "0 0 0px color-mix(in srgb, var(--accent) 0%, transparent)",
                      ],
                      transition: {
                        duration: 1.15,
                        delay: i * 0.09,
                        // Le trajet part vite et se pose : c'est la courbe
                        // d'appui de Nexus. Le déroulé, lui, dépasse un peu.
                        times: [0, 0.46, 1],
                        ease: [[0.32, 0.72, 0, 1], [0.34, 1.32, 0.5, 1]],
                      },
                    }
                  : { x: cx + depart[i].dx, y: cy + depart[i].dy, opacity: 1 }}
              />
              );
            })}
          </div>

          {/* LE NOM, une fois le logo formé. */}
          <motion.div
            className="pointer-events-none absolute select-none"
            // Piloté par l'ÉTAT : même sans animation, le nom apparaît.
            style={{ marginTop: 250, opacity: phase === 1 ? 1 : 0 }}
            initial={false}
            animate={phase === 1
              ? { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.4, 0, 0.2, 1] } }
              : phase >= 2
                ? { opacity: 0, y: -8, transition: { duration: 0.3 } }
                : { opacity: 0, y: 10 }}
          >
            <div className="flex items-baseline gap-[3px] text-[26px] font-semibold tracking-[-0.02em] text-white">
              {"Nexus".split("").map((l, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 1, y: 0 }}
                  animate={phase >= 1 ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.34, delay: i * 0.045, ease: [0.34, 1.4, 0.5, 1] }}
                >
                  {l}
                </motion.span>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

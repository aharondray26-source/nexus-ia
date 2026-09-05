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
type Cible = { x: string; y: string; w: number; h: number | string; r: number };

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
    const t2 = window.setTimeout(() => setPhase(2), 1420);
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
  // Les trois destinations, en coordonnées de l'ÉCRAN — mesurées sur les vrais
  // éléments : la pastille du haut, la barre latérale (64 px de large), et la
  // mascotte (58 px, à 12 px du bord droit et 96 px du bas).
  const cibles: Cible[] = [
    { x: "50%", y: "26px", w: 300, h: 32, r: 16 },                       // barre du haut
    { x: "32px", y: "50%", w: 60, h: "68%", r: 26 },                      // barre latérale
    { x: "calc(100% - 41px)", y: "calc(100% - 125px)", w: 58, h: 58, r: 29 }, // mascotte
  ];

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

  return (
    <AnimatePresence>
      {phase < 3 && (
        <motion.div
          className="fixed inset-0 z-[2000000] flex items-center justify-center bg-[#09090b]"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.42, ease: [0.4, 0, 0.2, 1] } }}
        >
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
                  ? { scale: 14, opacity: 0,
                      transition: { duration: 0.85, ease: [0.32, 0.72, 0, 1] } }
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
            {cibles.map((c, i) => (
              <motion.div
                key={i}
                className="absolute"
                style={{
                  left: "50%", top: "50%",
                  // On centre l'élément sur son point d'ancrage avec la
                  // propriété `translate`, qui est SÉPARÉE de `transform` :
                  // l'animation peut alors se servir de x/y librement, sans
                  // avoir à connaître la taille de la cible. Ça compte : la
                  // barre latérale fait « 68% » de haut, et « -c.h / 2 » sur
                  // une chaîne ne veut rien dire.
                  translate: "-50% -50%",
                  background: "var(--accent)",
                  // Un halo SERRÉ. À 24 px de diffusion, les trois satellites
                  // se rejoignaient en une seule tache.
                  boxShadow: "0 0 14px color-mix(in srgb, var(--accent) 55%, transparent)",
                }}
                initial={{
                  x: depart[i].dx, y: depart[i].dy,
                  width: 21, height: 21, borderRadius: 11, opacity: 1, scale: 1,
                }}
                animate={phase >= 2
                  ? {
                      // On vise le CENTRE de la cible, puis on prend sa forme :
                      // la bulle ne saute pas, elle se déplie à l'arrivée.
                      left: c.x, top: c.y, x: 0, y: 0,
                      width: c.w, height: c.h, borderRadius: c.r,
                      opacity: [1, 1, 0],
                      scale: 1,
                      transition: {
                        duration: 1.05,
                        delay: i * 0.07,
                        ease: [0.32, 0.72, 0, 1],
                        opacity: { times: [0, 0.72, 1], duration: 1.05 },
                      },
                    }
                  : { x: depart[i].dx, y: depart[i].dy, opacity: 1, scale: 1 }}
              />
            ))}
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

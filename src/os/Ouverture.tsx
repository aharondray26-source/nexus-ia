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
   latérale, l'un monte et devient la dynamique, l'un descend à droite et
   devient la mascotte. Le logo ne s'efface pas : il se déplie.

   CE QU'ARAHON A REPROCHÉ, ET CE QUI A ÉTÉ CORRIGÉ :
   « ta bulle fonctionne par des jeux d'opacité, au dernier moment quand les
     bulles s'agrandissent il faut pas qu'elles disparaissent sous une baisse
     rapide et soudaine d'opacité, mais qu'elles deviennent très opaques, pas
     statiques, un aspect moelleux, bulleux, instable dans la position, et que
     par des jeux de couleur elles se transforment en la barre latérale, la
     dynamique et la mascotte. »

   Il avait raison, et pour DEUX raisons que je n'avais pas vues :

   1. Les bulles étaient DANS le voile noir. Le voile s'en allait en opacité —
      donc les bulles aussi, quoi que je leur demande. Elles vivent maintenant
      sur leur PROPRE calque, au-dessus du voile : rien ne peut plus les
      effacer. Elles ne partent que lorsqu'elles sont devenues l'élément.
   2. Le jeu de couleur ne se jouait pas : « var(--accent) » et « color-mix() »
      ne s'interpolent PAS. Les images-clés sautaient d'un coup au lieu de
      fondre. On résout donc l'accent en vraies valeurs r,v,b AVANT d'animer.

   Et la fin n'est plus un fondu : la bulle prend la couleur de l'élément, puis
   son INTÉRIEUR se libère pendant que son contour reste — elle devient le
   cadre de l'élément réel, posé dessous au pixel près. On retire le calque
   quand les deux sont confondus : il n'y a littéralement rien à voir partir.

   Ce n'est pas un chargement : on ne fait attendre personne pour rien. Un clic,
   une touche, et l'on passe. Et si quelqu'un a demandé moins d'animations dans
   les réglages de son système, il ne voit rien du tout.                     */

const VOYAGE_BASE = 1.35;                   // ce que dure le voyage d'une bulle
const ECLAT_BASE = 1420;                   // quand les bulles se détachent
// (les durées réelles sont calculées dans le composant : « ?lent= » les étire)

/// Une destination MESURÉE : centre, taille, arrondi, et la couleur de fond
/// ET DE BORDURE de l'élément réel — c'est cela qui permet à la bulle de
/// DEVENIR l'élément au lieu de s'effacer devant lui.
type Cible = {
  x: number; y: number; w: number; h: number; r: number;
  fond: string;      // le fond réel de l'élément
  bord: string;      // la couleur de sa bordure
  // Certaines destinations ne sont pas des panneaux. La mascotte, par exemple,
  // est un DESSIN : pas de fond, pas de bordure, pas d'arrondi à copier — on
  // mesurerait « carré, transparent », et la bulle finirait en carré.
  rond?: boolean;    // c'est une pastille : l'arrondi, c'est la moitié du côté
  revele?: boolean;  // la bulle ne devient pas un cadre : elle se retire en
                     // couleur pour laisser voir le dessin qui est dessous
};

/// Ramène N'IMPORTE QUELLE couleur CSS à « rgba(r, g, b, a) ».
///
/// Ce n'est pas du zèle. En mesurant les vrais éléments, on récupère ce que le
/// navigateur calcule vraiment — et aujourd'hui c'est « oklab(0.129 …) » ou
/// « color(srgb 0.047 …) ». Ces écritures modernes sont parfaitement valides
/// en CSS, mais framer-motion ne sait pas les INTERPOLER : il abandonne
/// l'image-clé, et avec elle toute l'animation. Résultat vu à l'écran : trois
/// bulles parfaitement immobiles pendant que le reste se déroule.
///
/// On passe donc par une toile d'un pixel : on demande au navigateur de PEINDRE
/// la couleur, puis on relit le pixel. Ce qui en sort est toujours du rouge,
/// du vert, du bleu et de l'opacité — quelle que soit l'écriture d'entrée.
function versRgba(c: string, secours = "rgba(12, 12, 15, 0.62)"): string {
  const s = (c || "").trim();
  if (!s || s === "transparent") return "rgba(0, 0, 0, 0)";
  try {
    const t = document.createElement("canvas");
    t.width = 1; t.height = 1;
    const ctx = t.getContext("2d", { willReadFrequently: true });
    if (!ctx) return secours;
    // Un témoin : si la couleur est refusée, « fillStyle » ne bouge pas, et
    // l'on saurait qu'on est en train de peindre n'importe quoi.
    ctx.fillStyle = "#ff00ff";
    ctx.fillStyle = s;
    if (String(ctx.fillStyle).toLowerCase() === "#ff00ff" && !/f0f|ff00ff|magenta/i.test(s)) {
      return secours;
    }
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    if (d[3] === 0) return "rgba(0, 0, 0, 0)";
    return `rgba(${d[0]}, ${d[1]}, ${d[2]}, ${Math.round((d[3] / 255) * 1000) / 1000})`;
  } catch { return secours; }
}

/// Ramène n'importe quelle écriture de couleur à trois nombres. Sans cela,
/// aucune interpolation : framer-motion ne sait pas lire « var(--accent) »
/// ni « color-mix(...) », il saute à la valeur finale — et l'on croit voir
/// une bulle qui « disparaît » alors qu'elle a simplement changé d'un coup.
function versRVB(brut: string): [number, number, number] {
  // Un accent de thème peut lui aussi s'écrire « oklch(...) » : on le fait
  // peindre avant de le lire.
  const s = /^(#|rgb)/i.test((brut || "").trim())
    ? (brut || "").trim()
    : versRgba(brut, "rgb(99, 102, 241)");
  if (s.startsWith("#")) {
    const h = s.slice(1);
    const n = h.length === 3 ? h.split("").map((x) => x + x).join("") : h;
    return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16),
            parseInt(n.slice(4, 6), 16)];
  }
  const m = s.match(/-?\d+(\.\d+)?/g);
  if (m && m.length >= 3) return [+m[0], +m[1], +m[2]];
  return [99, 102, 241];               // l'indigo de Nexus, en dernier recours
}

/// Mélange deux couleurs en gardant une opacité CHOISIE.
///
/// Aharon : « qu'elles deviennent plutôt TRÈS OPAQUES … et que par des JEUX DE
/// COULEUR elles se transforment en la barre latérale ». Passer directement de
/// l'accent plein au verre sombre de la barre, c'est baisser l'opacité en même
/// temps que la teinte — l'œil ne lit alors qu'un fondu. En posant une teinte
/// intermédiaire DENSE, on voit la couleur voyager, pas la bulle s'effacer.
function melanger(a: string, b: string, t: number, opacite: number): string {
  const ra = versRVB(a), rb = versRVB(b);
  const m = (i: number) => Math.round(ra[i] + (rb[i] - ra[i]) * t);
  return `rgba(${m(0)}, ${m(1)}, ${m(2)}, ${opacite})`;
}

export default function Ouverture({ surFin }: { surFin: () => void }) {
  // POUR TRAVAILLER L'OUVERTURE : « ?ouverture=0 », « =1 » ou « =2 » fige une
  // étape et coupe l'enchaînement. Sans ça, on ne peut pas la regarder — elle
  // dure trois secondes, et un volet qui ne peint pas ne joue AUCUNE
  // animation : on croit voir un écran noir ou une forme de travers.
  const figee = (() => {
    try {
      const v = new URLSearchParams(location.search).get("ouverture");
      return v === null ? null : Math.max(0, Math.min(2, Number(v) || 0));
    } catch { return null; }
  })();
  const [phase, setPhase] = useState(figee ?? 0);   // 0 naissance · 1 nom · 2 éclatement · 3 fini
  const fini = useRef(false);
  // « ?lent=4 » joue l'ouverture quatre fois moins vite. C'est le seul moyen
  // honnête de juger un mouvement : à pleine vitesse, on ne voit qu'une
  // impression, et l'on corrige au hasard.
  const lent = (() => {
    try {
      const v = Number(new URLSearchParams(location.search).get("lent"));
      return v >= 1 && v <= 20 ? v : 1;
    } catch { return 1; }
  })();
  // Quand on fige une étape, il faut redessiner APRÈS la mesure : sinon les
  // bulles se dessinent sans destination et ne bougent jamais.
  const [, remesure] = useState(0);
  // « ?bulles=fin » pose les bulles directement sur leur DERNIÈRE image, sans
  // rien animer. C'est le banc d'essai : on peut alors comparer, au pixel, la
  // bulle et l'élément qu'elle est censée être devenue. Sans ça, il faut
  // regarder passer trois secondes et juger à l'œil — ce qui ne prouve rien.
  const surPlace = (() => {
    try { return new URLSearchParams(location.search).get("bulles") === "fin"; }
    catch { return false; }
  })();

  // Réduire les animations, c'est un réglage d'accessibilité du système. On ne
  // le contourne pas : on n'affiche rien.
  const sobre = typeof window !== "undefined"
    && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const VOYAGE = VOYAGE_BASE * lent;
  const ECLAT = ECLAT_BASE * lent;
  const DUREE = ECLAT + VOYAGE * 1000 + 240 * lent;

  const cibles = useRef<Cible[]>([]);
  // L'accent du thème, résolu en nombres une fois pour toutes.
  const teinte = useRef<[number, number, number]>([99, 102, 241]);

  useEffect(() => {
    if (surPlace) {
      // Banc d'essai : la dernière image, tout de suite. On attend quand même
      // que l'interface soit montée — la mascotte arrive après le premier
      // rendu, et la mesurer trop tôt donnerait un écart qui n'existe pas.
      const t = window.setTimeout(() => {
        cibles.current = mesurer(); setPhase(2); remesure((n) => n + 1);
      }, ECLAT_BASE + 120);   // le même instant que la vraie ouverture
      return () => window.clearTimeout(t);
    }
    if (figee !== null) {                    // on regarde une étape : on n'avance pas
      if (figee >= 2) { cibles.current = mesurer(); remesure((n) => n + 1); }
      return;
    }
    if (sobre) { surFin(); return; }
    const terminer = () => {
      if (fini.current) return;
      fini.current = true;
      surFin();
    };
    const t1 = window.setTimeout(() => setPhase(1), 780 * lent);
    // On mesure JUSTE AVANT l'éclatement : l'interface est déjà en place
    // derrière le voile, donc les vraies positions sont connues.
    const t2 = window.setTimeout(() => { cibles.current = mesurer(); setPhase(2); }, ECLAT);
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
  }, [sobre, surFin, figee, lent, ECLAT, DUREE, surPlace]);

  if (sobre) return null;

  // ── OÙ CHAQUE BULLE DOIT ARRIVER ────────────────────────────────────────
  //
  // On ne devine PLUS les coordonnées. On MESURE les vrais éléments — la
  // dynamique, la barre latérale, la mascotte — et la bulle prend exactement
  // leur place, leur forme, leur couleur et leur bordure.
  function mesurer(): Cible[] {
    try {
      const racine = getComputedStyle(document.documentElement);
      teinte.current = versRVB(racine.getPropertyValue("--accent") || "#6366f1");
    } catch { /* le thème n'est pas encore posé : on garde l'indigo */ }

    const par = (sel: string, secours: Cible): Cible => {
      const e = document.querySelector(sel) as HTMLElement | null;
      if (!e) return secours;
      const r = e.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) return secours;
      const st = getComputedStyle(e);
      const fond = versRgba(st.backgroundColor, secours.fond);
      const bord = versRgba(st.borderTopColor, secours.bord);
      const epais = parseFloat(st.borderTopWidth) || 0;
      // Le rayon : « border-radius: 9999px » se lit 9999, et une pastille
      // ronde de 32 px de haut se lisait donc 33 554 400 — la bulle partait
      // vers un arrondi absurde et l'on ne voyait plus de forme du tout.
      // Un arrondi ne peut pas dépasser la moitié du plus petit côté.
      const moitie = Math.min(r.width, r.height) / 2;
      const brut = parseFloat(st.borderTopLeftRadius) || parseFloat(st.borderRadius) || 0;
      const arrondi = secours.rond ? moitie : Math.min(brut > 0 ? brut : 18, moitie);
      return {
        ...secours,
        x: r.left + r.width / 2, y: r.top + r.height / 2,
        w: r.width, h: r.height,
        r: arrondi,
        fond: fond !== "rgba(0, 0, 0, 0)" ? fond : secours.fond,
        // Une bordure de zéro pixel ne se voit pas : on garde le secours,
        // sinon la bulle finirait par n'être plus rien du tout.
        bord: epais > 0 && bord !== "rgba(0, 0, 0, 0)" ? bord : secours.bord,
      };
    };
    const W = window.innerWidth, H = window.innerHeight;
    const verre = "rgba(255, 255, 255, 0.14)";
    const nuit  = "rgba(12, 12, 15, 0.66)";
    return [
      // La dynamique (la pastille du haut).
      par("[data-nx-ile]",
          { x: W / 2, y: 26, w: 300, h: 32, r: 16, fond: nuit, bord: verre }),
      // La barre latérale.
      par(".nx-dock",
          { x: 42, y: H / 2, w: 64, h: H * 0.86, r: 22, fond: nuit, bord: verre }),
      // La mascotte.
      // La mascotte. Elle n'est pas un panneau : c'est un personnage dessiné,
      // posé sur du vide. La bulle prend donc sa TAILLE et sa rondeur, encaisse
      // le choc, et c'est sa COULEUR qui se retire pendant le choc — le dessin
      // apparaît de l'intérieur de la bulle. C'est mot pour mot ce qu'Aharon
      // demandait, et ce n'est pas la même fin que pour les deux barres.
      par("[data-nx-mascotte]",
          { x: W - 41, y: H - 125, w: 58, h: 58, r: 29,
            fond: "rgba(99, 102, 241, 0.28)", bord: "rgba(99, 102, 241, 0.55)",
            rond: true, revele: true }),
    ];
  }

  // La position de départ de chaque satellite, sur le logo (viewBox 24×24,
  // dessiné à T px, centré). On calcule en pixels depuis le centre.
  const T = 196;
  const POS: [number, number][] = [[12, 2.6], [3.4, 19.4], [20.6, 19.4]];
  const depart = POS.map(([x, y]) => ({ dx: (x - 12) / 24 * T, dy: (y - 12) / 24 * T }));
  const cx = typeof window !== "undefined" ? window.innerWidth / 2 : 0;
  const cy = typeof window !== "undefined" ? window.innerHeight / 2 : 0;

  const [tr, tv, tb] = teinte.current;
  /// L'accent en vraie couleur, avec l'opacité qu'on veut. Interpolable.
  const A = (a: number) => `rgba(${tr}, ${tv}, ${tb}, ${a})`;

  return (
    <>
    <AnimatePresence>
      {phase < 3 && (
        <motion.div
          key="voile"
          className="fixed inset-0 z-[2000000] flex items-center justify-center bg-[#09090b]"
          initial={{ opacity: 1 }}
          // Le voile s'en va DERRIÈRE l'onde, et SURTOUT avant que les bulles
          // n'aient fini : on voit donc le bureau arriver SOUS elles, puis les
          // bulles se refermer dessus. C'est l'inverse d'un fondu.
          animate={phase >= 2
            ? { opacity: 0, transition: { duration: 0.55 * lent, delay: 0.5 * lent,
                                          ease: [0.4, 0, 0.2, 1] } }
            : { opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.24, ease: [0.4, 0, 0.2, 1] } }}
        >
          {/* LE CŒUR DEVIENT LE BUREAU : une onde part du centre et balaie
              l'écran. Le voile s'en va derrière elle — c'est l'onde qui
              découvre le bureau, pas un fondu. */}
          {phase >= 2 && (
            <motion.div
              className="pointer-events-none absolute rounded-full"
              style={{
                left: "50%", top: "50%", translate: "-50% -50%",
                border: `2px solid ${A(0.7)}`,
                boxShadow: `0 0 60px ${A(0.45)}, inset 0 0 60px ${A(0.3)}`,
              }}
              initial={{ width: 40, height: 40, opacity: 0.95 }}
              animate={{
                width: Math.hypot(window.innerWidth, window.innerHeight) * 2.1,
                height: Math.hypot(window.innerWidth, window.innerHeight) * 2.1,
                opacity: [0.95, 0.6, 0],
                transition: { duration: 1.0 * lent, ease: [0.22, 0.61, 0.36, 1] },
              }}
            />
          )}

          {/* La respiration derrière le logo : c'est elle qui donne la
              sensation que quelque chose s'éveille, avant même le dessin. */}
          <motion.div
            className="pointer-events-none absolute"
            style={{
              width: 620, height: 620, borderRadius: "50%",
              background: `radial-gradient(circle, ${A(0.34)} 0%, transparent 62%)`,
              filter: "blur(26px)",
            }}
            initial={{ opacity: 0.4, scale: 1 }}
            animate={phase >= 2
              ? { opacity: 0, scale: 2.4, transition: { duration: 0.9 * lent, ease: [0.32, 0.72, 0, 1] } }
              : { opacity: [0.28, 0.5, 0.38], scale: [0.94, 1.05, 1],
                  transition: { duration: 1.4, ease: [0.4, 0, 0.2, 1] } }}
          />

          {/* LE LOGO. Dessiné, pas une image : chaque morceau doit pouvoir
              partir de son côté. */}
          <div className="relative" style={{ width: T, height: T }}>
            <svg viewBox="0 0 24 24" width={T} height={T} className="absolute inset-0 overflow-visible">
              {POS.map(([x, y], i) => (
                <motion.line
                  key={i}
                  x1={12} y1={12} x2={x} y2={y}
                  stroke="#ffffff" strokeWidth={0.7} strokeLinecap="round"
                  // RÈGLE DE SÛRETÉ : l'état de repos est VISIBLE. Si rien ne
                  // s'anime — onglet en fond, batterie faible — on voit le
                  // logo immobile, jamais un écran noir de trois secondes.
                  initial={{ pathLength: 1, opacity: 0.55 }}
                  animate={phase >= 2
                    ? { opacity: 0, transition: { duration: 0.28 * lent } }
                    : { pathLength: 1, opacity: 0.38 }}
                />
              ))}
              <motion.circle
                cx={12} cy={12} r={2.6}
                fill="#09090b" stroke={A(1)} strokeWidth={1.5}
                initial={{ scale: 1, opacity: 1 }}
                animate={phase >= 2
                  ? { scale: [1, 0.7, 9], opacity: [1, 1, 0],
                      transition: { duration: 0.8 * lent, times: [0, 0.2, 1],
                                    ease: [0.32, 0.72, 0, 1] } }
                  : { scale: 1, opacity: 1 }}
                style={{ transformOrigin: "12px 12px" }}
              />
            </svg>
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
                ? { opacity: 0, y: -8, transition: { duration: 0.3 * lent } }
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

      {/* ══════════════ LES TROIS BULLES, SUR LEUR PROPRE CALQUE ══════════════
          HORS du voile. C'était tout le problème : dedans, elles héritaient de
          son fondu et rien ne pouvait les sauver. Ici, elles sont maîtresses
          de leur sort — elles restent pleinement opaques jusqu'à être devenues
          l'élément, et le calque part d'un coup, sans transition, parce qu'à
          cet instant il est confondu au pixel avec ce qu'il y a dessous.

          TROIS COUCHES, une idée chacune — c'est ce qui rend le mouvement
          lisible au lieu d'être une bouillie de valeurs :
            · le VOYAGE  : elle traverse l'écran ;
            · le CHOC    : elle s'écrase en arrivant (la mascotte surtout) ;
            · la BULLE   : elle change de taille, de forme et de couleur. */}
      {phase < 3 && (
        <div key="bulles" className="pointer-events-none fixed inset-0 z-[2000001]">
          {[0, 1, 2].map((i) => {
            const c = cibles.current[i];
            const mascotte = i === 2;
            const decalage = i * 0.08 * lent;
            // La bulle passe un peu à côté de la ligne droite : un objet
            // lourd ne va jamais tout droit, il pèse dans la courbe.
            const arcX = c ? (cx + depart[i].dx) * 0.42 + c.x * 0.58 + (mascotte ? 26 : -18) : 0;
            const arcY = c ? (cy + depart[i].dy) * 0.42 + c.y * 0.58 - 34 : 0;

            return (
              <motion.div
                key={i}
                className="absolute"
                style={{ left: 0, top: 0 }}
                /* ── 1. LE VOYAGE ─────────────────────────────────────────
                   Elle part vite, passe par un point plus haut que la ligne
                   droite, et se pose. C'est la courbe d'appui de Nexus. */
                initial={{ x: cx + depart[i].dx, y: cy + depart[i].dy }}
                animate={phase >= 2 && c
                  ? { x: [cx + depart[i].dx, arcX, c.x, c.x],
                      y: [cy + depart[i].dy, arcY, c.y, c.y],
                      transition: { duration: surPlace ? 0.05 : VOYAGE,
                                    delay: surPlace ? 0 : decalage,
                                    times: [0, 0.34, 0.68, 1],
                                    ease: [0.32, 0.72, 0, 1] } }
                  : { x: cx + depart[i].dx, y: cy + depart[i].dy }}
              >
                <motion.div
                  /* ── 2. LE CHOC ─────────────────────────────────────────
                     Aharon, pour la mascotte : « il faut que la bulle prenne
                     une forme de mascotte, puis que cette bulle prenne une
                     animation telle une bulle qui prend un choc, et pendant ce
                     choc le jeu de couleur va se faire pour devenir la
                     mascotte. »
                     C'est ici. Elle arrive à 0,66, s'écrase à 0,72, rebondit,
                     et se calme — pendant que la couleur, plus bas, fait
                     exactement son chemin sur la même fenêtre de temps.
                     Les deux autres reçoivent le même choc, en plus sobre :
                     une barre ne rebondit pas comme une mascotte. */
                  animate={phase >= 2 && c
                    ? mascotte
                      ? { scaleX: [1, 1, 1.38, 0.80, 1.12, 0.96, 1.02, 1],
                          scaleY: [1, 1, 0.68, 1.24, 0.90, 1.04, 0.99, 1],
                          transition: { duration: VOYAGE, delay: decalage,
                                        times: [0, 0.62, 0.70, 0.78, 0.85, 0.91, 0.96, 1],
                                        ease: "easeOut" } }
                      : { scaleX: [1, 1, 1.09, 0.975, 1.01, 1],
                          scaleY: [1, 1, 0.91, 1.03, 0.99, 1],
                          transition: { duration: VOYAGE, delay: decalage,
                                        times: [0, 0.64, 0.72, 0.83, 0.92, 1],
                                        ease: "easeOut" } }
                    : { scaleX: 1, scaleY: 1 }}
                >
                  <motion.div
                    /* ── 3. LA BULLE ────────────────────────────────────────
                       « pas statique, un aspect moelleux, bulleux, instable
                         dans la position, et par des jeux de couleur elles se
                         transforment en la barre latérale… »

                       Elle tremble tout du long — une bulle ne tient jamais en
                       place — et le tremblement S'ÉTEINT en arrivant : il
                       finit exactement à zéro, sinon la bulle ne serait plus
                       confondue avec l'élément et l'on verrait le calque
                       partir de travers. */
                    style={{ translate: "-50% -50%" }}
                    animate={phase >= 2 && c
                      ? { x: [0, 5, -3.5, 2, -0.8, 0], y: [0, -4, 3, -1.4, 0.5, 0],
                          rotate: [0, 1.1, -0.8, 0.35, -0.1, 0],
                          transition: { duration: VOYAGE, delay: decalage,
                                        times: [0, 0.28, 0.52, 0.74, 0.9, 1],
                                        ease: "easeInOut" } }
                      : { x: [0, 2.4, -1.8, 1.2, 0], y: [0, -2, 2.4, -1, 0],
                          rotate: [0, 0.8, -0.6, 0.3, 0],
                          transition: { duration: 2.6, repeat: Infinity,
                                        ease: "easeInOut", delay: i * 0.31 } }}
                  >
                    <motion.div
                      /* Et voilà le corps de la bulle : taille, forme,
                         couleur. LE JEU DE COULEUR, celui qu'Aharon voulait,
                         se joue en cinq temps et pas un n'est un fondu :

                           0,00  une bille d'accent, dense, qui brille
                           0,34  elle gonfle en volant : le poids se sent
                           0,66  elle se DÉROULE dans la forme de l'élément,
                                 en dépassant un peu — l'« explosion »
                           0,84  sa couleur EST devenue celle de l'élément :
                                 c'est le moment où la bulle est la barre
                           1,00  son intérieur se libère, son contour reste.
                                 Elle est le cadre de l'élément réel, posé
                                 dessous au pixel. Retirer le calque ne
                                 montre rien : il n'y a plus de différence.

                         La bulle ne disparaît donc JAMAIS en opacité. Elle
                         reste opaque, pleine, et se résout dans l'objet. */
                      initial={{
                        width: 21, height: 21, borderRadius: 11,
                        backgroundColor: A(1), borderColor: A(0),
                        boxShadow: `0 0 14px ${A(0.55)}`,
                      }}
                      style={{ borderWidth: 1, borderStyle: "solid" }}
                      animate={phase >= 2 && c
                        ? {
                            width:  [21, 34, c.w * 1.05, c.w * 1.01, c.w * 0.998, c.w],
                            height: [21, 34, c.h * 1.05, c.h * 1.01, c.h * 0.998, c.h],
                            borderRadius: [11, 17, c.r * 1.5, c.r * 1.08, c.r * 0.97, c.r],
                            // LE JEU DE COULEUR, en six temps. Elle reste
                            // PLEINE tant qu'elle se déroule — c'est la
                            // demande —, puis sa teinte voyage jusqu'à celle
                            // de l'élément en passant par une couleur
                            // intermédiaire dense, et seulement à la toute fin
                            // son intérieur se libère pour découvrir l'élément
                            // réel, son cadre restant en place.
                            backgroundColor: [
                              A(1), A(1), A(1),
                              melanger(A(1), c.fond, 0.55, 0.95),
                              c.fond,
                              // Tout à la fin, l'intérieur se libère. Ce n'est
                              // PAS le fondu qu'Aharon reprochait : la teinte
                              // est déjà arrivée, le cadre reste entier, et ce
                              // qui apparaît dans la bulle, c'est l'élément
                              // lui-même — ses icônes, son texte. Si l'on
                              // gardait le fond plein, on poserait un second
                              // verre sombre par-dessus le vrai : les icônes
                              // de la barre s'assombriraient, puis
                              // ressauteraient d'un coup au retrait du calque.
                              "rgba(0, 0, 0, 0)",
                            ],
                            // Une barre laisse son CADRE (elle devient
                            // l'élément) ; la mascotte ne laisse rien (elle
                            // découvre le dessin). Deux fins, deux intentions.
                            borderColor: [A(0), A(0.5), A(0.9), A(0.7), c.bord,
                                          c.revele ? "rgba(0, 0, 0, 0)" : c.bord],
                            boxShadow: [
                              `0 0 14px ${A(0.55)}`,
                              `0 0 40px ${A(0.9)}`,
                              `0 0 34px ${A(0.7)}`,
                              `0 0 22px ${A(0.38)}`,
                              `0 0 8px ${A(0.12)}`,
                              `0 0 0px ${A(0)}`,
                            ],
                            transition: {
                              duration: surPlace ? 0.05 : VOYAGE,
                              delay: surPlace ? 0 : decalage,
                              times: [0, 0.30, 0.60, 0.78, 0.90, 1],
                              // Le déroulé dépasse : c'est ce qui fait
                              // « exploser » plutôt que « grandir ».
                              ease: [[0.4, 0, 0.2, 1], [0.34, 1.34, 0.5, 1],
                                     [0.4, 0, 0.2, 1], [0.4, 0, 0.2, 1],
                                     [0.4, 0, 0.2, 1]],
                            },
                          }
                        : {
                            width: 21, height: 21, borderRadius: 11,
                            backgroundColor: A(1), borderColor: A(0),
                            boxShadow: `0 0 14px ${A(0.55)}`,
                          }}
                    />
                  </motion.div>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      )}
    </>
  );
}

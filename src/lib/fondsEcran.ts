// ============================================================================
//  LES FONDS D'ÉCRAN DE NEXUS.
//
//  Aharon : « macOS propose déjà des fonds d'écran magnifiques. Donc si on
//  propose un fond largement moins bien, ça ne sert à rien. Il faut des trucs
//  magnifiques, plusieurs, différents, des choses qui donnent envie. »
//
//  Il a raison : celui d'avant était un dégradé sombre + une GRILLE + le mot
//  « NEXUS » écrit en gros. Une grille et un filigrane, c'est ce qu'on met sur
//  un modèle vide, pas sur un fond qu'on garde.
//
//  Ceux-ci sont dessinés à la résolution EXACTE de l'écran — donc nets sur un
//  Retina, contrairement à une image téléchargée. Chacun a une idée, pas un
//  effet : une aurore, un horizon, des courbes de niveau, des vagues.
//
//  DÉTAIL QUI CHANGE TOUT : le grain. Un dégradé lisse sur 5000 pixels montre
//  des BANDES sur un écran — c'est ce qui fait qu'un fond « fait généré ». Un
//  grain d'un pour cent les efface complètement, et ne se voit pas.
// ============================================================================

export type Fond = {
  id: string;
  nom: string;
  /// Ce qu'on en dit sous la vignette. Court.
  note: string;
  dessiner: (c: CanvasRenderingContext2D, W: number, H: number, o: Options) => void;
};

export type Options = {
  /// La couleur d'ambiance de Nexus, pour que le fond soit LE SIEN.
  accent: string;
  /// Laisser les bords calmes, là où macOS pose ses widgets.
  zonesCalmes?: boolean;
};

// ── Petits outils communs ───────────────────────────────────────────────────

/// Lire une couleur, quelle que soit son écriture.
///
/// Ma première version n'acceptait que « #rrggbb ». Or `melange` rendait
/// « rgb(84,113,225) », que je repassais ensuite à cette même fonction : elle
/// lisait « rg » comme de l'hexadécimal et rendait NaN. Résultat, la page
/// entière tombait sur « rgba(NaN,11,115,0.42) » — ÉCRAN NOIR, sans que rien
/// n'annonce la couleur fautive. Elle accepte donc tout, et ne rend jamais NaN.
function rgb(couleur: string): [number, number, number] {
  const c = couleur.trim();
  const m = c.match(/rgba?\(([^)]+)\)/i);
  if (m) {
    const p = m[1].split(",").map((x) => parseFloat(x));
    return [p[0] | 0, p[1] | 0, p[2] | 0];
  }
  const h = c.replace("#", "");
  const v = h.length === 3 ? h.split("").map((x) => x + x).join("") : h;
  const n = (i: number) => {
    const x = parseInt(v.slice(i, i + 2), 16);
    return Number.isFinite(x) ? x : 0;
  };
  return [n(0), n(2), n(4)];
}

/// Toujours rendre de l'hexadécimal : c'est ce qui permet de mélanger un
/// mélange sans que la couleur devienne illisible au passage suivant.
function melange(a: string, b: string, t: number): string {
  const [r1, g1, b1] = rgb(a), [r2, g2, b2] = rgb(b);
  const m = (x: number, y: number) =>
    Math.max(0, Math.min(255, Math.round(x + (y - x) * t))).toString(16).padStart(2, "0");
  return `#${m(r1, r2)}${m(g1, g2)}${m(b1, b2)}`;
}
function avecAlpha(hex: string, a: number): string {
  const [r, g, b] = rgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/// Une nappe de lumière douce.
function nappe(c: CanvasRenderingContext2D, x: number, y: number, r: number,
               couleur: string, alpha: number) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, avecAlpha(couleur, alpha));
  g.addColorStop(0.55, avecAlpha(couleur, alpha * 0.35));
  g.addColorStop(1, avecAlpha(couleur, 0));
  c.fillStyle = g;
  c.fillRect(0, 0, c.canvas.width, c.canvas.height);
}

/// LE GRAIN. Sans lui, tout dégradé montre des bandes horizontales sur un
/// grand écran, et le fond a l'air fabriqué à la va-vite. On le pose en
/// dernier, très faible, et il devient invisible tout en effaçant les bandes.
function grain(c: CanvasRenderingContext2D, W: number, H: number, force = 9) {
  const t = 256;
  const petit = document.createElement("canvas");
  petit.width = t; petit.height = t;
  const pc = petit.getContext("2d");
  if (!pc) return;
  const img = pc.createImageData(t, t);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (Math.random() - 0.5) * force * 2;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  pc.putImageData(img, 0, 0);
  const motif = c.createPattern(petit, "repeat");
  if (!motif) return;
  c.save();
  c.globalCompositeOperation = "overlay";
  c.globalAlpha = 0.05;
  c.fillStyle = motif;
  c.fillRect(0, 0, W, H);
  c.restore();
}

/// Les bords calmes, là où macOS pose ses widgets : le fond s'y assombrit
/// légèrement pour qu'ils restent lisibles.
function zonesCalmes(c: CanvasRenderingContext2D, W: number, H: number) {
  for (const x of [W * 0.03, W * 0.78]) {
    const g = c.createLinearGradient(x, 0, x + W * 0.19, 0);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(0.5, "rgba(0,0,0,0.13)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = g;
    c.fillRect(x, H * 0.08, W * 0.19, H * 0.84);
  }
}

/// Un ciel étoilé crédible : beaucoup de petites, très peu de grosses.
function etoiles(c: CanvasRenderingContext2D, W: number, H: number, densite = 1) {
  const n = Math.round((W * H) / 5200 * densite);
  for (let i = 0; i < n; i++) {
    const x = Math.random() * W, y = Math.random() * H;
    const grosse = Math.random() < 0.035;
    const r = grosse ? Math.random() * 1.6 + 1.1 : Math.random() * 0.9 + 0.25;
    const a = grosse ? 0.55 + Math.random() * 0.4 : 0.12 + Math.random() * 0.45;
    c.beginPath();
    c.arc(x, y, r * (W / 2560), 0, 6.284);
    c.fillStyle = `rgba(255,255,255,${a})`;
    c.fill();
    if (grosse) {
      // Un halo minuscule : c'est ce qui distingue une étoile d'un pixel mort.
      c.beginPath();
      c.arc(x, y, r * 4 * (W / 2560), 0, 6.284);
      c.fillStyle = `rgba(200,220,255,${a * 0.12})`;
      c.fill();
    }
  }
}

/// Un bruit lisse (valeur douce entre 0 et 1), pour des formes organiques.
function onde(x: number, graines: number[]): number {
  let v = 0;
  for (let i = 0; i < graines.length; i++) {
    v += Math.sin(x * (i + 1) * 1.7 + graines[i]) / (i + 1);
  }
  return v;
}

/// LA VRAIE CARTE DU MONDE.
///
/// Ma première version dessinait les continents avec huit ovales : c'était
/// méconnaissable, et Aharon avait justement demandé « le fond du monde, mais
/// en mieux ». Le projet contient déjà `public/world.svg` — 314 pays, celui du
/// bureau de Nexus. On s'en sert : on le peint une fois en petit, on lit ses
/// pixels, et chaque pixel encré devient un point de lumière.
let carte: { l: number; h: number; encre: Uint8ClampedArray } | null = null;
let carteEnCours: Promise<void> | null = null;

export function prechargerCarte(): Promise<void> {
  if (carte) return Promise.resolve();
  if (carteEnCours) return carteEnCours;
  carteEnCours = new Promise<void>((fini) => {
    const img = new Image();
    // Le SVG vient du même site : pas de question d'origine.
    img.onload = () => {
      const l = 480, h = Math.round(l * (458.627 / 784.077));
      const cv = document.createElement("canvas");
      cv.width = l; cv.height = h;
      const c = cv.getContext("2d");
      if (c) {
        c.drawImage(img, 0, 0, l, h);
        carte = { l, h, encre: c.getImageData(0, 0, l, h).data };
      }
      fini();
    };
    // Si elle ne vient pas, on ne bloque rien : le fond se dessinera sans elle.
    img.onerror = () => fini();
    img.src = "/world.svg";
  }).finally(() => { carteEnCours = null; });
  return carteEnCours;
}

// ── LES FONDS ───────────────────────────────────────────────────────────────

export const FONDS: Fond[] = [
  {
    id: "aurore",
    nom: "Aurore",
    note: "Des voiles de lumière au-dessus d'une nuit profonde",
    dessiner(c, W, H, o) {
      const ciel = c.createLinearGradient(0, 0, 0, H);
      ciel.addColorStop(0, "#05060f");
      ciel.addColorStop(0.55, "#0a0b1c");
      ciel.addColorStop(1, "#12132b");
      c.fillStyle = ciel; c.fillRect(0, 0, W, H);
      etoiles(c, W, H, 1.1);

      // Trois voiles, chacun avec sa propre ondulation. Ils se recouvrent en
      // « lighter » : c'est ce qui donne la transparence d'une vraie aurore.
      c.save();
      c.globalCompositeOperation = "lighter";
      const teintes = [o.accent, melange(o.accent, "#34d399", 0.55), melange(o.accent, "#38bdf8", 0.5)];
      for (let v = 0; v < 3; v++) {
        const graines = [v * 2.3, v * 5.1 + 1.2, v * 1.7 + 3.4];
        const base = H * (0.30 + v * 0.11);
        const ampl = H * (0.10 + v * 0.03);
        c.beginPath();
        c.moveTo(0, H);
        for (let x = 0; x <= W; x += Math.max(2, W / 700)) {
          const t = x / W * 3.2;
          c.lineTo(x, base + onde(t, graines) * ampl);
        }
        c.lineTo(W, H); c.closePath();
        const g = c.createLinearGradient(0, base - ampl, 0, base + H * 0.42);
        g.addColorStop(0, avecAlpha(teintes[v], 0.42));
        g.addColorStop(0.35, avecAlpha(teintes[v], 0.16));
        g.addColorStop(1, avecAlpha(teintes[v], 0));
        c.fillStyle = g; c.fill();
      }
      c.restore();

      // La lueur au ras de l'horizon.
      nappe(c, W * 0.5, H * 1.02, Math.max(W, H) * 0.55, o.accent, 0.22);
      if (o.zonesCalmes) zonesCalmes(c, W, H);
      grain(c, W, H);
    },
  },

  {
    id: "horizon",
    nom: "Horizon",
    note: "Le lever d'une planète, vu de très loin",
    dessiner(c, W, H, o) {
      const ciel = c.createLinearGradient(0, 0, 0, H);
      ciel.addColorStop(0, "#03040a");
      ciel.addColorStop(0.62, melange("#03040a", o.accent, 0.10));
      ciel.addColorStop(1, melange("#03040a", o.accent, 0.30));
      c.fillStyle = ciel; c.fillRect(0, 0, W, H);
      etoiles(c, W, H, 0.85);

      // La planète : un disque énorme, en grande partie hors cadre.
      const R = Math.max(W, H) * 0.78;
      const cx = W * 0.5, cy = H + R * 0.72;
      const corps = c.createRadialGradient(cx, cy - R * 0.35, R * 0.1, cx, cy, R);
      corps.addColorStop(0, melange("#0b0d1c", o.accent, 0.32));
      corps.addColorStop(0.7, "#070812");
      corps.addColorStop(1, "#04050c");
      c.beginPath(); c.arc(cx, cy, R, 0, 6.284); c.fillStyle = corps; c.fill();

      // L'atmosphère : un liseré lumineux qui suit exactement le bord.
      for (let i = 0; i < 3; i++) {
        c.beginPath();
        c.arc(cx, cy, R + i * (H * 0.004), 0, 6.284);
        c.strokeStyle = avecAlpha(o.accent, 0.34 / (i + 1));
        c.lineWidth = H * (0.003 + i * 0.006);
        c.stroke();
      }
      const halo = c.createRadialGradient(cx, cy, R * 0.98, cx, cy, R * 1.35);
      halo.addColorStop(0, avecAlpha(o.accent, 0.30));
      halo.addColorStop(1, avecAlpha(o.accent, 0));
      c.fillStyle = halo; c.fillRect(0, 0, W, H);

      if (o.zonesCalmes) zonesCalmes(c, W, H);
      grain(c, W, H);
    },
  },

  {
    id: "courbes",
    nom: "Courbes de niveau",
    note: "Une carte de relief, tracée à la main",
    dessiner(c, W, H, o) {
      const f = c.createLinearGradient(0, 0, W, H);
      f.addColorStop(0, "#070810");
      f.addColorStop(1, melange("#070810", o.accent, 0.16));
      c.fillStyle = f; c.fillRect(0, 0, W, H);

      // Chaque courbe est la même onde, décalée : c'est ce qui donne
      // l'impression d'un relief cohérent plutôt que de traits au hasard.
      const graines = [0.7, 2.9, 4.1, 1.3];
      const n = 34;
      for (let i = 0; i < n; i++) {
        const t = i / n;
        const y0 = H * (-0.15 + t * 1.35);
        c.beginPath();
        for (let x = 0; x <= W; x += Math.max(2, W / 900)) {
          const u = x / W * 2.6;
          const relief = onde(u + t * 1.4, graines) * H * 0.075 * (0.5 + Math.sin(t * 3.14) * 0.9);
          const y = y0 + relief;
          x === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
        }
        // Une courbe sur cinq est appuyée, comme sur une vraie carte.
        const forte = i % 5 === 0;
        c.strokeStyle = avecAlpha(o.accent, forte ? 0.42 : 0.16);
        c.lineWidth = Math.max(1, W / (forte ? 1400 : 2600));
        c.stroke();
      }
      nappe(c, W * 0.22, H * 0.18, Math.max(W, H) * 0.5, o.accent, 0.16);
      nappe(c, W * 0.82, H * 0.85, Math.max(W, H) * 0.45, "#38bdf8", 0.10);
      if (o.zonesCalmes) zonesCalmes(c, W, H);
      grain(c, W, H);
    },
  },

  {
    id: "vagues",
    nom: "Vagues",
    note: "Des couches qui glissent l'une derrière l'autre",
    dessiner(c, W, H, o) {
      const f = c.createLinearGradient(0, 0, 0, H);
      f.addColorStop(0, melange("#05060e", o.accent, 0.06));
      f.addColorStop(1, "#04050b");
      c.fillStyle = f; c.fillRect(0, 0, W, H);

      const couches = 7;
      for (let i = 0; i < couches; i++) {
        const t = i / (couches - 1);
        const base = H * (0.42 + t * 0.52);
        const graines = [i * 1.9 + 0.4, i * 3.1 + 2.2, i * 0.8 + 5.0];
        c.beginPath();
        c.moveTo(0, H);
        for (let x = 0; x <= W; x += Math.max(2, W / 800)) {
          const u = x / W * (1.6 + i * 0.25);
          c.lineTo(x, base + onde(u, graines) * H * 0.055 * (1 - t * 0.5));
        }
        c.lineTo(W, H); c.closePath();
        // Les couches du fond sont pâles, celles du premier plan sont sombres :
        // c'est la profondeur atmosphérique, et ça suffit à créer la distance.
        const col = melange(o.accent, "#04050b", 0.25 + t * 0.7);
        c.fillStyle = col;
        c.fill();
        // Un liseré sur la crête, comme une lumière rasante.
        c.strokeStyle = avecAlpha("#ffffff", 0.055 * (1 - t));
        c.lineWidth = Math.max(1, W / 2200);
        c.stroke();
      }
      nappe(c, W * 0.7, H * 0.12, Math.max(W, H) * 0.4, o.accent, 0.18);
      if (o.zonesCalmes) zonesCalmes(c, W, H);
      grain(c, W, H);
    },
  },

  {
    id: "verre",
    nom: "Verre",
    note: "Des couleurs qui se fondent, sans une seule ligne",
    dessiner(c, W, H, o) {
      c.fillStyle = "#06070e"; c.fillRect(0, 0, W, H);
      // Un dégradé « en maille » : plusieurs nappes larges qui se recouvrent.
      // C'est la manière la plus simple d'obtenir ce que font les fonds de
      // macOS récents, sans image.
      const points: [number, number, string, number][] = [
        [0.18, 0.16, o.accent, 0.55],
        [0.82, 0.24, melange(o.accent, "#38bdf8", 0.7), 0.42],
        [0.62, 0.78, melange(o.accent, "#f472b6", 0.55), 0.34],
        [0.12, 0.86, melange(o.accent, "#34d399", 0.5), 0.30],
        [0.5, 0.5, "#ffffff", 0.05],
      ];
      c.save();
      c.globalCompositeOperation = "lighter";
      for (const [x, y, col, a] of points) {
        nappe(c, W * x, H * y, Math.max(W, H) * 0.62, col, a);
      }
      c.restore();
      // Un voile sombre en bas : sans lui, le Dock de macOS se perd dedans.
      const v = c.createLinearGradient(0, H * 0.55, 0, H);
      v.addColorStop(0, "rgba(0,0,0,0)");
      v.addColorStop(1, "rgba(0,0,0,0.34)");
      c.fillStyle = v; c.fillRect(0, H * 0.55, W, H * 0.45);
      if (o.zonesCalmes) zonesCalmes(c, W, H);
      grain(c, W, H, 12);
    },
  },

  {
    id: "nuit",
    nom: "Nuit claire",
    note: "La Voie lactée, et rien d'autre",
    dessiner(c, W, H, o) {
      const ciel = c.createRadialGradient(W * 0.5, H * 0.35, 0, W * 0.5, H * 0.35, Math.max(W, H) * 0.9);
      ciel.addColorStop(0, "#0a0c1e");
      ciel.addColorStop(1, "#020309");
      c.fillStyle = ciel; c.fillRect(0, 0, W, H);

      // LA VOIE LACTÉE.
      //
      // Premier essai : sept taches sombres régulièrement espacées le long de
      // la bande, pour imiter les nuages de poussière. Résultat à l'écran :
      // une FILE DE TROUS identiques, comme une chaîne. Rien dans le ciel
      // n'est régulier.
      // Ici, la bande est faite de nombreuses bouffées de tailles et de
      // positions très différentes, tirées d'une suite irrégulière. Aucune ne
      // ressemble à sa voisine, et l'ensemble se lit comme une traînée.
      c.save();
      c.translate(W * 0.5, H * 0.44);
      c.rotate(-0.40);
      c.globalCompositeOperation = "lighter";
      for (let i = 0; i < 60; i++) {
        // Une suite qui ne se répète pas, mais toujours la même d'une fois
        // sur l'autre : le fond ne change pas entre l'aperçu et l'image.
        const a1 = Math.sin(i * 12.9898) * 43758.5453;
        const a2 = Math.sin(i * 78.233) * 12345.6789;
        const rx = (a1 - Math.floor(a1)) - 0.5;
        const ry = (a2 - Math.floor(a2)) - 0.5;
        const x = rx * W * 1.9;
        // Les bouffées s'écartent peu de l'axe : c'est ce qui fait une bande.
        const y = ry * H * 0.30 * (0.4 + Math.abs(rx));
        const r = W * (0.035 + Math.abs(ry) * 0.16);
        const col = i % 3 === 0 ? melange("#ffffff", o.accent, 0.42)
                  : i % 3 === 1 ? "#dbe4ff" : "#c9d6ff";
        const g = c.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, avecAlpha(col, 0.075));
        g.addColorStop(0.6, avecAlpha(col, 0.026));
        g.addColorStop(1, avecAlpha(col, 0));
        c.fillStyle = g;
        c.fillRect(-W, -H, W * 2, H * 2);
      }
      c.restore();

      etoiles(c, W, H, 3.4);
      nappe(c, W * 0.14, H * 0.9, Math.max(W, H) * 0.4, o.accent, 0.14);
      if (o.zonesCalmes) zonesCalmes(c, W, H);
      grain(c, W, H);
    },
  },

  {
    id: "monde",
    nom: "Le monde",
    note: "La carte de Nexus, en points de lumière",
    dessiner(c, W, H, o) {
      const f = c.createLinearGradient(0, 0, 0, H);
      f.addColorStop(0, "#04050d");
      f.addColorStop(1, melange("#04050d", o.accent, 0.14));
      c.fillStyle = f; c.fillRect(0, 0, W, H);
      etoiles(c, W, H, 0.5);

      if (!carte) {
        // La carte n'a pas pu être chargée : on ne dessine pas un monde faux,
        // on laisse une belle nuit. Mieux vaut sobre que grotesque.
        nappe(c, W * 0.5, H * 0.45, Math.max(W, H) * 0.5, o.accent, 0.16);
        grain(c, W, H);
        return;
      }

      // La carte remplit la largeur, centrée en hauteur.
      const marge = 0.06;
      const l = W * (1 - marge * 2);
      const h = l * (carte.h / carte.l);
      const x0 = W * marge, y0 = (H - h) / 2;
      const pas = Math.max(3, Math.round(W / 240));
      const r = pas * 0.30;

      for (let y = 0; y < h; y += pas) {
        for (let x = 0; x < l; x += pas) {
          // On lit l'encre de la carte à cet endroit.
          const cx = Math.floor(x / l * carte.l);
          const cy = Math.floor(y / h * carte.h);
          const a = carte.encre[(cy * carte.l + cx) * 4 + 3];
          if (a < 80) continue;
          // Les points s'éteignent doucement vers les bords : le regard reste
          // au centre au lieu d'être tiré vers les coins.
          const loin = Math.hypot((x / l - 0.5) * 1.5, (y / h - 0.5) * 1.1);
          const force = Math.max(0.12, 0.62 - loin * 0.5);
          c.beginPath();
          c.arc(x0 + x, y0 + y, r, 0, 6.284);
          c.fillStyle = avecAlpha(o.accent, force);
          c.fill();
        }
      }
      // Quelques points plus vifs, comme des villes qui veillent.
      for (let i = 0; i < 26; i++) {
        const x = x0 + Math.random() * l, y = y0 + Math.random() * h;
        const cx = Math.floor((x - x0) / l * carte.l);
        const cy = Math.floor((y - y0) / h * carte.h);
        if (carte.encre[(cy * carte.l + cx) * 4 + 3] < 80) { i--; continue; }
        c.beginPath(); c.arc(x, y, r * 1.9, 0, 6.284);
        c.fillStyle = avecAlpha("#ffffff", 0.55); c.fill();
        c.beginPath(); c.arc(x, y, r * 7, 0, 6.284);
        c.fillStyle = avecAlpha(o.accent, 0.16); c.fill();
      }

      nappe(c, W * 0.5, H * 0.5, Math.max(W, H) * 0.55, o.accent, 0.10);
      if (o.zonesCalmes) zonesCalmes(c, W, H);
      grain(c, W, H);
    },
  },

  {
    id: "encre",
    nom: "Encre",
    note: "Presque noir. Pour ceux qui ne veulent rien voir.",
    dessiner(c, W, H, o) {
      c.fillStyle = "#030308"; c.fillRect(0, 0, W, H);
      // Une seule respiration de couleur, très basse, très large.
      nappe(c, W * 0.5, H * 1.05, Math.max(W, H) * 0.75, o.accent, 0.20);

      // Des arcs concentriques, à peine visibles : le fond n'est plus vide,
      // et pourtant rien ne vient déranger une fenêtre posée dessus.
      const cx = W * 0.5, cy = H * 1.02;
      for (let i = 1; i <= 9; i++) {
        c.beginPath();
        c.arc(cx, cy, Math.max(W, H) * (0.16 + i * 0.075), Math.PI, 0);
        c.strokeStyle = avecAlpha(o.accent, 0.11 - i * 0.008);
        c.lineWidth = Math.max(1, W / 2000);
        c.stroke();
      }
      etoiles(c, W, H, 0.5);
      if (o.zonesCalmes) zonesCalmes(c, W, H);
      grain(c, W, H, 7);
    },
  },
];

export function fondParId(id: string): Fond {
  return FONDS.find((f) => f.id === id) || FONDS[0];
}

import { create } from "zustand";

// Un "espace" ouvert = une fenetre posee sur le bureau.
export interface OpenWindow {
  id: string;
  appId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
  minimized: boolean;
  lastActive?: number;
}

interface WindowsState {
  windows: OpenWindow[];
  zCounter: number;
  paletteOpen: boolean;
  openFileId: string | null;
  isAutoOrganized: boolean;

  openApp: (appId: string, size?: { width: number; height: number }) => void;
  openFile: (fileId: string) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  moveWindow: (id: string, x: number, y: number) => void;
  resizeWindow: (id: string, width: number, height: number) => void;
  setBounds: (id: string, x: number, y: number, width: number, height: number) => void;
  toggleMinimize: (id: string) => void;

  closeAll: () => void;
  minimizeAll: () => void;
  organizeWindows: () => void;
  toggleAutoOrganize: () => void;
  setAutoOrganize: (enabled: boolean) => void;
  autoMinimizeInactiveWindows: (thresholdMs?: number) => void;
  ajusterAEcran: () => void;

  setPaletteOpen: (open: boolean) => void;
  togglePalette: () => void;
}

// Mesure de l'ecran. `window.innerWidth` peut valoir 0 : onglet encore
// masque, fenetre pas encore disposee. Un seul zero suffisait a produire une
// fenetre de largeur NEGATIVE (`Math.min(520, 0 - 88)` = -88), enregistree
// telle quelle dans la session : la fenetre se dessinait alors a la taille de
// son contenu et debordait de l'ecran, boutons coupes. On refuse toute mesure
// qui n'a pas de sens.
/// La ZONE BUREAU : la place réellement disponible pour les fenêtres, en
/// coordonnées d'écran. Ce n'est PAS la fenêtre du navigateur : la barre
/// latérale et la barre du haut lui prennent de la place, et les fenêtres sont
/// positionnées À L'INTÉRIEUR de ce qui reste.
///
/// On bornait sur la largeur de l'écran (1280) alors que le bureau n'en fait
/// que 1226 : une fenêtre posée tout à droite dépassait de la largeur de la
/// barre latérale — 34 px de contenu hors de l'écran, invisibles et
/// inatteignables. Même famille que la largeur négative : une mesure prise au
/// mauvais endroit.
let zone: { left: number; top: number; width: number; height: number } | null = null;
export function noterZoneBureau(z: { left: number; top: number; width: number; height: number }) {
  if (z.width >= 320 && z.height >= 240) zone = z;
}
export function zoneBureau() {
  if (zone) return zone;
  const w = typeof window !== "undefined" ? window.innerWidth : 0;
  const h = typeof window !== "undefined" ? window.innerHeight : 0;
  return { left: 0, top: 0, width: w >= 320 ? w : 1280, height: h >= 240 ? h : 800 };
}

function ecran() {
  const z = zoneBureau();
  return { vw: z.width, vh: z.height };
}
// Une fenetre a toujours une taille utilisable : jamais plus grande que
// l'ecran, jamais plus petite que de quoi lire son contenu.
const FEN_MIN_L = 380, FEN_MIN_H = 320;
// « Ouvre-moi cet espace en grand » : la taille d'une arrivee depuis
// l'exterieur (extension, application Mac, banc d'essai). Elle se calcule ici,
// une seule fois, pour que personne ne la recalcule a partir d'un innerWidth
// qui peut valoir 0.
export function tailleGrande(naturel?: { width: number; height: number }) {
  const { vw, vh } = ecran();
  const maxL = Math.min(1320, Math.round(vw * 0.88));
  const maxH = Math.min(900, Math.round(vh * 0.86));
  // Sans indication, on prend toute la place. Mais un espace qui se contente
  // de 420 px de large (la Meteo) ouvert plein ecran, ce sont trois lignes
  // perdues dans un grand vide : on l'agrandit franchement, pas absurdement.
  if (!naturel) return { width: maxL, height: maxH };
  return { width: Math.min(maxL, Math.round(naturel.width * 1.35)),
           height: Math.min(maxH, Math.round(naturel.height * 1.35)) };
}
function borner(l: number, h: number, vw: number, vh: number) {
  return {
    width: Math.max(Math.min(FEN_MIN_L, vw - 16), Math.min(l, vw - 24)),
    height: Math.max(Math.min(FEN_MIN_H, vh - 16), Math.min(h, vh - 60)),
  };
}

// Positionne chaque nouvelle fenetre legerement decalee pour un effet d'empilement.
function nextOffset(count: number) {
  return 60 + (count % 6) * 34;
}

import { estModeOnglet } from "../lib/ongletMode";

// Restaure la session precedente : les fenetres ouvertes survivent au
// rechargement, comme dans un vrai systeme.
function loadSession(): { windows: OpenWindow[]; zCounter: number } {
  // Dans un nouvel onglet du navigateur, on repart PROPRE : personne n'attend
  // de retrouver ses fenetres de la veille en ouvrant un onglet.
  if (estModeOnglet()) return { windows: [], zCounter: 1 };
  try {
    const raw = localStorage.getItem("nexus.session");
    if (!raw) return { windows: [], zCounter: 1 };
    const brut = JSON.parse(raw) as OpenWindow[];
    // Soin des sessions deja abimees : une taille absurde enregistree hier ne
    // doit pas continuer a casser l'affichage aujourd'hui.
    const { vw, vh } = ecran();
    const windows = brut.map((w) => {
      const t = borner(
        Number.isFinite(w.width) && w.width > 0 ? w.width : 620,
        Number.isFinite(w.height) && w.height > 0 ? w.height : 480,
        vw, vh
      );
      return {
        ...w,
        width: t.width,
        height: t.height,
        x: Math.max(8, Math.min(Number.isFinite(w.x) ? w.x : 80, vw - t.width - 8)),
        y: Math.max(8, Math.min(Number.isFinite(w.y) ? w.y : 60, vh - t.height - 8)),
      };
    });
    const zMax = windows.reduce((m, w) => Math.max(m, w.z), 1);
    return { windows, zCounter: zMax };
  } catch {
    return { windows: [], zCounter: 1 };
  }
}

const session = loadSession();

export const useWindows = create<WindowsState>((set, get) => ({
  windows: session.windows,
  zCounter: session.zCounter,
  paletteOpen: false,
  openFileId: null,
  isAutoOrganized: false,

  openApp: (appId, size) => {
    set((state) => {
      const now = Date.now();
      const existing = state.windows.find((w) => w.appId === appId);
      const z = state.zCounter + 1;
      const { vw, vh } = ecran();
      if (existing) {
        // Deja ouvert : on le remonte, et s'il nous demande explicitement une
        // grande taille (arrivee depuis l'extension) on la lui applique aussi,
        // sinon rouvrir depuis l'extension laissait une fenetre minuscule.
        const g = size ? borner(size.width, size.height, vw, vh) : null;
        return {
          zCounter: z,
          windows: state.windows.map((w) =>
            w.id === existing.id
              ? {
                  ...w, z, minimized: false, lastActive: now,
                  ...(g ? { width: g.width, height: g.height,
                            x: Math.max(8, Math.round((vw - g.width) / 2)),
                            y: Math.max(8, Math.round((vh - g.height) / 2)) } : {}),
                }
              : w
          ),
        };
      }
      const { width, height } = borner(size?.width ?? 520, size?.height ?? 460, vw, vh);
      // Une fenetre presque aussi large que l'ecran est une ouverture « en
      // grand » : on la centre au lieu de l'empiler en escalier, sinon elle
      // deborde par le bas. C'est le cas quand l'extension ouvre un espace.
      const enGrand = width > vw * 0.7 || height > vh * 0.7;
      const offset = nextOffset(state.windows.length);
      const x = enGrand
        ? Math.max(8, Math.round((vw - width) / 2))
        : Math.max(8, Math.min(offset + 90, vw - width - 8));
      const y = enGrand
        ? Math.max(8, Math.round((vh - height) / 2))
        : Math.max(8, Math.min(offset, vh - height - 8));
      const win: OpenWindow = {
        id: `${appId}-${now}`,
        appId,
        x,
        y,
        width,
        height,
        z,
        minimized: false,
        lastActive: now,
      };
      return { zCounter: z, windows: [...state.windows, win] };
    });

    if (get().isAutoOrganized) {
      setTimeout(() => get().organizeWindows(), 10);
    }
  },

  // Ouvre un fichier dans la visionneuse (memorise l'id, puis ouvre l'app).
  openFile: (fileId) => {
    set({ openFileId: fileId });
    get().openApp("viewer", { width: 640, height: 560 });
  },

  closeWindow: (id) => {
    set((state) => ({ windows: state.windows.filter((w) => w.id !== id) }));
    if (get().isAutoOrganized) {
      setTimeout(() => get().organizeWindows(), 10);
    }
  },

  focusWindow: (id) =>
    set((state) => {
      const z = state.zCounter + 1;
      const now = Date.now();
      return {
        zCounter: z,
        windows: state.windows.map((w) => (w.id === id ? { ...w, z, lastActive: now } : w)),
      };
    }),

  moveWindow: (id, x, y) =>
    set((state) => {
      const now = Date.now();
      return {
        windows: state.windows.map((w) => (w.id === id ? { ...w, x, y, lastActive: now } : w)),
      };
    }),

  resizeWindow: (id, width, height) =>
    set((state) => {
      const now = Date.now();
      return {
        windows: state.windows.map((w) =>
          w.id === id
            ? { ...w, width: Math.max(300, width), height: Math.max(220, height), lastActive: now }
            : w
        ),
      };
    }),

  setBounds: (id, x, y, width, height) =>
    set((state) => {
      const now = Date.now();
      return {
        windows: state.windows.map((w) =>
          w.id === id ? { ...w, x, y, width, height, lastActive: now } : w
        ),
      };
    }),

  toggleMinimize: (id) =>
    set((state) => {
      const now = Date.now();
      return {
        windows: state.windows.map((w) =>
          w.id === id ? { ...w, minimized: !w.minimized, lastActive: now } : w
        ),
      };
    }),

  // Ferme tout avec panache : toutes les fenetres glissent vers le bas
  // (animation de reduction), puis le bureau est nettoye.
  closeAll: () => {
    set((state) => ({
      windows: state.windows.map((w) => ({ ...w, minimized: true })),
    }));
    window.setTimeout(() => set({ windows: [] }), 340);
  },

  // Reduit tout sans rien fermer : on retrouve l'accueil, rien n'est perdu.
  minimizeAll: () =>
    set((state) => ({
      windows: state.windows.map((w) => ({ ...w, minimized: true })),
    })),

  // Organise intelligemment toutes les fenetres sur l'ecran sans chevauchement
  // L'ecran a change de taille (navigateur redimensionne, fenetre du Mac
  // reduite, telephone tourne). Sans ce rattrapage les espaces gardaient leur
  // ancienne taille et sortaient de l'ecran : boutons coupes, contenu illisible.
  ajusterAEcran: () =>
    set((state) => {
      const { vw, vh } = ecran();
      let change = false;
      const windows = state.windows.map((w) => {
        const t = borner(w.width, w.height, vw, vh);
        const x = Math.max(8, Math.min(w.x, vw - t.width - 8));
        const y = Math.max(8, Math.min(w.y, vh - t.height - 8));
        if (t.width === w.width && t.height === w.height && x === w.x && y === w.y) return w;
        change = true;
        return { ...w, width: t.width, height: t.height, x, y };
      });
      return change ? { windows } : state;
    }),

  organizeWindows: () =>
    set((state) => {
      if (state.windows.length === 0) return state;

      const { vw, vh } = ecran();

      const padTop = 46;
      const padBottom = 54;
      const padLeft = 16;
      const padRight = 16;
      const gap = 12;

      const availW = Math.max(320, vw - padLeft - padRight);
      const availH = Math.max(240, vh - padTop - padBottom);

      // Seules les fenetres VISIBLES se partagent le bureau. Ranger en
      // comptant les fenetres reduites donnait a la seule fenetre affichee
      // un tiers de l'ecran, pour rien.
      const visibleWins = state.windows.filter((w) => !w.minimized);
      const count = visibleWins.length;
      if (count === 0) return state;
      const now = Date.now();

      const newPositions: { id: string; x: number; y: number; width: number; height: number }[] = [];

      if (count === 1) {
        const width = Math.min(920, availW);
        const height = Math.min(640, availH);
        const x = padLeft + Math.floor((availW - width) / 2);
        const y = padTop + Math.floor((availH - height) / 2);
        newPositions.push({ id: visibleWins[0].id, x, y, width, height });
      } else if (count === 2) {
        const width = Math.floor((availW - gap) / 2);
        const height = availH;
        newPositions.push({ id: visibleWins[0].id, x: padLeft, y: padTop, width, height });
        newPositions.push({ id: visibleWins[1].id, x: padLeft + width + gap, y: padTop, width, height });
      } else if (count === 3) {
        const leftWidth = Math.floor((availW - gap) * 0.54);
        const rightWidth = Math.floor((availW - gap) * 0.46);
        const rightHeight = Math.floor((availH - gap) / 2);

        newPositions.push({ id: visibleWins[0].id, x: padLeft, y: padTop, width: leftWidth, height: availH });
        newPositions.push({ id: visibleWins[1].id, x: padLeft + leftWidth + gap, y: padTop, width: rightWidth, height: rightHeight });
        newPositions.push({ id: visibleWins[2].id, x: padLeft + leftWidth + gap, y: padTop + rightHeight + gap, width: rightWidth, height: rightHeight });
      } else if (count === 4) {
        const colW = Math.floor((availW - gap) / 2);
        const rowH = Math.floor((availH - gap) / 2);

        newPositions.push({ id: visibleWins[0].id, x: padLeft, y: padTop, width: colW, height: rowH });
        newPositions.push({ id: visibleWins[1].id, x: padLeft + colW + gap, y: padTop, width: colW, height: rowH });
        newPositions.push({ id: visibleWins[2].id, x: padLeft, y: padTop + rowH + gap, width: colW, height: rowH });
        newPositions.push({ id: visibleWins[3].id, x: padLeft + colW + gap, y: padTop + rowH + gap, width: colW, height: rowH });
      } else {
        const cols = Math.ceil(Math.sqrt(count));
        const rows = Math.ceil(count / cols);
        const colW = Math.floor((availW - (cols - 1) * gap) / cols);
        const rowH = Math.floor((availH - (rows - 1) * gap) / rows);

        visibleWins.forEach((win, index) => {
          const c = index % cols;
          const r = Math.floor(index / cols);
          const x = padLeft + c * (colW + gap);
          const y = padTop + r * (rowH + gap);
          newPositions.push({ id: win.id, x, y, width: colW, height: rowH });
        });
      }

      const updatedWindows = state.windows.map((w) => {
        const pos = newPositions.find((p) => p.id === w.id);
        if (pos) {
          return {
            ...w,
            x: pos.x,
            y: pos.y,
            width: pos.width,
            height: pos.height,
            minimized: false,
            lastActive: now,
          };
        }
        return w;
      });

      return { windows: updatedWindows };
    }),

  toggleAutoOrganize: () => {
    const next = !get().isAutoOrganized;
    set({ isAutoOrganized: next });
    if (next) {
      get().organizeWindows();
    }
  },

  setAutoOrganize: (enabled) => {
    set({ isAutoOrganized: enabled });
    if (enabled) {
      get().organizeWindows();
    }
  },

  // Reduit automatiquement les fenetres inactives depuis +2 min
  autoMinimizeInactiveWindows: (thresholdMs = 120000) =>
    set((state) => {
      const now = Date.now();
      let maxZ = -1;
      state.windows.forEach((w) => {
        if (!w.minimized && w.z > maxZ) maxZ = w.z;
      });

      let changed = false;
      const updated = state.windows.map((w) => {
        if (
          !w.minimized &&
          w.z !== maxZ &&
          w.lastActive &&
          now - w.lastActive >= thresholdMs
        ) {
          changed = true;
          return { ...w, minimized: true };
        }
        return w;
      });

      return changed ? { windows: updated } : state;
    }),

  setPaletteOpen: (open) => set({ paletteOpen: open }),
  togglePalette: () => set({ paletteOpen: !get().paletteOpen }),
}));

// Sauvegarde la session a chaque changement de fenetres.
useWindows.subscribe((state) => {
  try {
    localStorage.setItem("nexus.session", JSON.stringify(state.windows));
  } catch {
    // Stockage indisponible : on ignore.
  }
});

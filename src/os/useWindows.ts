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

  setPaletteOpen: (open: boolean) => void;
  togglePalette: () => void;
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
    const windows = JSON.parse(raw) as OpenWindow[];
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
      if (existing) {
        return {
          zCounter: z,
          windows: state.windows.map((w) =>
            w.id === existing.id ? { ...w, z, minimized: false, lastActive: now } : w
          ),
        };
      }
      const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
      const vh = typeof window !== "undefined" ? window.innerHeight : 800;
      const width = Math.min(size?.width ?? 520, vw - 88);
      const height = Math.min(size?.height ?? 460, vh - 96);
      const offset = nextOffset(state.windows.length);
      const x = Math.max(8, Math.min(offset + 90, vw - width - 8));
      const y = Math.max(8, Math.min(offset, vh - height - 8));
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
  organizeWindows: () =>
    set((state) => {
      if (state.windows.length === 0) return state;

      const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
      const vh = typeof window !== "undefined" ? window.innerHeight : 800;

      const padTop = 46;
      const padBottom = 54;
      const padLeft = 16;
      const padRight = 16;
      const gap = 12;

      const availW = Math.max(320, vw - padLeft - padRight);
      const availH = Math.max(240, vh - padTop - padBottom);

      const visibleWins = state.windows;
      const count = visibleWins.length;
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

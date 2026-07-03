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
}

interface WindowsState {
  windows: OpenWindow[];
  zCounter: number;
  paletteOpen: boolean;
  openFileId: string | null;

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

  setPaletteOpen: (open: boolean) => void;
  togglePalette: () => void;
}

// Positionne chaque nouvelle fenetre legerement decalee pour un effet d'empilement.
function nextOffset(count: number) {
  return 60 + (count % 6) * 34;
}

// Restaure la session precedente : les fenetres ouvertes survivent au
// rechargement, comme dans un vrai systeme.
function loadSession(): { windows: OpenWindow[]; zCounter: number } {
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

  openApp: (appId, size) =>
    set((state) => {
      // Si l'app est deja ouverte, on la ramene simplement au premier plan.
      const existing = state.windows.find((w) => w.appId === appId);
      const z = state.zCounter + 1;
      if (existing) {
        return {
          zCounter: z,
          windows: state.windows.map((w) =>
            w.id === existing.id ? { ...w, z, minimized: false } : w
          ),
        };
      }
      // On borne la taille et la position a l'ecran : jamais de fenetre trop
      // grande ni hors-champ (essentiel sur tablette et telephone en paysage).
      const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
      const vh = typeof window !== "undefined" ? window.innerHeight : 800;
      const width = Math.min(size?.width ?? 520, vw - 88);
      const height = Math.min(size?.height ?? 460, vh - 96);
      const offset = nextOffset(state.windows.length);
      const x = Math.max(8, Math.min(offset + 90, vw - width - 8));
      const y = Math.max(8, Math.min(offset, vh - height - 8));
      const win: OpenWindow = {
        id: `${appId}-${Date.now()}`,
        appId,
        x,
        y,
        width,
        height,
        z,
        minimized: false,
      };
      return { zCounter: z, windows: [...state.windows, win] };
    }),

  // Ouvre un fichier dans la visionneuse (memorise l'id, puis ouvre l'app).
  openFile: (fileId) => {
    set({ openFileId: fileId });
    get().openApp("viewer", { width: 640, height: 560 });
  },

  closeWindow: (id) =>
    set((state) => ({ windows: state.windows.filter((w) => w.id !== id) })),

  focusWindow: (id) =>
    set((state) => {
      const z = state.zCounter + 1;
      return {
        zCounter: z,
        windows: state.windows.map((w) => (w.id === id ? { ...w, z } : w)),
      };
    }),

  moveWindow: (id, x, y) =>
    set((state) => ({
      windows: state.windows.map((w) => (w.id === id ? { ...w, x, y } : w)),
    })),

  resizeWindow: (id, width, height) =>
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id
          ? { ...w, width: Math.max(300, width), height: Math.max(220, height) }
          : w
      ),
    })),

  setBounds: (id, x, y, width, height) =>
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, x, y, width, height } : w
      ),
    })),

  toggleMinimize: (id) =>
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, minimized: !w.minimized } : w
      ),
    })),

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

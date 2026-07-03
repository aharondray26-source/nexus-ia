// Suivi d'activite discret et professionnel (pas de "flammes" facon jeu).
// On enregistre simplement les jours de visite et on restitue un bilan sobre :
// "voila ce que tu as fait". Tout reste dans le navigateur de chaque visiteur.

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

// A appeler une fois au demarrage : note la visite du jour.
export function recordVisit(): void {
  try {
    const days = readJson<string[]>("nexus.visitDays", []);
    const today = todayKey();
    if (!days.includes(today)) {
      days.push(today);
      localStorage.setItem("nexus.visitDays", JSON.stringify(days));
    }
    if (!localStorage.getItem("nexus.firstVisit")) {
      localStorage.setItem("nexus.firstVisit", JSON.stringify(today));
    }
  } catch {
    // Stockage indisponible : on ignore.
  }
}

export interface Activity {
  daysActive: number;
  memberSince: string | null;
  notes: number;
  tasksDone: number;
  tasksTotal: number;
  files: number;
}

// Construit le bilan a partir des donnees deja presentes (notes, taches...).
export function getActivity(): Activity {
  const days = readJson<string[]>("nexus.visitDays", []);
  const notes = readJson<unknown[]>("nexus.notes", []);
  const tasks = readJson<{ done?: boolean }[]>("nexus.tasks", []);
  const files = readJson<unknown[]>("nexus.files2", []);
  const first = readJson<string | null>("nexus.firstVisit", null);

  return {
    daysActive: days.length,
    memberSince: first,
    notes: notes.length,
    tasksDone: tasks.filter((t) => t.done).length,
    tasksTotal: tasks.length,
    files: files.length,
  };
}

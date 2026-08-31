import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initSliderFill } from "./lib/sliderFill";
import { runMigrations } from "./lib/migrations";
import { initNexusSync } from "./lib/nexusAccount";
import { useWindows } from "./os/useWindows";

// Ce que l'extension du navigateur peut demander au site, par l'adresse :
//   ?note=…   ajoute une note        ?tache=…  ajoute une tache
//   ?app=…    ouvre un espace
// La note et la tache passent ensuite par ton compte, donc elles arrivent
// partout : sur le site, sur le Mac, sur tes autres appareils.
function demandesDeLExtension() {
  try {
    const p = new URLSearchParams(window.location.search);
    const note = (p.get("note") || "").trim();
    const tache = (p.get("tache") || "").trim();
    const app = (p.get("app") || "").trim();
    if (!note && !tache && !app) return;

    const prevenir = (cle: string) =>
      window.dispatchEvent(new CustomEvent("nexus:persist-update", { detail: { key: cle } }));

    if (note) {
      const liste = JSON.parse(localStorage.getItem("nexus.notes") || "[]");
      liste.unshift({ id: `note-${Date.now()}`, title: note.slice(0, 40),
                      body: note, updatedAt: Date.now() });
      localStorage.setItem("nexus.notes", JSON.stringify(liste));
      prevenir("nexus.notes");
    }
    if (tache) {
      const liste = JSON.parse(localStorage.getItem("nexus.tasks") || "[]");
      liste.unshift({ id: `task-${Date.now()}`, text: tache, done: false });
      localStorage.setItem("nexus.tasks", JSON.stringify(liste));
      prevenir("nexus.tasks");
    }
    window.history.replaceState({}, "", window.location.pathname);
    const quoi = app || (tache ? "tasks" : "notes");
    window.setTimeout(() => {
      // Arrivee depuis l'extension : on ouvre EN GRAND. Une fenetre de
      // 620x480 perdue au milieu de l'ecran donnait l'impression que le
      // bouton n'avait rien fait.
      const vw = window.innerWidth, vh = window.innerHeight;
      const taille = { width: Math.min(1320, Math.round(vw * 0.88)),
                       height: Math.min(900, Math.round(vh * 0.86)) };
      try { useWindows.getState().openApp(quoi, taille); }
      catch { /* espace inconnu : on reste sur l'accueil */ }
    }, 700);
  } catch {
    // Stockage indisponible : on ignore.
  }
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

demandesDeLExtension();
runMigrations();
initSliderFill();
initNexusSync();

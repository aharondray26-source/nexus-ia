import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initSliderFill } from "./lib/sliderFill";
import { runMigrations } from "./lib/migrations";
import { initNexusSync } from "./lib/nexusAccount";
import { useWindows, tailleGrande } from "./os/useWindows";
import { getApp, APPS } from "./os/appsRegistry";
import { arrivee, vientDUnLien } from "./lib/arrivee";

// Ce que l'extension du navigateur peut demander au site, par l'adresse :
//   ?note=…   ajoute une note        ?tache=…  ajoute une tache
//   ?app=…    ouvre un espace
// La note et la tache passent ensuite par ton compte, donc elles arrivent
// partout : sur le site, sur le Mac, sur tes autres appareils.
function demandesDeLExtension() {
  try {
    // On lit la capture faite au chargement, pas l'adresse : elle a peut-etre
    // deja ete nettoyee.
    const { note, tache, app } = arrivee;
    if (!vientDUnLien()) return;

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
      const taille = tailleGrande(getApp(quoi));
      try {
        // On ecarte ce qui trainait de la session precedente : arriver par
        // « ouvre-moi les Notes » et tomber sur une pile de quatre fenetres
        // d'hier, ce n'est pas ce qu'on a demande.
        useWindows.getState().minimizeAll();
        useWindows.getState().openApp(quoi, taille);
      }
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

// Une petite porte, volontaire et etroite : ouvrir un espace depuis
// l'exterieur. Elle sert au banc d'essai (qui peut ainsi verifier les 45
// espaces un par un) et a l'application macOS, qui affiche le site dans une
// de ses fenetres et doit pouvoir lui demander quelque chose.
// On n'expose PAS le magasin entier : seulement ce qui est utile.
declare global {
  interface Window {
    nexus?: {
      ouvrir: (id: string) => void;
      espaces: () => string[];
      espacesConnus: () => string[];
    };
  }
}
window.nexus = {
  ouvrir(id: string) {
    useWindows.getState().openApp(id, tailleGrande(getApp(id)));
  },
  espaces: () => useWindows.getState().windows.map((w) => w.appId),
  // Tous les espaces existants, ouverts ou non : c'est par la que le banc
  // d'essai les passe en revue un par un.
  espacesConnus: () => APPS.map((a) => a.id),
};

demandesDeLExtension();
runMigrations();
initSliderFill();
initNexusSync();

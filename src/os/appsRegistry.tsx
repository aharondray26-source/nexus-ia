import type { ComponentType } from "react";
import AIHub from "../apps/AIHub";
import Notes from "../apps/Notes";
import Files from "../apps/Files";
import Dictionary from "../apps/Dictionary";
import Learn from "../apps/Learn";
import Mail from "../apps/Mail";
import Calculator from "../apps/Calculator";
import Tasks from "../apps/Tasks";
import Clock from "../apps/Clock";
import WebSearch from "../apps/WebSearch";
import Annales from "../apps/Annales";
import Weather from "../apps/Weather";
import Focus from "../apps/Focus";
import Settings from "../apps/Settings";
import Maps from "../apps/Maps";
import Links from "../apps/Links";
import Today from "../apps/Today";
import Whiteboard from "../apps/Whiteboard";
import ImageEditor from "../apps/ImageEditor";
import Calendar from "../apps/Calendar";
import OnThisDay from "../apps/OnThisDay";
import Converter from "../apps/Converter";
import Translator from "../apps/Translator";
import Game from "../apps/Game";
import Sheet from "../apps/Sheet";
import FileViewer from "../apps/FileViewer";
import About from "../apps/About";
import Changelog from "../apps/Changelog";
import VideoEditor from "../apps/VideoEditor";

export interface AppDefinition {
  id: string;
  title: string;
  icon: string;
  keywords: string;
  hue: string;
  hidden?: boolean;
  Component: ComponentType;
  width: number;
  height: number;
}

// Le catalogue de tous les espaces disponibles. Pour en ajouter un nouveau,
// il suffit de creer son composant et de l'inscrire ici.
export const APPS: AppDefinition[] = [
  { id: "today", title: "Aujourd'hui", icon: "today", hue: "#fbbf24", keywords: "accueil journee intention activite bilan", Component: Today, width: 420, height: 480 },
  { id: "ai", title: "Intelligences", icon: "ai", hue: "#a78bfa", keywords: "chatgpt claude gemini mistral ia", Component: AIHub, width: 460, height: 420 },
  { id: "notes", title: "Notes", icon: "notes", hue: "#f472b6", keywords: "ecrire texte document redaction", Component: Notes, width: 620, height: 460 },
  { id: "files", title: "Fichiers", icon: "files", hue: "#38bdf8", keywords: "documents depot glisser fichier", Component: Files, width: 460, height: 480 },
  { id: "annales", title: "Annales", icon: "annales", hue: "#f87171", keywords: "sujets brevet bac examen revision documents", Component: Annales, width: 480, height: 480 },
  { id: "learn", title: "Apprendre", icon: "learn", hue: "#34d399", keywords: "ecole cours lecon histoire sciences maths", Component: Learn, width: 500, height: 460 },
  { id: "dictionary", title: "Dictionnaire", icon: "dictionary", hue: "#22d3ee", keywords: "definition mot vocabulaire", Component: Dictionary, width: 460, height: 460 },
  { id: "translator", title: "Traducteur", icon: "translate", hue: "#60a5fa", keywords: "traduire langue anglais espagnol", Component: Translator, width: 440, height: 440 },
  { id: "web", title: "Recherche", icon: "search", hue: "#e879f9", keywords: "google chercher internet wikipedia", Component: WebSearch, width: 480, height: 480 },
  { id: "onthisday", title: "Ephemeride", icon: "history", hue: "#fb923c", keywords: "histoire ce jour anecdote culture", Component: OnThisDay, width: 460, height: 480 },
  { id: "maps", title: "Cartes", icon: "maps", hue: "#4ade80", keywords: "carte plan ville itineraire lieu", Component: Maps, width: 560, height: 480 },
  { id: "links", title: "Liens utiles", icon: "links", hue: "#94a3b8", keywords: "raccourcis sites acces rapide", Component: Links, width: 460, height: 480 },
  { id: "whiteboard", title: "Tableau blanc", icon: "whiteboard", hue: "#facc15", keywords: "dessin schema croquis excalidraw", Component: Whiteboard, width: 720, height: 520 },
  { id: "image", title: "Editeur d'image", icon: "image", hue: "#c084fc", keywords: "photo retouche montage photopea", Component: ImageEditor, width: 760, height: 540 },
  { id: "tasks", title: "Taches", icon: "tasks", hue: "#10b981", keywords: "todo liste faire", Component: Tasks, width: 420, height: 460 },
  { id: "calendar", title: "Calendrier", icon: "calendar", hue: "#fb7185", keywords: "mois date jour agenda", Component: Calendar, width: 400, height: 440 },
  { id: "calculator", title: "Calculatrice", icon: "calculator", hue: "#a3e635", keywords: "calcul math nombres", Component: Calculator, width: 320, height: 420 },
  { id: "sheet", title: "Tableur", icon: "table", hue: "#0ea5e9", keywords: "tableur feuille calcul excel cellules formules", Component: Sheet, width: 680, height: 500 },
  { id: "converter", title: "Convertisseur", icon: "convert", hue: "#2dd4bf", keywords: "devises monnaie unites longueur masse temperature", Component: Converter, width: 380, height: 440 },
  { id: "clock", title: "Horloge", icon: "clock", hue: "#818cf8", keywords: "heure minuteur chronometre concentration", Component: Clock, width: 380, height: 440 },
  { id: "weather", title: "Meteo", icon: "weather", hue: "#38bdf8", keywords: "temps ville temperature pluie soleil", Component: Weather, width: 420, height: 460 },
  { id: "focus", title: "Musique", icon: "music", hue: "#f43f5e", keywords: "musique concentration lofi ambiance son youtube", Component: Focus, width: 480, height: 520 },
  { id: "video", title: "Montage video", icon: "film", hue: "#fb7185", keywords: "video montage editeur capcut clip export", Component: VideoEditor, width: 720, height: 620 },
  { id: "game", title: "Arcade", icon: "game", hue: "#d946ef", keywords: "jeu neon arena serpent snake pause detente", Component: Game, width: 760, height: 600 },
  { id: "mail", title: "Contact", icon: "mail", hue: "#f59e0b", keywords: "email message ecrire", Component: Mail, width: 440, height: 440 },
  { id: "viewer", title: "Visionneuse", icon: "eye", hue: "#38bdf8", hidden: true, keywords: "ouvrir fichier apercu image pdf", Component: FileViewer, width: 640, height: 560 },
  { id: "changelog", title: "Nouveautes", icon: "star", hue: "#fbbf24", keywords: "nouveautes mises a jour changelog evolution", Component: Changelog, width: 460, height: 500 },
  { id: "about", title: "A propos", icon: "info", hue: "#94a3b8", keywords: "a propos infos contact partager qui pourquoi", Component: About, width: 440, height: 520 },
  { id: "settings", title: "Personnalisation", icon: "settings", hue: "#a1a1aa", keywords: "reglages couleur accent prenom theme fond", Component: Settings, width: 420, height: 480 },
];

export function getApp(id: string): AppDefinition | undefined {
  return APPS.find((a) => a.id === id);
}

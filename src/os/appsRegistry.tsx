import type { ComponentType } from "react";
import AIHub from "../apps/AIHub";
import ChessGame from "../apps/ChessGame";
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
import QRCodeApp from "../apps/QRCodeApp";
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
import MacIntegration from "../apps/MacIntegration";
import Changelog from "../apps/Changelog";
import VideoEditor from "../apps/VideoEditor";
import Recipes from "../apps/Recipes";
import Deals from "../apps/Deals";
import News from "../apps/News";
import Terminal from "../apps/Terminal";
import Soundscapes from "../apps/Soundscapes";
import Playground from "../apps/Playground";
import Docs from "../apps/Docs";
import SpectrePolitique from "../apps/SpectrePolitique";
import Compass from "../apps/Compass";
import NexusChatPro from "../apps/NexusChatPro";
import PdfStudio from "../apps/PdfStudio";
import NexusCloud from "../apps/NexusCloud";
import NexusMessages from "../apps/NexusMessages";

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
  // --- Groupe 1 : Travail & Productivité Principale ---
  { id: "nexus-chat", title: "Nexus IA Studio & Chat", icon: "ai", hue: "#3abef8", keywords: "nexus chat pro ia studio intelligence assistant conversation historique multimédia", Component: NexusChatPro, width: 920, height: 640 },
  { id: "cloud", title: "Nexus Cloud & Compte Google", icon: "cloud", hue: "#3fbbf3", keywords: "cloud drive google compte sauvegarde synchro stockage documents", Component: NexusCloud, width: 780, height: 580 },
  { id: "messages", title: "Messagerie Instantanée", icon: "message", hue: "#39ddf9", keywords: "messagerie tchat chat instantane message contacts discuter equipe", Component: NexusMessages, width: 820, height: 580 },
  { id: "docs", title: "Documents (Docs & Word)", icon: "docs", hue: "#3c83f6", keywords: "google docs word document texte traitement ecrire page rapport a4", Component: Docs, width: 780, height: 580 },
  { id: "sheet", title: "Tableur (Excel & Sheets)", icon: "table", hue: "#3fbbf3", keywords: "tableur feuille calcul excel cellules formules", Component: Sheet, width: 680, height: 500 },
  { id: "pdf", title: "PDF Studio & Convertisseur", icon: "pdf", hue: "#ef4444", keywords: "pdf word convertir fusionner diviser compresser ilovepdf document ocr filigrane", Component: PdfStudio, width: 800, height: 600 },
  { id: "links", title: "Liens Utiles Travail", icon: "links", hue: "#3c83f6", keywords: "liens travail raccourcis outils portail google docs github deepl", Component: Links, width: 760, height: 560 },
  { id: "qrcode", title: "QR Code Studio & Scanner", icon: "qrcode", hue: "#3abef8", keywords: "qr code scan flash scanner webcam lien vcard wifi importer image", Component: QRCodeApp, width: 740, height: 580 },
  { id: "files", title: "Fichiers & Explorer", icon: "files", hue: "#3abef8", keywords: "documents depot glisser fichier", Component: Files, width: 460, height: 480 },
  { id: "notes", title: "Notes & Idées", icon: "notes", hue: "#f471b6", keywords: "ecrire texte document redaction", Component: Notes, width: 620, height: 460 },
  { id: "tasks", title: "Gestionnaire de Tâches", icon: "tasks", hue: "#43efb6", keywords: "todo liste faire projet", Component: Tasks, width: 420, height: 460 },
  { id: "calendar", title: "Calendrier & Agenda", icon: "calendar", hue: "#fb6a7f", keywords: "mois date jour agenda", Component: Calendar, width: 400, height: 440 },
  { id: "ai", title: "Hub Intelligences IA", icon: "ai", hue: "#906cf9", keywords: "chatgpt claude gemini mistral ia", Component: AIHub, width: 460, height: 420 },
  { id: "mail", title: "Boîte Mail & Google Gmail", icon: "mail", hue: "#f7b13b", keywords: "email mail gmail google boite reception message ecrire contact recevoir envoyer", Component: Mail, width: 840, height: 600 },
  { id: "playground", title: "Bac à sable & Test Code", icon: "playground", hue: "#3abef8", keywords: "bac a sable test code apercu direct rendu html web studio preview", Component: Playground, width: 780, height: 560 },
  { id: "terminal", title: "Terminal CLI", icon: "terminal", hue: "#50e286", keywords: "terminal console commande bash dev hacker shell", Component: Terminal, width: 620, height: 440 },

  // --- Groupe 2 : Médias Impressionnants, Actualités & Culture ---
  { id: "video", title: "Studio Montage Vidéo", icon: "film", hue: "#fb6a7f", keywords: "video montage editeur capcut clip export", Component: VideoEditor, width: 720, height: 620 },
  { id: "spectre", title: "Boussole Politique", icon: "spectrum", hue: "#ec4899", keywords: "gauche droite politique boussole parti ideologie opinion spectre", Component: SpectrePolitique, width: 620, height: 520 },
  { id: "news", title: "Actualités & Football", icon: "news", hue: "#3c83f6", keywords: "actu infos foot football scores direct ligue des champions journal", Component: News, width: 680, height: 520 },
  { id: "soundscapes", title: "Ambiances Audio Synth", icon: "soundscapes", hue: "#39ddf9", keywords: "bruit blanc pluie vagues ambiance musique concentration relaxation audio", Component: Soundscapes, width: 540, height: 440 },
  { id: "learn", title: "Apprendre & Savoirs", icon: "learn", hue: "#50e2ad", keywords: "ecole cours lecon histoire sciences maths", Component: Learn, width: 500, height: 460 },
  { id: "annales", title: "Revisions", icon: "annales", hue: "#f86d6d", keywords: "sujets brevet bac examen revision documents", Component: Annales, width: 480, height: 480 },
  { id: "onthisday", title: "Ephemeride", icon: "history", hue: "#fb923c", keywords: "histoire ce jour anecdote culture", Component: OnThisDay, width: 460, height: 480 },
  { id: "web", title: "Recherche Web", icon: "search", hue: "#e66df8", keywords: "google chercher internet wikipedia", Component: WebSearch, width: 480, height: 480 },
  { id: "recipes", title: "Recettes & Gastronomie", icon: "recipe", hue: "#43efb6", keywords: "recette cuisine manger plat chef nourriture petit dejeuner diner", Component: Recipes, width: 680, height: 520 },
  { id: "deals", title: "Bons Plans & Comparateur", icon: "deal", hue: "#a855f7", keywords: "bon plan produit prix promo reduction comparateur achat shopping", Component: Deals, width: 680, height: 520 },

  // --- Groupe 3 : Outils Créatifs & Utilitaires ---
  { id: "maps", title: "Cartes & Géographie (Maps)", icon: "maps", hue: "#50e286", keywords: "carte maps geographie ville lieu itineraire gps openstreetmap", Component: Maps, width: 840, height: 600 },
  { id: "compass", title: "Boussole Topographie", icon: "compass", hue: "#39ddf9", keywords: "boussole cap orientation nord gps inclinaison altitude", Component: Compass, width: 440, height: 480 },
  { id: "whiteboard", title: "Tableau Blanc", icon: "whiteboard", hue: "#fbd337", keywords: "dessin schema croquis excalidraw", Component: Whiteboard, width: 720, height: 520 },
  { id: "image", title: "Éditeur d'Image", icon: "image", hue: "#b26afb", keywords: "photo retouche montage photopea", Component: ImageEditor, width: 760, height: 540 },
  { id: "calculator", title: "Calculatrice", icon: "calculator", hue: "#ace949", keywords: "calcul math nombres", Component: Calculator, width: 320, height: 420 },
  { id: "converter", title: "Convertisseur d'Unités", icon: "convert", hue: "#50e2d0", keywords: "devises monnaie unites longueur masse temperature", Component: Converter, width: 380, height: 440 },
  { id: "translator", title: "Traducteur Universel", icon: "translate", hue: "#60a5fa", keywords: "traduire langue anglais espagnol", Component: Translator, width: 440, height: 440 },
  { id: "dictionary", title: "Dictionnaire", icon: "dictionary", hue: "#42d9f0", keywords: "definition mot vocabulaire", Component: Dictionary, width: 460, height: 460 },
  { id: "weather", title: "Météo Directe", icon: "weather", hue: "#3abef8", keywords: "temps ville temperature pluie soleil", Component: Weather, width: 420, height: 460 },
  { id: "clock", title: "Horloge & Chrono", icon: "clock", hue: "#6e7bf7", keywords: "heure minuteur chronometre concentration", Component: Clock, width: 380, height: 440 },
  { id: "today", title: "Tableau de Bord du Jour", icon: "today", hue: "#fbc437", keywords: "accueil journee intention activite bilan", Component: Today, width: 420, height: 480 },

  // --- Groupe 4 : Divertissement & Système ---
  { id: "chess", title: "Echecs", icon: "chess", hue: "#7babea", keywords: "echecs chess jeu strategie plateau", Component: ChessGame, width: 620, height: 620 },
  { id: "game", title: "Arcade & Échecs", icon: "game", hue: "#d946ef", keywords: "echecs chess jeu neon arena serpent snake pause detente", Component: Game, width: 760, height: 620 },
  { id: "focus", title: "Musique & Détente", icon: "music", hue: "#f43f5e", keywords: "musique concentration lofi ambiance son youtube", Component: Focus, width: 480, height: 520 },
  { id: "mac", title: "Nexus sur ton Mac", icon: "settings", hue: "#84b6cd", keywords: "mac macos fond ecran wallpaper extension widget bureau integration", Component: MacIntegration, width: 560, height: 640 },
  { id: "settings", title: "Paramètres & Thème", icon: "settings", hue: "#6565e6", keywords: "reglages couleur accent prenom theme fond", Component: Settings, width: 420, height: 480 },
  { id: "changelog", title: "Nouveautés OS", icon: "star", hue: "#fbc437", keywords: "nouveautes mises a jour changelog evolution", Component: Changelog, width: 460, height: 500 },
  { id: "about", title: "À propos", icon: "info", hue: "#669be6", keywords: "a propos infos contact partager qui pourquoi", Component: About, width: 440, height: 520 },

  // Cachés / Système
  { id: "viewer", title: "Visionneuse", icon: "eye", hue: "#3abef8", hidden: true, keywords: "ouvrir fichier apercu image pdf", Component: FileViewer, width: 640, height: 560 },
];

export function getApp(id: string): AppDefinition | undefined {
  return APPS.find((a) => a.id === id);
}

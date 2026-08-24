# RAPPORT TECHNIQUE ET ARCHITECTURAL DÉTAILLÉ : NEXUS OS
**Projet :** Nexus OS - Environnement Web Desktop OS (React 19 + Express + Vite + Gemini AI)  
**Destinataire :** Claude AI / Claude Code / Équipe de Développement  
**Auteur :** Assistant IA (Google AI Studio)  
**Dernière mise à jour :** Août 2026  

---

## 📌 1. INTRODUCTION & DIRECTIVES POUR CLAUDE CODE

Cher Claude / Claude Code,

Ce document synthétise **chaque modification visuelle et algorithmique**, la structure complète des fichiers, l'architecture du serveur et du client, ainsi que les instructions étape par étape pour utiliser, faire évoluer ou déployer ce projet sur n'importe quelle plateforme (Netlify, Cloud Run, Vercel, Render, Tauri).

---

## 🚀 2. DÉPLOIEMENT SIMPLE ET COMPATIBILITÉ STASTIQUE (NETLIFY DROP)

Le projet **Nexus OS** est conçu avec une **architecture hybride** : il fonctionne aussi bien avec un serveur Node.js/Express qu'en **mode 100% statique (Client-Side PWA)** pour un déploiement instantané par glisser-déposer.

### 📦 Procédure pour déployer sur Netlify (Glisser-Déposer) :
1. Téléchargez ou décompressez le fichier `.ZIP` du projet.
2. Exécutez dans le terminal :
   ```bash
   npm install
   npm run build
   ```
3. Le dossier de sortie `dist/` contient l'ensemble du site compilé et optimisé.
4. Déposez simplement le dossier `dist/` sur **[app.netlify.com/drop](https://app.netlify.com/drop)**.

---

## 🧠 3. ARCHITECTURE IA : NEXUS AI PRO (PUISSANCE GEMINI 3.6 & 3.5 FLASH)

Pour garantir que **Nexus AI Pro** conserve **100% de la puissance, de la rapidité d'exécution et de l'étendue des connaissances de Gemini 3.5 / 3.6 Flash**, l'IA repose sur un pipeline à 3 niveaux :

1. **Priorité 1 - Serveur Backend Express (`/api/gemini/chat`) :**
   - Utilise le SDK officiel `@google/genai` avec le modèle `gemini-3.6-flash`.
   - Intègre la recherche Google en temps réel (Search Grounding) et des règles d'expertise en mathématiques, code, littérature et cyber-sécurité.
2. **Priorité 2 - Clé API Cliente (`queryNexusAI` dans `src/lib/nexusBrain.ts`) :**
   - Si le site est hébergé en statique sur Netlify sans serveur Node, l'utilisateur peut renseigner sa clé API Gemini dans l'application *Personnalisation (Settings)*.
   - L'application communique directement avec l'API Google Gemini 1.5/3.5 Flash depuis le navigateur de l'utilisateur.
3. **Priorité 3 - Cerveau Local de Secours (Offline / Sans Clé) :**
   - Analyseur de syntaxe mathématique autonome (calcul direct d'expressions).
   - Base de connaissances sur Nexus OS, la cyber-sécurité, le développement Web, et les exercices scolaires.

---

## 💻 4. DÉTAIL DES MODIFICATIONS ET NOUVELLES FONCTIONNALITÉS

Voici le registre exhaustif des modifications visuelles, ergonomiques et techniques apportées au projet :

### A. Barre Latérale / Dock Interactif (`src/os/Dock.tsx`)
- **Évolution Ergonomique :** Passage d'un survol purement CSS (`group-hover/dock`) à un contrôle d'état React réactif (`onMouseEnter` / `onMouseLeave`).
- **Expansion Fluide :** La barre s'élargit en douceur de `16` (64px) à `60` (240px) au survol de la souris.
- **Header Marque OS :** Affichage dynamique du Logo et du titre "NEXUS PRO OS - Workspace Pro".

### B. Bulle et Avatar Rétro 8-Bit Pixel Art (`src/os/NexusAssistant.tsx` & `public/avatar.jpg`)
- **Avatar Rétro Generated :** Création d'un avatar Pixel Art rétro 8-bit représentant le robot assistant Nexus en tons Cyan et Bleu foncé.
- **Intégration Visuelle :** L'avatar s'affiche dans le bouton flottant de l'Assistant Nexus lorsque des fenêtres sont actives ou réduites.

### C. Application Terminal CLI (`src/apps/Terminal.tsx`)
- **Nouveau Composant :** Fenêtre d'invite de commandes interactive pour développeurs et passionnés.
- **Commandes Intégrées :**
  - `help` : Affiche la liste des commandes système.
  - `sysinfo` : Affiche l'état du noyau Nexus OS, le mode d'exécution et l'uptime.
  - `ls` / `dir` : Liste toutes les applications installées dans le registre.
  - `open <app_id>` : Ouvre directement une application du système.
  - `ai <question>` : Interroge l'intelligence artificielle Nexus AI Pro en ligne de commande.
  - `theme <cyan|matrix|amber|violet>` : Bascule l'ambiance visuelle du terminal.
  - `matrix` : Déclenche l'animation binaire du code Matrix.
  - `whoami`, `date`, `clear`.

### D. Application Ambiances Audio & Soundscapes (`src/apps/Soundscapes.tsx`)
- **Générateur Audio Native Web Audio API :** Aucune dépendance à des fichiers MP3 externes lourds.
- **Sons d'ambiance synthétisés en temps réel :**
  - Pluie & Orage doux (bruit rose filtré passe-bas).
  - Vagues de l'Océan (bruit filtré passe-bande).
  - Cosmos & Deep Focus (drone de synthétiseur onde triangle).
  - Ondes Theta 6Hz (fréquences binaurales pour la méditation et la concentration).
  - Bruit blanc étude café.
- **Contrôle du volume** et indicateur d'état actif.

### E. Exportation Live du Code .ZIP et Rapport .MD (`server.ts` & `Settings.tsx`)
- **Bouton de téléchargement instantané :** Dans la barre du haut (`TopBar.tsx`) et dans l'application *Personnalisation (Settings)*.
- **Génération ZIP dynamique :** Route Express `GET /api/export-zip` qui utilise la bibliothèque `archiver` pour zipper tout le projet sans inclure `node_modules` ni `dist`.
- **Téléchargement du Rapport :** Route Express `GET /api/download-rapport`.

---

## 📂 5. CARTOGRAPHIE COMPLÈTE DU CODE SOURCE

```
/
├── server.ts                 # Serveur Express (Gemini 3.6 API, Export ZIP, Rapport MD, Vite Middleware)
├── vite.config.ts            # Configuration Vite (React 19, Tailwind CSS v4, PWA Plugin)
├── index.html                # Point d'entrée HTML + méta-tags SEO + PWA Manifest
├── package.json              # Script dev, build, start et dépendances
├── RAPPORT_TECHNIQUE_NEXUS_OS.md # Ce document exhaustif
├── public/
│   ├── avatar.jpg            # Avatar Pixel Art 8-bit du robot Nexus IA
│   ├── site.webmanifest      # Manifeste PWA pour installation mobile/desktop
│   └── favicon.png / .svg    # Favicons
└── src/
    ├── main.tsx & App.tsx    # Point d'entrée React
    ├── lib/
    │   ├── nexusBrain.ts     # Cerveau IA Hybride (API Gemini 3.6 + Client Key + Fallback Autonome)
    │   ├── tauri.ts          # Abstraction pour exécution en application de bureau native Tauri
    │   ├── activity.ts       # Historique et bilan de visites locales
    │   └── useIsMobile.ts    # Détection des terminaux mobiles
    ├── os/
    │   ├── Desktop.tsx       # Bureau principal avec arrière-plans dynamiques
    │   ├── TopBar.tsx        # Barre supérieure (Horloge, Recherche Cmd+K, Bouton .ZIP Live)
    │   ├── Dock.tsx          # Barre latérale réactive au survol (w-16 -> w-60)
    │   ├── NexusAssistant.tsx# Assistant IA flottant avec avatar Pixel Art
    │   ├── Window.tsx        # Fenêtres déplaçables et redimensionnables
    │   ├── Icons.tsx         # Collection d'icônes SVG monochromes et réactives
    │   ├── appsRegistry.tsx  # Catalogue central de toutes les applications
    │   ├── useWindows.ts     # Store Zustand de gestion des fenêtres
    │   └── useSettings.ts    # Store Zustand de personnalisation visuelle
    └── apps/                 # 30+ Applications desktop
        ├── Terminal.tsx      # Terminal CLI interactif (sysinfo, ai, open, matrix, theme)
        ├── Soundscapes.tsx   # Générateur audio Web Audio API pour concentration
        ├── Settings.tsx      # Paramètres système + Clé Gemini API + Export ZIP & MD
        ├── Mail.tsx          # Application Message & Contact
        ├── AIHub.tsx         # Hub des moteurs IA
        ├── Notes.tsx, Tasks.tsx, Whiteboard.tsx, Files.tsx, Calculator.tsx, etc.
```

---

## 🛠️ 6. COMMANDES DE DÉVELOPPEMENT & PRODUCTION

- **Mode Développement :**
  ```bash
  npm run dev
  ```
- **Build de Production :**
  ```bash
  npm run build
  ```
- **Lancement du Serveur de Production :**
  ```bash
  npm start
  ```

---
*Ce rapport garantit une transmission de contexte sans effort de compréhension pour Claude AI ou tout autre développeur.*

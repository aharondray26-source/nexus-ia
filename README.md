# Nexus IA

Hub de productivité unifié : ChatGPT + Claude côte à côte, flux anti-ennui « Curiosité Infinie », gestionnaire de fichiers par glisser-déposer, nœud de contact e-mail, raccourcis clavier — le tout en thème sombre premium. Web (dev) + Bureau (Tauri).

## Ce qui marche, et les limites honnêtes

| Pilier | Navigateur (dev) | App bureau (Tauri) |
|---|---|---|
| Split-screen ChatGPT / Claude | Repli : bouton « Ouvrir » (l'iframe est **bloquée** par ces sites) | Vraies fenêtres natives, sites chargés sans restriction |
| Curiosité Infinie (`Cmd/Ctrl+K`) | ✅ (API Wikipedia + repli local) | ✅ |
| Nœud e-mail contextuel | ✅ (ouvre Gmail composer) | ✅ |
| Glisser-déposer de fichiers | ✅ | ✅ |
| `Option+Espace` global (système) | ❌ (impossible en web) | ✅ (enregistré côté Rust) |

> **Pourquoi pas d'iframe ?** `chatgpt.com` et `claude.ai` envoient `X-Frame-Options`/`CSP frame-ancestors`. Aucun site web ne peut les embarquer en iframe. La version bureau les charge dans des **webviews natives**, ce qui est la seule méthode réelle.

## Prérequis (à installer une fois)

Ta machine n'a actuellement **ni Node.js ni Rust**. Installe-les :

1. **Node.js** (≥ 18) : https://nodejs.org → télécharge la version LTS, installe.
2. **Rust** (pour la version bureau uniquement) : https://www.rust-lang.org/tools/install
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

Vérifie ensuite dans un terminal :
```bash
node -v && npm -v && cargo -V
```

## Lancer en mode Web (rapide, pour voir l'interface)

```bash
cd ~/Desktop/nexus-ia
npm install
npm run dev
```
Ouvre l'URL affichée (http://localhost:1420).

## Lancer en mode Bureau (Tauri — vraies IA côte à côte)

```bash
cd ~/Desktop/nexus-ia
npm install

# Génère les icônes requises à partir de n'importe quelle image PNG carrée :
npx @tauri-apps/cli icon ./mon-logo.png

npm run tauri dev
```

Construire l'exécutable final :
```bash
npm run tauri build
```

## Raccourcis

- `Cmd+K` / `Ctrl+K` — ouvre/ferme le panneau Curiosité Infinie
- `Option+Espace` / `Alt+Espace` — masque/affiche l'application (global en mode bureau)

## Structure

```
src/
  App.tsx                      Assemble les piliers + raccourcis
  store/useStore.ts            État global Zustand
  hooks/useGlobalShortcuts.ts  Cmd+K, Option+Espace
  lib/tauri.ts                 Détection Tauri + ouverture de fenêtres
  components/
    AISplitView.tsx / AIPane.tsx   Split-screen IA
    CuriosityDashboard.tsx         Flux anti-ennui
    SocialEmailNode.tsx            Bouton + modale e-mail
    FileDropZone.tsx               Glisser-déposer
src-tauri/                     Couche bureau Rust (fenêtres, raccourci système)
```

## Réglages utiles

- **Changer l'adresse e-mail** : `src/components/SocialEmailNode.tsx`, constante `TARGET_EMAIL`.
- **Aller plus loin (vraies webviews intégrées dans la grille, pas en fenêtres séparées)** : Tauri 2 propose le multi-webview (fonctionnalité `unstable`) pour positionner deux webviews enfants par-dessus les zones `data-pane`. C'est l'étape d'amélioration suivante une fois la base lancée.
```

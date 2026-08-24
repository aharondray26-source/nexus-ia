# Fusion AI Studio — ce que j'ai fait, et ce que j'ai noté

## 1. Décisions de fusion (améliorations vs régressions)

AI Studio est parti d'un dépôt GitHub périmé. J'ai comparé chaque fichier :

| Fichier | Décision | Raison |
|---|---|---|
| `public/arcade.html` | **Ma version** | Contient tout AI Studio (améliorations roguelite) **+ le jeu 2048** |
| `src/apps/Sheet.tsx` | **Ma version** | Contient tout AI Studio **+ import/export CSV** |
| `src/apps/Changelog.tsx` | **Ma version** | Mêmes entrées **+ « Prochainement »** |
| `src/os/QuickCapture.tsx` | **Restauré** | Absent chez AI Studio (capture rapide note/tâche) |
| `src/apps/Mail.tsx` | **AI Studio** | Gmail réel (906 lignes) > mon formulaire (176) |
| `QRCode` / `QRCodeApp` | **AI Studio** | Éviter le doublon |
| Tout le reste | **AI Studio** | Nouveau ou plus avancé |

## 2. Bugs corrigés

- **Échecs (`ChessGame`)** : le fichier existait mais n'était **jamais enregistré** → l'app était inaccessible. Corrigé.
- **Éphéméride (`OnThisDay`)** : présente dans notre site, **disparue du registre** chez AI Studio → régression. Restaurée.
- **« Annales »** → renommé **« Révisions »**.
- **Script `build`** : incluait le bundling du serveur, ce qui cassait le déploiement statique Netlify. `build` = site statique ; `build:server` = version serveur.

## 3. ⚠️ Entorses à nos principes (notées, NON corrigées, comme demandé)

### a) Architecture : le site n'est plus purement statique
AI Studio ajoute un **serveur Node/Express** (`server.ts`) avec 11 routes (`/api/gemini/*`, `/api/mail`…).
Netlify gratuit ne fait **que du statique**. Conséquence : ces routes renverront 404 en ligne.
**Filet de sécurité existant** : `nexusBrain.ts` bascule automatiquement sur la clé Gemini de l'utilisateur (bouton « Clé API » dans l'app), puis sur un moteur local. Donc **ça marche quand même**, mais l'architecture est double et confuse.
*Ce que j'aurais fait :* soit tout passer en Netlify Functions, soit assumer le 100 % client avec clé utilisateur, mais pas les deux.

### b) Épuration : le site s'est densifié
De 30 à **43 applications**, une barre du haut chargée (Nexus Control Pro, Cloud, Clair, Code ZIP, +, Recherche), un assistant flottant, une « Dynamic Island », des dégradés violet/rose très marqués.
*Ce que j'aurais fait :* regrouper les 43 apps en catégories, alléger la barre du haut à 3 éléments max, et garder les dégradés pour les accents seulement.

### c) Secrets exposés
`firebase-applet-config.json` contient une **clé API Firebase en clair** dans un dépôt public. (Les clés web Firebase sont semi-publiques par design, mais il faut **verrouiller les règles de sécurité Firebase**, sinon n'importe qui peut lire/écrire ta base.)
*À faire :* vérifier les règles Firestore/Storage dans la console Firebase.

### d) Modèles Gemini possiblement inexistants
`nexusBrain.ts` essaie `gemini-3.6-flash`, `gemini-3.5-flash`, `gemini-3.5-pro`… Ces noms **n'existent probablement pas**. Le dernier de la liste (`gemini-flash-latest`) devrait fonctionner. À tester avec une vraie clé.

### e) Poids
Le fichier principal fait **3,4 Mo** (1 Mo compressé) — lourd pour un premier chargement, surtout en 4G.
*Ce que j'aurais fait :* découper en morceaux chargés à la demande (code-splitting).

### f) Perdu dans la fusion
- **Formspree** (envoi de message réel depuis le formulaire Contact) — remplacé par le Gmail réel d'AI Studio, qui ne fait pas la même chose.
- **Le nom « Nexus »** est devenu « Nexus OS Pro » à certains endroits — incohérence à trancher.

## 4. Reste à faire
- Pousser sur GitHub (via GitHub Desktop).
- Publier `dist` sur Netlify.
- Tester les fonctions IA avec une vraie clé Gemini.

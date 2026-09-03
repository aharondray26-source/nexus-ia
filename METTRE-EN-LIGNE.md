# Mettre Nexus en ligne — et le rendre intelligent pour tout le monde

> À faire **une seule fois**. Ensuite, un `git push` suffit pour toujours,
> et **plus personne n'a jamais rien à faire** : ni clé, ni compte, ni
> téléchargement, ni Ollama.

---

## Pourquoi ça ne marchait pas jusqu'ici

Le site a **deux moitiés** :

| | |
|---|---|
| **le visuel** | les pages, les espaces, le jeu — le dossier `dist` |
| **l'intelligence** | le modèle, qui répond aux questions — `netlify/functions/` |

En **glissant le dossier `dist`** sur Netlify, tu ne publiais que **la première
moitié**. L'intelligence restait sur ton Mac. C'est pour ça que le site en
ligne réclamait une clé à chaque visiteur : il n'avait personne à qui parler.

Et une deuxième cause, invisible : le fichier des renvois envoyait **tout**
vers la page d'accueil, y compris l'adresse du modèle. Le site demandait une
réponse et recevait sa propre page d'accueil.

Les deux sont corrigées. Il reste à **publier les deux moitiés ensemble**.

---

## 1. Relier Netlify à GitHub (une fois, ~2 minutes)

C'est ce qui remplace le glisser-déposer. Ensuite tout part ensemble.

1. Envoie le code :
   ```bash
   cd ~/Desktop/nexus-ia && git push
   ```
2. Sur **app.netlify.com**, ouvre ton site **nexus-espace**.
3. **Site configuration → Build & deploy → Continuous deployment**
   → **Link to a Git repository** → GitHub → `aharondray26-source/nexus-ia`.
4. Netlify lit `netlify.toml` et remplit tout seul :
   *Build command* `npm run build` · *Publish* `dist` · *Functions* `netlify/functions`.
   Ne change rien.

> Si tu préfères ne pas relier GitHub, l'autre chemin est le terminal :
> ```bash
> cd ~/Desktop/nexus-ia && npx netlify-cli deploy --prod
> ```
> (il demandera de te connecter la première fois). Le glisser-déposer, lui,
> ne publiera **jamais** l'intelligence.

---

## 2. Donner **ta** clé au site (une fois, ~1 minute)

C'est **ta** clé, posée **une seule fois sur le serveur**. Les visiteurs ne la
voient jamais, ne la saisissent jamais, et n'ont rien à faire.

1. Netlify → **Site configuration → Environment variables → Add a variable**
2. *Key* : `GEMINI_API_KEY` — *Value* : ta clé Google AI Studio
3. *Scopes* : laisse **All scopes**. **Deploy contexts** : **All**.
4. **Deploys → Trigger deploy → Deploy site**

Nexus accepte aussi, si tu préfères : `GROQ_API_KEY`, `OPENAI_API_KEY`,
`MISTRAL_API_KEY`, `OPENROUTER_API_KEY`. La première trouvée gagne.

> **Ta clé ne part jamais sur GitHub** : elle vit uniquement dans les réglages
> de Netlify. Ne la colle jamais dans un fichier du projet.

---

## 3. Vérifier que c'est vraiment branché

Ouvre dans le navigateur :

    https://nexus-espace.netlify.app/api/health

- `"modeleEnLigne": true` → **c'est bon.** Le site est intelligent pour tout
  le monde ; il ne proposera plus jamais de télécharger quoi que ce soit.
- `"modeleEnLigne": false` → la clé n'est pas arrivée : reprends l'étape 2 et
  redéploie.
- Une page d'accueil au lieu d'un texte → le déploiement n'a pas pris les
  fonctions : reprends l'étape 1.

---

## Ce qui se passe ensuite, tout seul

Quand quelqu'un pose une question, Nexus essaie dans cet ordre, **sans jamais
rien demander** :

1. **le modèle en ligne** (ta clé, sur le serveur) — le cas normal ;
2. le modèle installé sur *sa* machine, s'il en a déjà un ;
3. **le modèle du navigateur** : téléchargé tout seul, une fois, et ensuite
   il répond même sans internet.

Le seul cas où Nexus ne peut rien : quelqu'un **sans connexion du tout** qui
n'a encore jamais utilisé Nexus. Il le dit en une phrase, sans rien réclamer.

---

## Avant chaque mise en ligne

```bash
cd ~/Desktop/nexus-ia && ./outils/avant-de-publier.sh
```

Elle répond **TU PEUX PUBLIER** ou dit exactement ce qui manque.

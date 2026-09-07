# Nexus pour Windows

Tout ce que fait le site, **plus ce qu'un site n'a pas le droit de faire** :
ouvrir tes applications, retrouver un fichier n'importe où sur le disque, lire
l'écran, écrire des automatisations, fermer ce qui te distrait.

---

## Le cœur : Alt + Espace

Windows n'a pas d'équivalent de Spotlight. Le menu Démarrer cherche, mais il met
une seconde et demie, il propose du web qu'on n'a pas demandé, et il ne répond à
aucune question.

**Alt + Espace** ouvre Nexus par-dessus tout — un jeu, un cours en visio — et on
lui demande n'importe quoi :

| Ce que tu tapes | Ce qui arrive |
|---|---|
| `devoir de maths` | le fichier, où qu'il soit sur le disque |
| `word` | l'application s'ouvre |
| un titre de fenêtre | tu bascules dessus |
| `explique-moi les dérivées` | il répond, dans la barre |
| `= 17*34` | le calcul, tout de suite |

Le même geste referme. Nexus reste près de l'horloge : c'est ce qui le rend
instantané.

---

## Ce qu'elle a de plus que l'application Mac

Ce ne sont pas des oublis côté Mac : ce sont des choses que **macOS interdit** à
une application non signée par Apple, et que Windows accorde sans rien demander.

- **Chercher dans le CONTENU** de tous tes documents. Windows tient un index de
  ce que contiennent tes fichiers Word, PDF et texte. « quel document parle de la
  photosynthèse ? » répond tout de suite. Sur Mac il faut accorder « Accès
  complet au disque » dans les Réglages Système.
- **« Analyser avec Nexus » au clic droit**, dans l'Explorateur, sur n'importe
  quel fichier et n'importe quel dossier.
- **Des automatisations qui s'installent vraiment.** Sur Mac, Apple impose un
  clic humain sur « Ajouter le raccourci ». Ici, la mascotte écrit le script,
  **le relit**, et te le montre — mais ne le lance pas tout seul.
- **Installer un logiciel** : « installe VLC » passe par winget, livré avec
  Windows.
- **Passer d'une fenêtre à l'autre**, ou en fermer une proprement.
- **Lire l'écran** sans l'autorisation « Enregistrement de l'écran » qu'exige
  macOS — et Windows sait **lire le texte de l'image** tout seul, hors ligne. Un
  exercice photographié est donc lu exactement, accents compris, au lieu d'être
  deviné.
- **Le mode concentration** : ferme ce qui distrait, coupe les notifications, et
  repasse toutes les vingt secondes — parce que Discord revient toujours.
- **Démarrer avec Windows**, et les liens `nexus://`.

---

## Comment obtenir l'installateur

Ce Mac ne peut pas fabriquer un programme Windows. C'est GitHub qui le fait, sur
une vraie machine Windows :

1. GitHub → onglet **Actions**
2. à gauche : **Nexus pour Windows** → bouton **Run workflow**
3. dix minutes plus tard, l'installateur est en bas de la page, dans
   **Artifacts**

Et à chaque fois que tu pousses une modification, il se refabrique tout seul :
tu ne peux donc pas te retrouver avec un installateur en retard sur le site.

> **Aucun mot de passe administrateur n'est jamais demandé** — ni à
> l'installation, ni pour le démarrage automatique, ni pour le clic droit.
> Nexus s'installe et s'intègre dans TON espace de Windows. Sur le PC du lycée
> ou celui des parents, ça marche quand même, et ça se retire proprement.

---

## Voir à quoi ça ressemble sans PC

Tu n'as pas de machine Windows sous la main ? Ouvre le site avec
`?pc=demo` — par exemple `http://localhost:4199/?pc=demo` — puis l'espace
**Sur ton PC**. Le vrai panneau s'affiche avec des données plausibles. Il ne
fait rien : il sert à voir.

---

## Ce qu'il y a dans ce dossier

```
windows/
  src-tauri/
    src/
      lib.rs           l'assemblage : fenêtre, icône près de l'horloge, Alt+Espace
      ps.rs            parler à Windows (un seul endroit, une seule façon)
      fichiers.rs      l'index de Windows : chercher par nom, et dans le contenu
      apps.rs          les applications installées, les fenêtres ouvertes
      scripts.rs       les automatisations — écrites, RELUES, rangées en clair
      systeme.rs       la machine, le fond d'écran, le presse-papiers, winget
      ecran.rs         capturer l'écran et en lire le texte
      integration.rs   démarrage, nexus://, clic droit de l'Explorateur
      concentration.rs le mode concentration
    tauri.conf.json    la configuration de l'application
    capabilities/      ce que l'interface a le droit de demander
```

Les bancs qui vérifient tout ça vivent dans `../outils/` :
`windows.mts` (le code Windows), `intentions.mts` (ce que la mascotte comprend),
`parite.mts` (aucune capacité manquante). Ils tournent aussi dans
`../outils/avant-de-publier.sh`, et sur GitHub avant chaque construction.

---

## Une précision sur la sécurité

Windows laisse faire beaucoup plus de choses que macOS. C'est pratique, et c'est
aussi pour ça que Nexus se surveille lui-même :

- une automatisation est **relue avant d'être écrite, ET avant d'être lancée** ;
- tout ce qui efface en masse, désarme l'antivirus, touche au démarrage de
  Windows ou va chercher du code sur internet est **refusé**, avec la raison
  écrite en français ;
- les automatisations vivent dans **un seul dossier, en clair**
  (`Documents\Nexus\Automatisations`) : tu peux les lire, les modifier et les
  supprimer sans Nexus ;
- **créer une automatisation ne la lance pas.** Ce sont deux gestes séparés,
  exprès.

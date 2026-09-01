// Nouveautés : la liste des mises à jour, pour montrer que Nexus évolue.
// Ajouter les nouvelles entrées en haut du tableau.
interface Entry {
  date: string;
  title: string;
  items: string[];
}

const CHANGELOG: Entry[] = [
  {
    date: "Août 2026",
    title: "Compte Nexus, chat et appels",
    items: [
      "Compte Nexus : tes notes, réglages, discussions et scores te suivent sur tous tes appareils.",
      "Un seul compte, deux entrées : par Google ou par mot de passe, au choix.",
      "Chat en direct et appels audio/vidéo entre comptes Nexus, dans un salon partagé.",
      "Les jeux se jouent aussi à la souris ; Rejouer relance le bon jeu.",
      "Cloud : les fichiers s'ouvrent et se téléchargent vraiment.",
      "Mobile : la barre d'applications n'est plus recouverte.",
    ],
  },
  {
    date: "Prochainement",
    title: "La suite arrive",
    items: [
      "De nouvelles fonctions utiles, pensées pour le quotidien.",
      "Correction de petits bugs et d'incohérences.",
      "Un côté visuel encore plus soigné.",
    ],
  },
  {
    date: "Juillet 2026",
    title: "Fichiers, verre et éditeur vidéo",
    items: [
      "Les fichiers s'ouvrent vraiment (visionneuse intégrée : images, PDF, texte, audio, vidéo).",
      "Éditeur vidéo : le son d'origine des clips est conservé.",
      "Effet « liquid glass » réglable et plus marqué.",
      "Recherche de musique par nom (chanteur, titre).",
      "Barre latérale déplaçable (gauche, droite, haut, bas).",
    ],
  },
  {
    date: "Juillet 2026",
    title: "Mobile, tableur et arcade",
    items: [
      "Interface adaptée au téléphone (portrait) et à la tablette (paysage).",
      "Tableur avec formules : SOMME, MOYENNE, MIN, MAX et plages.",
      "Arcade repensée : améliorations entre les vagues, nouveaux ennemis.",
      "Fonds d'écran « techno » et import de ton propre fond.",
    ],
  },
  {
    date: "Juillet 2026",
    title: "Les fondations",
    items: [
      "24 espaces : IA, notes, apprentissage, dictionnaire, traducteur, cartes, météo, et plus.",
      "Écran d'accueil, barre de recherche (Cmd/Ctrl+K), personnalisation.",
      "Utilisable sans compte : tout reste alors sur ton appareil.",
    ],
  },
];

export default function Changelog() {
  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto">
      <p className="text-xs text-nexus-muted">
        Nexus évolue régulièrement. Voici les dernières nouveautés.
      </p>
      {CHANGELOG.map((e, i) => (
        <div key={i} className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: "var(--accent)" }}
            />
            <span className="text-sm font-medium text-nexus-text">{e.title}</span>
            <span className="ml-auto text-[10px] uppercase tracking-wider text-nexus-muted">
              {e.date}
            </span>
          </div>
          <ul className="ml-4 flex flex-col gap-1 border-l border-nexus-border pl-3">
            {e.items.map((it, j) => (
              <li key={j} className="text-xs leading-relaxed text-nexus-muted">
                {it}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

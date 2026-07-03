// Nouveautes : la liste des mises a jour, pour montrer que Nexus evolue.
// Ajouter les nouvelles entrees en haut du tableau.
interface Entry {
  date: string;
  title: string;
  items: string[];
}

const CHANGELOG: Entry[] = [
  {
    date: "Juillet 2026",
    title: "Fichiers, verre et editeur video",
    items: [
      "Les fichiers s'ouvrent vraiment (visionneuse integree : images, PDF, texte, audio, video).",
      "Editeur video : le son d'origine des clips est conserve.",
      "Effet « liquid glass » reglable et plus marque.",
      "Recherche de musique par nom (chanteur, titre).",
      "Barre laterale deplacable (gauche, droite, haut, bas).",
    ],
  },
  {
    date: "Juillet 2026",
    title: "Mobile, tableur et arcade",
    items: [
      "Interface adaptee au telephone (portrait) et a la tablette (paysage).",
      "Tableur avec formules : SOMME, MOYENNE, MIN, MAX et plages.",
      "Arcade repensee : ameliorations entre les vagues, nouveaux ennemis.",
      "Fonds d'ecran « techno » et import de ton propre fond.",
    ],
  },
  {
    date: "Juillet 2026",
    title: "Les fondations",
    items: [
      "24 espaces : IA, notes, apprentissage, dictionnaire, traducteur, cartes, meteo, et plus.",
      "Ecran d'accueil, barre de recherche (Cmd/Ctrl+K), personnalisation.",
      "Tout reste sur ton appareil, sans inscription.",
    ],
  },
];

export default function Changelog() {
  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto">
      <p className="text-xs text-nexus-muted">
        Nexus evolue regulierement. Voici les dernieres nouveautes.
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

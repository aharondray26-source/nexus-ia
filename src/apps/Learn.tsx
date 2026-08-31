import { useState, type FormEvent } from "react";

// Apprentissage vaste : chaque matiere propose de nombreux chapitres, et une
// recherche libre permet d'apprendre n'importe quelle notion. Chaque sujet
// passe par la recherche Wikipedia (qui trouve le bon article), puis on affiche
// son resume. Ainsi, meme un intitule approximatif tombe sur le bon contenu.

const SUBJECTS: Record<string, string[]> = {
  Mathématiques: [
    "Théorème de Pythagore",
    "Théorème de Thalès",
    "Fraction (mathématiques)",
    "Nombre premier",
    "Fonction affine",
    "Équation du second degré",
    "Trigonométrie",
    "Probabilité",
    "Statistique",
    "Vecteur",
    "Dérivée",
    "Intégrale",
    "Logarithme",
    "Suite (mathématiques)",
    "Nombre complexe",
    "Aire",
    "Volume",
    "Pourcentage",
    "Racine carrée",
    "Géométrie",
  ],
  "Physique-Chimie": [
    "Atome",
    "Molécule",
    "Tableau périodique des éléments",
    "Réaction chimique",
    "État de la matière",
    "Masse volumique",
    "Force (physique)",
    "Énergie",
    "Électricité",
    "Circuit électrique",
    "Tension électrique",
    "Loi d'Ohm",
    "Lumière",
    "Optique",
    "Son",
    "Gravitation",
    "Vitesse",
    "Pression",
    "Combustion",
    "pH",
    "Ion",
    "Radioactivité",
  ],
  "SVT (Sciences)": [
    "Cellule (biologie)",
    "ADN",
    "Photosynthèse",
    "Respiration cellulaire",
    "Système digestif",
    "Système nerveux",
    "Appareil circulatoire",
    "Reproduction",
    "Génétique",
    "Évolution (biologie)",
    "Écosystème",
    "Chaîne alimentaire",
    "Volcan",
    "Séisme",
    "Tectonique des plaques",
    "Cycle de l'eau",
    "Climat",
    "Immunité (biologie)",
    "Neurone",
    "Biodiversité",
  ],
  Histoire: [
    "Préhistoire",
    "Égypte antique",
    "Grèce antique",
    "Empire romain",
    "Moyen Âge",
    "Renaissance",
    "Révolution française",
    "Napoléon Ier",
    "Révolution industrielle",
    "Première Guerre mondiale",
    "Seconde Guerre mondiale",
    "Guerre froide",
    "Décolonisation",
    "Shoah",
    "Cinquième République",
    "Construction européenne",
    "Louis XIV",
    "Traite atlantique",
  ],
  Géographie: [
    "Mondialisation",
    "Union européenne",
    "Urbanisation",
    "Développement durable",
    "Climat",
    "Fleuve",
    "Montagne",
    "Océan",
    "Désert",
    "Agriculture",
    "Migration humaine",
    "Métropole",
    "Énergie renouvelable",
    "Réchauffement climatique",
    "Tourisme",
    "Frontière",
  ],
  Français: [
    "Figure de style",
    "Conjugaison",
    "Grammaire",
    "Roman (littérature)",
    "Poésie",
    "Théâtre",
    "Registre littéraire",
    "Victor Hugo",
    "Molière",
    "Jean de La Fontaine",
    "Argumentation",
    "Champ lexical",
    "Discours direct",
    "Proposition subordonnée",
    "Fable",
    "Autobiographie",
  ],
  Philosophie: [
    "Conscience",
    "Liberté",
    "Vérité",
    "Justice",
    "Bonheur",
    "Le désir",
    "Le travail",
    "L'art",
    "La religion",
    "L'État",
    "Le temps",
    "La raison",
    "Le langage",
    "La nature",
  ],
};

interface Lesson {
  title: string;
  body: string;
  url?: string;
  image?: string;
}

export default function Learn() {
  const [subject, setSubject] = useState<string>("Mathématiques");
  const [query, setQuery] = useState("");
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Trouve le meilleur article pour un terme, puis charge son resume.
  async function loadTopic(term: string) {
    setLoading(true);
    setError(null);
    setLesson(null);
    try {
      const searchRes = await fetch(
        "https://fr.wikipedia.org/w/api.php?action=query&list=search&format=json" +
          "&origin=*&srlimit=1&srsearch=" +
          encodeURIComponent(term)
      );
      const searchData = await searchRes.json();
      const best = searchData?.query?.search?.[0];
      if (!best) {
        setError(`Rien trouvé pour « ${term} ».`);
        return;
      }
      const sumRes = await fetch(
        "https://fr.wikipedia.org/api/rest_v1/page/summary/" +
          encodeURIComponent(best.title)
      );
      const data = await sumRes.json();
      setLesson({
        title: data.title ?? best.title,
        body: data.extract ?? "Résumé indisponible.",
        url: data.content_urls?.desktop?.page,
        image: data.thumbnail?.source || data.originalimage?.source,
      });
    } catch {
      setError("Connexion indisponible. Réessaie dans un instant.");
    } finally {
      setLoading(false);
    }
  }

  function onSearch(e: FormEvent) {
    e.preventDefault();
    if (query.trim()) loadTopic(query.trim());
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <form onSubmit={onSearch} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Apprendre quoi ? La photosynthèse…"
          className="nx-input flex-1 text-sm"
        />
        <button
          type="submit"
          className="nx-btn nx-btn-secondary text-sm"
        >
          Apprendre
        </button>
      </form>

      <div className="flex flex-wrap gap-1.5">
        {Object.keys(SUBJECTS).map((s) => (
          <button
            key={s}
            onClick={() => setSubject(s)}
            className={`nx-chip ${subject === s ? "nx-chip-active" : ""}`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
        {/* La liste des chapitres de la matiere choisie. */}
        <div className="flex flex-wrap gap-1.5">
          {SUBJECTS[subject].map((topic) => (
            <button
              key={topic}
              onClick={() => loadTopic(topic)}
              className="nx-btn nx-btn-secondary text-[11px]"
            >
              {topic}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-xs text-nexus-muted py-4">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
            Recherche Wikipédia en cours...
          </div>
        )}
        {error && <p className="text-xs text-red-400 bg-red-500/10 p-3 rounded-xl border border-red-500/20">{error}</p>}
        {lesson && !loading && (
          <article className="rounded-2xl border border-nexus-border bg-nexus-panel/50 p-4 shadow-xl backdrop-blur-md space-y-3">
            {lesson.image && (
              <img
                src={lesson.image}
                alt={lesson.title}
                className="h-44 w-full rounded-xl object-cover border border-white/10 shadow-md"
              />
            )}
            <h3 className="text-base font-bold text-white flex items-center justify-between">
              <span>{lesson.title}</span>
              <span className="text-[10px] text-cyan-400 bg-cyan-500/20 px-2 py-0.5 rounded-full font-semibold">
                Savoir Wikipédia
              </span>
            </h3>
            <p className="text-xs leading-relaxed text-nexus-muted">
              {lesson.body}
            </p>
            {lesson.url && (
              <a
                href={lesson.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-cyan-400 font-semibold hover:underline"
              >
                Consulter la fiche complète sur Wikipédia →
              </a>
            )}
          </article>
        )}
      </div>
    </div>
  );
}

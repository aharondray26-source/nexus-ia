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
        setError(`Rien trouve pour « ${term} ».`);
        return;
      }
      const sumRes = await fetch(
        "https://fr.wikipedia.org/api/rest_v1/page/summary/" +
          encodeURIComponent(best.title)
      );
      const data = await sumRes.json();
      setLesson({
        title: data.title ?? best.title,
        body: data.extract ?? "Resume indisponible.",
        url: data.content_urls?.desktop?.page,
      });
    } catch {
      setError("Connexion indisponible. Reessaie dans un instant.");
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
          placeholder="Apprendre n'importe quoi (ex : la photosynthese)..."
          className="flex-1 rounded-lg border border-nexus-border bg-nexus-bg px-3 py-2 text-sm text-nexus-text outline-none focus:border-white/30"
        />
        <button
          type="submit"
          className="rounded-lg border border-nexus-border bg-white/[0.04] px-4 py-2 text-sm text-nexus-text transition-colors hover:bg-white/[0.08]"
        >
          Apprendre
        </button>
      </form>

      <div className="flex flex-wrap gap-1.5">
        {Object.keys(SUBJECTS).map((s) => (
          <button
            key={s}
            onClick={() => setSubject(s)}
            className="rounded-full border px-3 py-1.5 text-xs transition-colors"
            style={
              subject === s
                ? { borderColor: "var(--accent)", color: "var(--accent)" }
                : { borderColor: "#27272a", color: "#a1a1aa" }
            }
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
              className="rounded-md border border-nexus-border bg-nexus-bg px-2.5 py-1 text-[11px] text-nexus-muted transition-colors hover:border-white/20 hover:text-nexus-text"
            >
              {topic}
            </button>
          ))}
        </div>

        {loading && <p className="text-sm text-nexus-muted">Chargement...</p>}
        {error && <p className="text-sm text-nexus-muted">{error}</p>}
        {lesson && !loading && (
          <article className="rounded-xl border border-nexus-border bg-nexus-bg p-4">
            <h3 className="text-sm font-semibold text-nexus-text">
              {lesson.title}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-nexus-muted">
              {lesson.body}
            </p>
            {lesson.url && (
              <a
                href={lesson.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-xs underline decoration-nexus-border underline-offset-4 hover:decoration-white/40"
                style={{ color: "var(--accent)" }}
              >
                Approfondir
              </a>
            )}
          </article>
        )}
      </div>
    </div>
  );
}

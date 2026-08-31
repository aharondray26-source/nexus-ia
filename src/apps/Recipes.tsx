import { askGeminiJson } from "../lib/nexusBrain";
import React, { useState } from "react";

interface Recipe {
  id: string;
  title: string;
  prepTime: string;
  difficulty: "Facile" | "Moyen" | "Chef";
  calories: string;
  image: string;
  description: string;
  ingredients: string[];
  steps: string[];
}

const DEFAULT_RECIPES: Recipe[] = [
  {
    id: "r1",
    title: "Pasta Primavera & Parmesan Frais",
    prepTime: "20 min",
    difficulty: "Facile",
    calories: "420 kcal",
    image: "https://images.unsplash.com/photo-1621996346565-e3d5d6281232?w=600&auto=format&fit=crop&q=80",
    description: "Un classique italien crémeux et parfumé aux herbes fraîches et légumes dorés.",
    ingredients: ["250g Pâtes fettuccine", "150g Tomates cerises", "1 Courgette", "2 gousses d'Ail", "Huile d'olive", "Parmesan AOP"],
    steps: [
      "Faire bouillir de l'eau salée et cuire les pâtes 9 minutes.",
      "Faire suer l'ail émincé et les légumes coupés dans une poêle chaude avec l'huile d'olive.",
      "Mélanger les pâtes égouttées avec la garniture et râper généreusement le parmesan."
    ]
  },
  {
    id: "r2",
    title: "Bowl Saumon Avocat & Graines de Sésame",
    prepTime: "15 min",
    difficulty: "Facile",
    calories: "520 kcal",
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80",
    description: "Fresh bowl riche en oméga-3, riz vinaigré, saumon frais et sauce soja gingembre.",
    ingredients: ["150g Pavé de Saumon frais", "1 Avocat Mûr", "100g Riz sushi", "Sauce Soja", "Graines de sésame grillées", "Citron vert"],
    steps: [
      "Faire cuire le riz et laisser tiédir avec un trait de vinaigre de riz.",
      "Trancher le saumon en dés et l'avocat en lamelles fines.",
      "Dresser le bowl, parsemer de sésame et arroser de jus de citron vert et sauce soja."
    ]
  },
  {
    id: "r3",
    title: "Pancakes Moelleux aux Myrtilles & Sirop d'Érable",
    prepTime: "15 min",
    difficulty: "Facile",
    calories: "380 kcal",
    image: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&auto=format&fit=crop&q=80",
    description: "Petit déjeuner réconfortant et ultra fluffy servi chaud avec des myrtilles fraîches.",
    ingredients: ["200g Farine", "2 Oeufs", "250ml Lait", "1 sachet Levure", "Myrtilles fraîches", "Sirop d'érable"],
    steps: [
      "Fouetter farine, œufs, lait et levure jusqu'à obtenir une pâte lisse.",
      "Verser une louche sur poêle chaude beurreé et ajouter les myrtilles sur la face supérieure.",
      "Retourner dès l'apparition de bulles et servir arrosé de sirop d'érable."
    ]
  }
];

export default function Recipes() {
  const [recipes, setRecipes] = useState<Recipe[]>(DEFAULT_RECIPES);
  const [query, setQuery] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(DEFAULT_RECIPES[0]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<number | null>(null);

  async function handleSearch(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setSearchError(null);
    // Passe par le pont commun : serveur -> cle Gemini -> message clair.
    // Avant, l'appel echouait en silence sur le site en ligne.
    const { data, error } = await askGeminiJson<{ recipes: any[] }>(
      "/api/gemini/recipes",
      { query },
      `Propose 3 recettes pour "${query}". Reponds en JSON strict : ` +
        `{"recipes":[{"title":"","time":"","difficulty":"","servings":"","ingredients":[""],"steps":[""],"tip":""}]}`
    );
    if (data?.recipes?.length) {
      setRecipes(data.recipes);
      setSelectedRecipe(data.recipes[0]);
    } else {
      setSearchError(error || `Aucune recette trouvee pour "${query}".`);
    }
    setLoading(false);
  }

  return (
    <div className="flex h-full flex-col bg-nexus-bg text-nexus-text">
      {/* Header bar */}
      <div className="border-b border-nexus-border p-4 bg-nexus-panel/50 backdrop-blur-md">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Que souhaitez-vous cuisiner ? (ex: Tomates, Poulet, Dessert rapide...)"
            className="flex-1 rounded-xl border border-nexus-border bg-black/40 px-3.5 py-2 text-xs text-white placeholder-nexus-muted focus:border-emerald-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Génération IA..." : "Inspirer Chef IA"}
          </button>
        </form>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* List side */}
        <div className="w-1/3 border-r border-nexus-border overflow-y-auto p-3 space-y-3 bg-black/20">
          <h3 className="text-[11px] font-semibold text-nexus-muted uppercase tracking-wider px-1">Recettes au menu</h3>
          {searchError && (
            <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-amber-300">
              {searchError}
            </p>
          )}
          {recipes.map((r) => (
            <div
              key={r.id}
              onClick={() => { setSelectedRecipe(r); setActiveStep(null); }}
              className={`cursor-pointer rounded-2xl border p-2.5 transition-all ${
                selectedRecipe?.id === r.id
                  ? "border-emerald-500/60 bg-emerald-500/10 shadow-lg shadow-emerald-500/5"
                  : "border-nexus-border bg-nexus-panel/40 hover:border-white/20"
              }`}
            >
              <img src={r.image} alt={r.title} className="h-28 w-full rounded-xl object-cover mb-2" />
              <h4 className="text-xs font-semibold text-white line-clamp-1">{r.title}</h4>
              <div className="flex items-center justify-between text-[10px] text-nexus-muted mt-1">
                <span>⏱️ {r.prepTime}</span>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-emerald-300">{r.difficulty}</span>
                <span>🔥 {r.calories}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Selected recipe detail */}
        {selectedRecipe ? (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            <div className="relative h-44 rounded-2xl overflow-hidden border border-nexus-border shadow-xl">
              <img src={selectedRecipe.image} alt={selectedRecipe.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 flex flex-col justify-end">
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Recette Chef IA</span>
                <h2 className="text-lg font-bold text-white">{selectedRecipe.title}</h2>
                <div className="flex gap-3 text-xs text-nexus-muted mt-1">
                  <span>⏱️ Temps: {selectedRecipe.prepTime}</span>
                  <span>🔥 Énergie: {selectedRecipe.calories}</span>
                  <span>👨‍🍳 Niveau: {selectedRecipe.difficulty}</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-nexus-muted leading-relaxed italic border-l-2 border-emerald-500 pl-3">
              "{selectedRecipe.description}"
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Ingredients */}
              <div className="rounded-2xl border border-nexus-border bg-nexus-panel/40 p-4">
                <h4 className="text-xs font-bold text-white mb-3 flex items-center gap-2">
                  <span>🥕</span> Ingrédients requis
                </h4>
                <ul className="space-y-2 text-xs text-nexus-text">
                  {selectedRecipe.ingredients.map((ing, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      <span>{ing}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Instructions */}
              <div className="rounded-2xl border border-nexus-border bg-nexus-panel/40 p-4">
                <h4 className="text-xs font-bold text-white mb-3 flex items-center gap-2">
                  <span>🍳</span> Étapes de préparation
                </h4>
                <ol className="space-y-2.5 text-xs">
                  {selectedRecipe.steps.map((st, idx) => (
                    <li
                      key={idx}
                      onClick={() => setActiveStep(idx === activeStep ? null : idx)}
                      className={`cursor-pointer rounded-xl p-2 transition-all ${
                        activeStep === idx
                          ? "bg-emerald-500/20 text-emerald-200 border border-emerald-500/30"
                          : "hover:bg-white/5 text-nexus-text"
                      }`}
                    >
                      <span className="font-bold text-emerald-400 mr-2">{idx + 1}.</span>
                      {st}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-nexus-muted text-xs">
            Sélectionne une recette pour afficher sa préparation.
          </div>
        )}
      </div>
    </div>
  );
}

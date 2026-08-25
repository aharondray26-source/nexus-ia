import { askGeminiJson } from "../lib/nexusBrain";
import React, { useState } from "react";

interface Deal {
  title: string;
  price: string;
  originalPrice: string;
  discount: string;
  store: string;
  rating: number;
  badge: string;
  image: string;
  specs: string;
}

// Aucune offre inventee : on n'attribue pas de faux prix a de vraies enseignes.
const DEFAULT_DEALS: Deal[] = [];

export default function Deals() {
  const [deals, setDeals] = useState<Deal[]>(DEFAULT_DEALS);
  const [dealsError, setDealsError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSearch(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setDealsError(null);
    const { data, error } = await askGeminiJson<{ deals: Deal[] }>(
      "/api/gemini/deals",
      { productQuery: query },
      `Donne 4 offres reelles et plausibles pour "${query}" en France. Reponds en JSON strict : ` +
        `{"deals":[{"title":"","store":"","price":"","oldPrice":"","discount":"","url":"","description":""}]}`
    );
    if (data?.deals?.length) setDeals(data.deals);
    else setDealsError(error || `Aucune offre trouvee pour "${query}".`);
    setLoading(false);
  }

  return (
    <div className="flex h-full flex-col bg-nexus-bg text-nexus-text">
      {/* Top Search bar */}
      <div className="border-b border-nexus-border p-4 bg-nexus-panel/50 backdrop-blur-md flex flex-col gap-2">
        <h2 className="text-xs font-bold text-white flex items-center gap-2">
          <span>🏷️</span> Comparateur & Dénicheur de Bons Plans Web
        </h2>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tapez un produit ou une marque (ex: iPhone 16, PC Gamer, Baskets, Écran...)"
            className="flex-1 rounded-xl border border-nexus-border bg-black/40 px-3.5 py-2 text-xs text-white placeholder-nexus-muted focus:border-purple-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Recherche..." : "Comparer Promos"}
          </button>
        </form>
      </div>

      {/* Grid of Deals */}
      <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {dealsError && (
          <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-amber-300">
            {dealsError}
          </p>
        )}
        {!dealsError && deals.length === 0 && !loading && (
          <p className="py-8 text-center text-[11px] leading-relaxed text-nexus-muted/70">
            Cherche un produit ci-dessus pour comparer les offres.
            <br />
            Aucune offre n'est affichee tant que tu n'as pas cherche : rien n'est invente ici.
          </p>
        )}
        {deals.map((deal, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-nexus-border bg-nexus-panel/40 p-3.5 flex flex-col justify-between hover:border-purple-500/50 transition-all hover:shadow-xl hover:shadow-purple-500/5 group"
          >
            <div className="space-y-2">
              <div className="relative h-36 rounded-xl overflow-hidden bg-black">
                <img
                  src={deal.image}
                  alt={deal.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute top-2 left-2 bg-purple-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-md">
                  {deal.badge}
                </span>
                <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md shadow-md">
                  {deal.discount}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-nexus-muted">
                <span className="font-semibold text-purple-300">{deal.store}</span>
                <span>⭐ {deal.rating} / 5</span>
              </div>

              <h3 className="text-xs font-bold text-white line-clamp-2">{deal.title}</h3>
              <p className="text-[11px] text-nexus-muted line-clamp-2">{deal.specs}</p>
            </div>

            <div className="mt-3 pt-3 border-t border-nexus-border flex items-center justify-between">
              <div>
                <span className="text-sm font-extrabold text-emerald-400">{deal.price}</span>
                <span className="text-xs text-nexus-muted line-through ml-2">{deal.originalPrice}</span>
              </div>
              <button
                onClick={() => alert(`Bandeau partenaire : Redirection vers ${deal.store} pour l'offre "${deal.title}"`)}
                className="rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-medium text-white transition-colors"
              >
                Voir la promo →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

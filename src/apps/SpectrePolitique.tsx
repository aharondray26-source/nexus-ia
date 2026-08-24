import { useState, type FormEvent } from "react";
import {
  Compass,
  Search,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Scale,
  BookOpen,
  Info,
  HelpCircle,
  RefreshCw,
  Share2,
  CheckCircle2,
  Flame,
  Globe2,
  ShieldAlert,
} from "lucide-react";

interface PoliticalAnalysis {
  term: string;
  gauchePercent: number; // 0 to 100
  droitePercent: number; // 0 to 100
  classification: string; // e.g. "Gauche Sociale & Écologique"
  summary: string;
  economicView: string;
  socialView: string;
  stateRole: string;
  similarFigures: string[];
  nuances: string;
}

const PRESET_DATABASE: Record<string, PoliticalAnalysis> = {
  "jean-luc mélenchon": {
    term: "Jean-Luc Mélenchon",
    gauchePercent: 90,
    droitePercent: 10,
    classification: "Gauche Radicale / Écoconception",
    summary:
      "Fondateur de La France Insoumise. Prône la VIe République, la planification écologique, la redistribution des richesses, la hausse du SMIC et le retrait des traités européens libéraux.",
    economicView: "Interventionnisme d'État fort, taxation des hauts revenus, partage du temps de travail (32h).",
    socialView: "Progrès social, laïcité républicaine, soutien aux services publics et droits des travailleurs.",
    stateRole: "État stratège et protecteur face au marché libre.",
    similarFigures: ["Bernie Sanders", "Jeremy Corbyn", "François Ruffin"],
    nuances: "Critiqué par le centre pour sa posture souverainiste et sa rhétorique oppositionnelle.",
  },
  "emmanuel macron": {
    term: "Emmanuel Macron",
    gauchePercent: 40,
    droitePercent: 60,
    classification: "Centre-Droite Libéral-Progressiste",
    summary:
      "Président de la République (Renaissance). Positionnement centriste 'en même temps', combinant libéralisme économique pro-entreprises et progressisme sociétal européen.",
    economicView: "Libéralisme économique, baisse de la fiscalité sur le capital (PFU), flexibilité du travail et réforme des retraites.",
    socialView: "Progressisme sociétal (PMA), pro-européen convaincu, promotion de l'entrepreneuriat.",
    stateRole: "État régulateur centré sur la compétitivité et l'attractivité économique.",
    similarFigures: ["Tony Blair", "Justin Trudeau", "Barack Obama"],
    nuances: "Considéré comme de gauche par la droite conservatrice, mais très ancré à droite par la gauche sociale.",
  },
  "marine le pen": {
    term: "Marine Le Pen",
    gauchePercent: 25,
    droitePercent: 75,
    classification: "Droite Nationale & Souverainiste",
    summary:
      "Figure emblématique du Rassemblement National. Axée sur la préférence nationale, le contrôle strict de l'immigration, la sécurité et la défense de la souveraineté française.",
    economicView: "Protectionnisme économique, défense du pouvoir d'achat des classes populaires, patriotisme économique.",
    socialView: "Priorité nationale, conservatisme sociétal, fermeté pénale et autorité républicaine.",
    stateRole: "État fort, régalien et souverain contre la mondialisation.",
    similarFigures: ["Jordan Bardella", "Viktor Orbán", "Giorgia Meloni"],
    nuances: "Comporte un volet social-étatiste économique d'inspiration gaulliste, mais classée à l'extrême-droite/droite nationale.",
  },
  "service public": {
    term: "Service Public",
    gauchePercent: 85,
    droitePercent: 15,
    classification: "Valeur de Gauche / Républicaine",
    summary:
      "Concept visant à garantir l'accès égalitaire de tous les citoyens aux services essentiels (Santé, Éducation, Transports, Énergie) sans logique de profit pur.",
    economicView: "Gestion étatique ou collective hors marché marchand.",
    socialView: "Égalité réelles des chances, solidarité nationale et cohésion des territoires.",
    stateRole: "L'État est le garant ultime du bien commun.",
    similarFigures: ["Jean Jaurès", "Conseil National de la Résistance"],
    nuances: "La droite reconnaît l'importance des fonctions régaliennes du service public mais prône l'efficacité et la délégation au privé.",
  },
  "isf": {
    term: "ISF (Impôt sur la Fortune)",
    gauchePercent: 90,
    droitePercent: 10,
    classification: "Fiscalité de Gauche",
    summary:
      "Impôt redistributif visant à taxer les hauts patrimoines pour financer la solidarité nationale et réduire les inégalités sociales.",
    economicView: "Redistribution des richesses et justice fiscale.",
    socialView: "Lutte contre la concentration excessive des capitaux.",
    stateRole: "Régulation des hauts patrimoines.",
    similarFigures: ["Piketty", "LFI", "PS"],
    nuances: "Remplacé sous Macron par l'IFI (immobilier) pour encourager l'investissement productif.",
  },
  "privatisation": {
    term: "Privatisation",
    gauchePercent: 10,
    droitePercent: 90,
    classification: "Mesure de Droite Libérale",
    summary:
      "Transfert de la propriété d'entreprises ou de services publics au secteur privé afin de stimuler la concurrence, l'efficacité et réduire la dette publique.",
    economicView: "Libre marché, désengagement de l'État et concurrence accrue.",
    socialView: "Responsabilité individuelle et autonomie des acteurs économiques.",
    stateRole: "État minimal recentré sur ses fonctions régaliennes (Police, Justice, Armée).",
    similarFigures: ["Margaret Thatcher", "Ronald Reagan", "Milton Friedman"],
    nuances: "La gauche s'y oppose fermement, estimant que cela renchérit les coûts et détériore le service aux usagers.",
  },
  "écologie politique": {
    term: "Écologie Politique",
    gauchePercent: 80,
    droitePercent: 20,
    classification: "Gauche Écologiste & Progressiste",
    summary:
      "Mouvement plaçant la préservation de la planète, la transition énergétique et la justice environnementale au cœur de l'organisation politique et sociale.",
    economicView: "Sobriété, décroissance sélective, régulation des multinationales polluantes.",
    socialView: "Justice environnementale, protection du vivant et démocratie participative.",
    stateRole: "Planification verte et normes environnementales strictes.",
    similarFigures: ["Marine Tondelier", "Rene Dumont", "Yannick Jadot"],
    nuances: "Exsite aussi une 'écologie de marché' ou 'croissance verte' portée par le centre/droite libérale.",
  },
  "souverainisme": {
    term: "Souverainisme",
    gauchePercent: 35,
    droitePercent: 65,
    classification: "Axe Transversal (Incliné Droite)",
    summary:
      "Doctrine politique prônant l'indépendance de la nation et la suprématie des lois nationales face aux institutions supranationales (comme l'Union Européenne).",
    economicView: "Patriotisme économique, réindustrialisation et protectionnisme.",
    socialView: "Défense des frontières, identité nationale et autonomie stratégique.",
    stateRole: "Restauration de la pleine autorité de l'État-Nation.",
    similarFigures: ["Charles de Gaulle", "Philippe Séguin", "Nicolas Dupont-Aignan"],
    nuances: "Existe un souverainisme de gauche (altermondialiste) et un souverainisme de droite (identitaire/sécuritaire).",
  },
};

const SUGGESTED_TERMS = [
  "Jean-Luc Mélenchon",
  "Emmanuel Macron",
  "Marine Le Pen",
  "Service Public",
  "ISF",
  "Privatisation",
  "Écologie politique",
  "Souverainisme",
  "Nucléaire",
  "Revenu Universel",
  "Gabriel Attal",
  "Jordan Bardella",
];

export default function SpectrePolitique() {
  const [query, setQuery] = useState("");
  const [currentAnalysis, setCurrentAnalysis] = useState<PoliticalAnalysis | null>(
    PRESET_DATABASE["emmanuel macron"]
  );
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  function analyzeTerm(termToSearch: string) {
    const cleaned = termToSearch.trim().toLowerCase();
    if (!cleaned) return;

    setLoading(true);

    // Look up preset DB first
    if (PRESET_DATABASE[cleaned]) {
      setTimeout(() => {
        setCurrentAnalysis(PRESET_DATABASE[cleaned]);
        setLoading(false);
      }, 300);
      return;
    }

    // Dynamic heuristic political spectrum algorithm
    setTimeout(() => {
      let g = 50;
      let d = 50;
      let classif = "Analyse Polyphonique / Nuancée";
      let summaryStr = `Analyse du concept ou de la personnalité "${termToSearch}".`;
      let eco = "Orientation mixte entre régulation publique et dynamique de marché.";
      let soc = "Positionnement articulé autour de valeurs de liberté et de cohésion sociale.";
      let st = "Équilibre entre intervention de l'État et initiative privée.";
      let figures = ["Acteurs politiques contemporains"];
      let nuanc = "Ce sujet traverse les clivages traditionnels et dépend des contextes d'application.";

      // Heuristic keyword matching
      if (
        /gauche|social|commun|marx|médias|lfi|nfp|syndicat|35h|smic|égalit|écolo|trotsky|ruffin|tondelier|aubry/i.test(
          cleaned
        )
      ) {
        g = Math.floor(Math.random() * 20) + 75;
        d = 100 - g;
        classif = "Gauche Sociale & Progressiste";
        summaryStr = `"${termToSearch}" s'inscrit principalement dans la tradition de la gauche sociale, axée sur la redistribution, l'égalité et les droits collectifs.`;
        eco = "Priorité à la régulation, aux services publics et au pouvoir d'achat des ménages.";
        soc = "Progressisme, égalité des droits et solidarité nationale.";
        st = "État garant de la justice sociale et protecteur contre les dérives du marché.";
        figures = ["Jean Jaurès", "François Mitterrand", "Bernard Friot"];
      } else if (
        /droite|libéral|capital|marché|entreprise|rn|ciotti|bardella|retraite|sécurité|frontière|patrie|décur/i.test(
          cleaned
        )
      ) {
        d = Math.floor(Math.random() * 20) + 75;
        g = 100 - d;
        classif = "Droite Libérale ou Conservatrice";
        summaryStr = `"${termToSearch}" relève majoritairement de la pensée de droite, mettant l'accent sur la liberté d'entreprendre, la sécurité, la responsabilité et la souveraineté.`;
        eco = "Incitations à l'investissement, compétitivité, maîtrise des dépenses publiques.";
        soc = "Valeurs d'effort, mérite, sécurité régalienne et respect de l'autorité.";
        st = "État régalien fort concentré sur la sécurité et le respect des lois.";
        figures = ["Charles de Gaulle", "Raymond Barre", "Nicolas Sarkozy"];
      } else if (/macron|centre|renaissance|bayrou|modem|attal|horizon/i.test(cleaned)) {
        g = 45;
        d = 55;
        classif = "Centre Libéral-Progressiste";
        summaryStr = `"${termToSearch}" s'inscrit au centre de l'échiquier politique, prônant le pragmatisme et le compromis réformiste.`;
      }

      setCurrentAnalysis({
        term: termToSearch,
        gauchePercent: g,
        droitePercent: d,
        classification: classif,
        summary: summaryStr,
        economicView: eco,
        socialView: soc,
        stateRole: st,
        similarFigures: figures,
        nuances: nuanc,
      });
      setLoading(false);
    }, 400);
  }

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    analyzeTerm(query);
  }

  function handleCopyShare() {
    if (!currentAnalysis) return;
    const shareText = `Analyse Politique pour "${currentAnalysis.term}": ${currentAnalysis.classification} (Gauche ${currentAnalysis.gauchePercent}% / Droite ${currentAnalysis.droitePercent}%). Analysé sur Nexus OS.`;
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="flex h-full flex-col gap-3 p-1 bg-slate-950 text-white rounded-xl select-none font-sans overflow-hidden">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2 bg-slate-900/90 p-2.5 rounded-xl border border-white/10 shrink-0 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-rose-500 via-purple-500 to-blue-500 text-white shadow-md">
            <Compass className="w-4 h-4 animate-spin-slow" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5">
              <span>Boussole & Spectre Politique</span>
              <span className="text-[10px] bg-white/10 text-cyan-300 font-mono px-1.5 py-0.5 rounded-md border border-white/10">
                PRO
              </span>
            </h2>
            <p className="text-[10px] text-slate-400">
              Analyse schématique : Gauche 🔴 vs Droite 🔵 • Figures, Idées & Concepts
            </p>
          </div>
        </div>

        {currentAnalysis && (
          <button
            onClick={handleCopyShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300 hover:text-white hover:bg-white/10 active:scale-95 transition-all shrink-0"
          >
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? "Copié !" : "Partager"}</span>
          </button>
        )}
      </div>

      {/* Search Bar Input */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2 shrink-0">
        <div className="relative flex-1">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Entrez un nom, une idée ou un concept (ex: Mélenchon, ISF, Privatisation, Souverainisme)..."
            className="w-full rounded-xl border border-white/10 bg-slate-900/90 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500 transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-600 via-purple-600 to-blue-600 px-4 py-2 text-xs font-bold text-white hover:opacity-90 shadow-md active:scale-95 transition-all shrink-0"
        >
          {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          <span>Analyser</span>
        </button>
      </form>

      {/* Preset Suggestions Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] shrink-0">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
          <Flame className="w-3 h-3 text-amber-400" />
          Tendances :
        </span>
        {SUGGESTED_TERMS.map((term) => (
          <button
            key={term}
            onClick={() => {
              setQuery(term);
              analyzeTerm(term);
            }}
            className="px-2.5 py-1 rounded-lg bg-slate-900/80 border border-white/5 text-[11px] font-medium text-slate-300 hover:text-white hover:bg-white/10 hover:border-white/20 whitespace-nowrap transition-all"
          >
            {term}
          </button>
        ))}
      </div>

      {/* Main Analysis Display Panel */}
      <div className="flex-1 overflow-y-auto pr-1 [scrollbar-width:thin] space-y-3">
        {loading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-xs text-slate-400 animate-pulse">
            <Compass className="w-8 h-8 text-purple-400 animate-spin" />
            <span className="font-semibold text-white">Analyse de la Boussole Politique en cours...</span>
            <span className="text-[11px] text-slate-500">
              Évaluation des courants, principes économiques et positionnements sociétaux.
            </span>
          </div>
        ) : currentAnalysis ? (
          <div className="space-y-3">
            {/* Political Spectrum Gauge Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-white/15 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    SUJET ANALYSÉ
                  </span>
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    <span>{currentAnalysis.term}</span>
                  </h3>
                </div>

                <div className="text-right">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    <Scale className="w-3.5 h-3.5" />
                    {currentAnalysis.classification}
                  </span>
                </div>
              </div>

              {/* GAUGES BAR */}
              <div className="space-y-1.5 my-4">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-rose-400 flex items-center gap-1">
                    🔴 Gauche : {currentAnalysis.gauchePercent}%
                  </span>
                  <span className="text-slate-400 text-[10px]">⚖️ Axe Médian</span>
                  <span className="text-blue-400 flex items-center gap-1">
                    🔵 Droite : {currentAnalysis.droitePercent}%
                  </span>
                </div>

                <div className="relative h-4 w-full rounded-full bg-slate-800 p-0.5 border border-white/10 overflow-hidden flex shadow-inner">
                  <div
                    style={{ width: `${currentAnalysis.gauchePercent}%` }}
                    className="h-full bg-gradient-to-r from-rose-600 to-rose-400 rounded-l-full transition-all duration-500"
                  />
                  <div
                    style={{ width: `${currentAnalysis.droitePercent}%` }}
                    className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-r-full transition-all duration-500"
                  />
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed bg-black/30 p-3 rounded-xl border border-white/5">
                {currentAnalysis.summary}
              </p>
            </div>

            {/* Schematic Grid Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Economic Pillar */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/10 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <TrendingUp className="w-4 h-4" />
                  <span>Volet Économique & Fiscal</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{currentAnalysis.economicView}</p>
              </div>

              {/* Social Pillar */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/10 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
                  <Globe2 className="w-4 h-4" />
                  <span>Société, Valeurs & Libertés</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{currentAnalysis.socialView}</p>
              </div>

              {/* Role of State */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/10 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                  <BookOpen className="w-4 h-4" />
                  <span>Rôle de l'État & Institutions</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{currentAnalysis.stateRole}</p>
              </div>

              {/* Similar Figures & Nuances */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-purple-400">
                  <Info className="w-4 h-4" />
                  <span>Courants & Figures Proches</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {currentAnalysis.similarFigures.map((fig) => (
                    <span
                      key={fig}
                      className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px] font-medium text-slate-300"
                    >
                      {fig}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

import { openAiWindow, isTauri } from "../lib/tauri";

// Chaque IA, avec un petit conseil d'usage pour orienter l'utilisateur.
const AIS = [
  {
    name: "ChatGPT",
    url: "https://chatgpt.com",
    accent: "#10a37f",
    tip: "Polyvalent : idees, resumes, explications du quotidien.",
  },
  {
    name: "Claude",
    url: "https://claude.ai",
    accent: "#d97757",
    tip: "Excellent pour ecrire, coder et les longs documents.",
  },
  {
    name: "Gemini",
    url: "https://gemini.google.com",
    accent: "#4285f4",
    tip: "Pratique pour la recherche et l'ecosysteme Google.",
  },
  {
    name: "Mistral",
    url: "https://chat.mistral.ai",
    accent: "#ff7000",
    tip: "Rapide et francais, bon pour repondre vite.",
  },
];

export default function AIHub() {
  return (
    <div className="flex h-full flex-col gap-3">
      <p className="text-xs leading-relaxed text-nexus-muted">
        Ouvre une IA en un clic. Le petit conseil t'aide a choisir selon ton besoin.
      </p>
      <div className="grid flex-1 grid-cols-2 gap-3 overflow-y-auto">
        {AIS.map((ai) => (
          <button
            key={ai.name}
            onClick={() => openAiWindow(`ai-${ai.name}`, ai.url)}
            className="group flex flex-col items-start gap-2 rounded-xl border border-nexus-border bg-nexus-bg p-4 text-left transition-all duration-300 hover:border-white/20"
          >
            <span
              className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold"
              style={{ color: ai.accent, borderColor: ai.accent, borderWidth: 1 }}
            >
              {ai.name.charAt(0)}
            </span>
            <span className="text-sm font-medium text-nexus-text">{ai.name}</span>
            <span className="text-[11px] leading-relaxed text-nexus-muted">
              {ai.tip}
            </span>
          </button>
        ))}
      </div>
      {!isTauri() && (
        <p className="text-[11px] text-nexus-muted/70">
          Chaque assistant s'ouvre dans une fenetre dediee.
        </p>
      )}
    </div>
  );
}

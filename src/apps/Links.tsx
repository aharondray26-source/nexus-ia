import { openAiWindow } from "../lib/tauri";

// Acces rapide aux sites du quotidien. Ils s'ouvrent dans une fenetre dediee.
const GROUPS: { title: string; links: { name: string; url: string }[] }[] = [
  {
    title: "Travail",
    links: [
      { name: "Google Docs", url: "https://docs.google.com" },
      { name: "Google Drive", url: "https://drive.google.com" },
      { name: "Notion", url: "https://www.notion.so" },
      { name: "Canva", url: "https://www.canva.com" },
    ],
  },
  {
    title: "Recherche",
    links: [
      { name: "Google", url: "https://www.google.com" },
      { name: "Wikipedia", url: "https://fr.wikipedia.org" },
      { name: "Wolfram Alpha", url: "https://www.wolframalpha.com" },
      { name: "DeepL", url: "https://www.deepl.com/translator" },
    ],
  },
  {
    title: "Messages",
    links: [
      { name: "Gmail", url: "https://mail.google.com" },
      { name: "Outlook", url: "https://outlook.live.com" },
      { name: "WhatsApp", url: "https://web.whatsapp.com" },
      { name: "Discord", url: "https://discord.com/app" },
    ],
  },
  {
    title: "Detente",
    links: [
      { name: "YouTube", url: "https://www.youtube.com" },
      { name: "Spotify", url: "https://open.spotify.com" },
      { name: "Twitch", url: "https://www.twitch.tv" },
      { name: "Netflix", url: "https://www.netflix.com" },
    ],
  },
];

export default function Links() {
  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto">
      {GROUPS.map((group) => (
        <div key={group.title} className="flex flex-col gap-2">
          <span className="text-[11px] uppercase tracking-wider text-nexus-muted">
            {group.title}
          </span>
          <div className="grid grid-cols-2 gap-2">
            {group.links.map((link) => (
              <button
                key={link.name}
                onClick={() => openAiWindow(`link-${link.name}`, link.url)}
                className="flex items-center gap-2.5 rounded-lg border border-nexus-border bg-nexus-bg px-3 py-2.5 text-left transition-colors hover:border-white/20"
              >
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-nexus-border text-xs font-semibold text-nexus-text"
                >
                  {link.name.charAt(0)}
                </span>
                <span className="truncate text-sm text-nexus-text">
                  {link.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

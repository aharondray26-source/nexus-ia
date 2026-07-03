// Tableau blanc integre (Excalidraw), qui autorise l'affichage en fenetre.
// Ideal pour croquis, schemas, brainstorming, sans quitter le site.
export default function Whiteboard() {
  return (
    <div className="h-full w-full overflow-hidden rounded-lg border border-nexus-border bg-black">
      <iframe
        title="Tableau blanc"
        src="https://excalidraw.com"
        className="h-full w-full"
        style={{ border: 0 }}
        allow="clipboard-write"
      />
    </div>
  );
}

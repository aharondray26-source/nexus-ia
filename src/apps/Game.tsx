// Nexus Arcade : Neon Arena II + Serpent, charges localement (zero dependance).
// Une pause arcade integree a l'espace de travail.
export default function Game() {
  return (
    <div className="h-full w-full overflow-hidden rounded-lg border border-nexus-border bg-black">
      <iframe
        title="Nexus Arcade"
        src="/arcade.html"
        className="h-full w-full"
        style={{ border: 0 }}
        allow="fullscreen"
      />
    </div>
  );
}

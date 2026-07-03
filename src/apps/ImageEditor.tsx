// Editeur d'image integre (Photopea), un mini-Photoshop gratuit qui autorise
// l'affichage en fenetre. Retouche, montage, export, directement dans le site.
export default function ImageEditor() {
  return (
    <div className="h-full w-full overflow-hidden rounded-lg border border-nexus-border bg-black">
      <iframe
        title="Editeur d'image"
        src="https://www.photopea.com"
        className="h-full w-full"
        style={{ border: 0 }}
      />
    </div>
  );
}

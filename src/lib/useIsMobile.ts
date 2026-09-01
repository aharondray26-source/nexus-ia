import { useEffect, useState } from "react";

// Vrai sur les petits ecrans (telephones). L'interface s'adapte alors :
// barre d'outils en bas, fenetres en plein ecran — sans rien changer au style.
const REQUETE = "(max-width: 520px) and (orientation: portrait)";

// Une largeur de 0 n'est pas un telephone : c'est une page pas encore
// disposee, ou un onglet masque. Sans ce garde-fou, Nexus s'ouvrait en mise en
// page telephone (fenetres en plein ecran, barre en bas) sur un vrai
// ordinateur, le temps que le navigateur veuille bien mesurer sa fenetre.
function vraimentPetit(): boolean {
  if (typeof window === "undefined") return false;
  if (window.innerWidth < 200) return false;
  return window.matchMedia(REQUETE).matches;
}

export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState<boolean>(vraimentPetit);

  useEffect(() => {
    const mq = window.matchMedia(REQUETE);
    const onChange = () => setMobile(vraimentPetit());
    window.addEventListener("resize", onChange);
    mq.addEventListener("change", onChange);
    onChange();
    return () => {
      window.removeEventListener("resize", onChange);
      mq.removeEventListener("change", onChange);
    };
  }, []);

  return mobile;
}

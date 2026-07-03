import { useEffect, useState } from "react";

// Vrai sur les petits ecrans (telephones). L'interface s'adapte alors :
// barre d'outils en bas, fenetres en plein ecran — sans rien changer au style.
export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState<boolean>(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 520px) and (orientation: portrait)").matches
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 520px) and (orientation: portrait)");
    const onChange = () => setMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return mobile;
}

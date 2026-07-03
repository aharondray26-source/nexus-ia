import { useEffect, useState } from "react";

// Petit outil pour sauvegarder une donnee dans le navigateur (localStorage).
// Grace a lui, les notes, les taches et la liste de fichiers RESTENT presentes
// meme apres avoir recharge la page ou ferme puis rouvert le site.
export function usePersistentState<T>(
  key: string,
  initial: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Le stockage peut etre plein ou desactive : on ignore silencieusement.
    }
  }, [key, value]);

  return [value, setValue];
}

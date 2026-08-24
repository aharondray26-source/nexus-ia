import React, { useEffect, useState } from "react";

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

  const valueRef = React.useRef(value);
  valueRef.current = value;

  useEffect(() => {
    try {
      const nextStr = JSON.stringify(value);
      const currentStored = localStorage.getItem(key);
      if (currentStored !== nextStr) {
        localStorage.setItem(key, nextStr);
        window.dispatchEvent(new CustomEvent("nexus:persist-update", { detail: { key } }));
      }
    } catch {
      // Le stockage peut etre plein ou desactive : on ignore silencieusement.
    }
  }, [key, value]);

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEv = e as CustomEvent;
      if (!customEv.detail || customEv.detail.key === key) {
        try {
          const raw = localStorage.getItem(key);
          if (raw !== null) {
            const currentStr = JSON.stringify(valueRef.current);
            if (raw !== currentStr) {
              setValue(JSON.parse(raw) as T);
            }
          }
        } catch {
          // Ignore
        }
      }
    };
    window.addEventListener("nexus:persist-update", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("nexus:persist-update", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [key]);

  return [value, setValue];
}

export function addNexusTask(text: string, dueDate?: string) {
  try {
    const key = "nexus.tasks";
    const raw = localStorage.getItem(key);
    const tasks = raw ? JSON.parse(raw) : [];
    const newTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      text: dueDate ? `${text} (pour : ${dueDate})` : text,
      done: false,
      createdAt: new Date().toISOString(),
      dueDate,
    };
    const updated = [newTask, ...tasks];
    localStorage.setItem(key, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("nexus:persist-update", { detail: { key } }));
    return newTask;
  } catch (err) {
    console.error("Failed to add task:", err);
    return null;
  }
}


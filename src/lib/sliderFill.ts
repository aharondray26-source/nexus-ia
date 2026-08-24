// Remplit la ligne du curseur a gauche de la capsule (progression coloree).
// S'applique automatiquement a TOUS les curseurs du site, meme ceux crees plus tard.
function paint(el: HTMLInputElement) {
  const min = Number(el.min || 0);
  const max = Number(el.max || 100);
  const val = Number(el.value || 0);
  const pct = max > min ? ((val - min) / (max - min)) * 100 : 0;
  el.style.setProperty("--p", pct + "%");
}

export function initSliderFill() {
  const paintAll = () =>
    document
      .querySelectorAll<HTMLInputElement>('input[type="range"]')
      .forEach(paint);

  document.addEventListener("input", (e) => {
    const t = e.target as HTMLElement;
    if (t instanceof HTMLInputElement && t.type === "range") paint(t);
  });

  paintAll();
  // Les curseurs apparaissent quand on ouvre une fenetre : on repeint a chaque ajout.
  new MutationObserver(paintAll).observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// Ouvrir CHAQUE espace, cliquer dedans, et écouter ce qui casse.
//
// Aharon : « beaucoup d'applications de notre site rencontrent des bugs dans
// l'utilisation de certaines choses ». Le balayage précédent regardait la MISE
// EN PAGE — il ne voyait donc rien quand un bouton lève une erreur.
// Celui-ci se sert des applications : il clique, et il écoute.
(function () {
  if (window.__essai) return;
  window.__essai = { erreurs: [], resultats: [] };

  // On attrape TOUT : les erreurs, les promesses non tenues, et les messages
  // d'erreur écrits en console — c'est souvent là que ça se plaint en silence.
  const noter = (ou, quoi) => {
    const t = String(quoi || "").slice(0, 200);
    if (!t || /ResizeObserver loop/.test(t)) return;   // bruit connu, inoffensif
    window.__essai.erreurs.push({ ou, quoi: t });
  };
  window.__ouCourant = "chargement";
  addEventListener("error", (e) => noter(window.__ouCourant, e.message));
  addEventListener("unhandledrejection", (e) =>
    noter(window.__ouCourant, "promesse : " + (e.reason?.message || e.reason)));
  const vraiErr = console.error;
  console.error = (...a) => {
    noter(window.__ouCourant, a.map((x) => x?.message || String(x)).join(" "));
    vraiErr.apply(console, a);
  };

  const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

  window.__essayer = async function (id) {
    window.__ouCourant = id;
    const avant = window.__essai.erreurs.length;
    try { window.nexus.ouvrir(id); } catch (e) { noter(id, "ouverture : " + e.message); }
    await dormir(700);

    // La fenêtre du dessus, c'est celle qu'on vient d'ouvrir.
    const fens = [...document.querySelectorAll("div")].filter((e) => {
      const c = (e.className || "").toString();
      return /absolute/.test(c) && /rounded-2xl/.test(c) && /flex-col/.test(c);
    });
    const fen = fens.length
      ? fens.reduce((a, b) =>
          (+getComputedStyle(b).zIndex || 0) >= (+getComputedStyle(a).zIndex || 0) ? b : a)
      : null;
    if (!fen) {
      window.__essai.resultats.push({ id, erreur: "pas de fenêtre" });
      return;
    }

    // On clique les boutons SANS RISQUE : pas ceux qui ferment, ni ceux qui
    // suppriment, ni ceux qui emmènent ailleurs. On cherche des bugs, pas à
    // effacer les affaires d'Aharon.
    const dangereux = /ferme|supprim|effac|vider|d[ée]connect|quitter|r[ée]initialis|payer|acheter/i;
    const boutons = [...fen.querySelectorAll("button")]
      .filter((b) => !b.disabled
        && !dangereux.test((b.textContent || "") + " " + (b.title || ""))
        && b.getBoundingClientRect().width > 0)
      .slice(0, 6);

    for (const b of boutons) {
      try { b.click(); } catch (e) { noter(id, "clic « " + (b.textContent || "?").trim().slice(0, 24) + " » : " + e.message); }
      await dormir(160);
    }
    // Et on tape dans le premier champ, s'il y en a un.
    const champ = fen.querySelector("input[type=text], input:not([type]), textarea");
    if (champ) {
      try {
        const set = Object.getOwnPropertyDescriptor(
          champ.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
          "value").set;
        set.call(champ, "essai");
        champ.dispatchEvent(new Event("input", { bubbles: true }));
        champ.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      } catch (e) { noter(id, "saisie : " + e.message); }
      await dormir(300);
    }

    window.__essai.resultats.push({
      id,
      boutons: boutons.length,
      nouvelles: window.__essai.erreurs.length - avant,
    });
  };
})();

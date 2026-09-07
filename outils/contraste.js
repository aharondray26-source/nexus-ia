// ============================================================================
//  LE BALAYAGE DES CONTRASTES
//
//  Aharon : « il faut que tout absolument tout soit personnalisable… avec des
//  résultats remarquablement satisfaisants ». Un thème clair où l'on ne lit
//  plus rien n'est pas un thème : c'est une panne silencieuse. Et elle est
//  silencieuse pour de bon — aucun message, aucune erreur, juste du texte
//  qu'on n'arrive plus à lire.
//
//  DEUX PIÈGES, tous les deux vérifiés ici :
//
//  1. LES COULEURS MODERNES. `getComputedStyle().color` rend aujourd'hui
//     « oklab(0.129 …) » et « color(srgb …) ». Les lire à coups d'expression
//     régulière donne des nombres qui n'ont aucun sens — mon premier balayage
//     a annoncé « 4 contrastes faibles » qui étaient tous faux, et il aurait
//     tout aussi bien pu en manquer de vrais. On PEINT la couleur sur une
//     toile d'un pixel et on relit le pixel : ce qui en sort est toujours du
//     rouge, du vert et du bleu.
//
//  2. UN DÉTECTEUR QUI NE DÉTECTE RIEN. Un balayage qui rend « 0 problème »
//     ne prouve rien tant qu'on n'a pas vérifié qu'il sait en voir un.
//     `essayerLeDetecteur()` pose un texte volontairement illisible et
//     s'assure qu'il est trouvé. À lancer AVANT de croire un zéro.
//
//  Comment s'en servir, dans la console du site :
//     1. coller ce fichier
//     2. __contraste.essai()                 → le détecteur fonctionne-t-il ?
//     3. await __contraste.partout()         → tous les espaces, thème courant
// ============================================================================

(function () {
  const toile = document.createElement("canvas");
  toile.width = toile.height = 1;
  const pinceau = toile.getContext("2d", { willReadFrequently: true });

  /// Rouge, vert, bleu, opacité — quelle que soit l'écriture d'entrée.
  function couleur(c) {
    try {
      pinceau.fillStyle = "#ff00ff";          // un témoin : si la couleur est
      pinceau.fillStyle = c;                  // refusée, il ne bouge pas
      pinceau.clearRect(0, 0, 1, 1);
      pinceau.fillRect(0, 0, 1, 1);
      const d = pinceau.getImageData(0, 0, 1, 1).data;
      return [d[0], d[1], d[2], d[3] / 255];
    } catch (e) { return null; }
  }

  function clarte(rvb) {
    const a = rvb.slice(0, 3).map((v) => {
      v = v / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  }

  /// Le fond RÉELLEMENT vu derrière un texte : on remonte les parents jusqu'à
  /// en trouver un qui soit assez opaque pour compter.
  function fondDe(e) {
    let n = e;
    while (n && n !== document.documentElement) {
      const c = couleur(getComputedStyle(n).backgroundColor);
      if (c && c[3] > 0.55) return c;
      n = n.parentElement;
    }
    return couleur(getComputedStyle(document.body).backgroundColor) || [255, 255, 255, 1];
  }

  /// UN TEXTE POSÉ SUR UNE IMAGE, ON NE SAIT PAS LE JUGER.
  ///
  /// La vignette d'une recette, une carte avec une photo et un voile sombre
  /// par-dessus : le texte y est blanc, et c'est JUSTE. Mais on ne lit qu'une
  /// couleur de fond, pas l'image — on compterait donc une faute qui n'en est
  /// pas. Se taire vaut mieux que se tromper : un relevé qui crie au loup
  /// finit par ne plus être lu du tout.
  function surUneImage(e) {
    let n = e;
    while (n && n !== document.documentElement) {
      const s = getComputedStyle(n);
      if (s.backgroundImage && s.backgroundImage !== "none") return true;
      const c = couleur(s.backgroundColor);
      if (c && c[3] > 0.55) return false;
      n = n.parentElement;
    }
    return false;
  }

  function rapport(a, b) {
    const l1 = clarte(a), l2 = clarte(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }

  /// Les seuils de lisibilité reconnus : 4,5 pour du texte courant, 3 pour du
  /// gros texte (24 px, ou 18,7 px en gras).
  function seuilPour(style) {
    const t = parseFloat(style.fontSize);
    return (t >= 24 || (t >= 18.66 && +style.fontWeight >= 700)) ? 3.0 : 4.5;
  }

  /// UN TEXTE PEUT ÊTRE DANS LA PAGE SANS ÊTRE VU.
  ///
  /// Un panneau replié, une carte derrière une fenêtre, un menu fermé qui
  /// garde sa place : leurs textes existent, ont une taille, ne sont ni
  /// « hidden » ni transparents — et le balayage en comptait 180 là où il y en
  /// avait 17. On demande donc au navigateur qui se trouve VRAIMENT au point
  /// où le texte est censé être.
  function vraimentVu(e) {
    const r = e.getBoundingClientRect();
    const x = Math.min(innerWidth - 2, Math.max(2, r.left + Math.min(r.width / 2, 40)));
    const y = Math.min(innerHeight - 2, Math.max(2, r.top + r.height / 2));
    const dessus = document.elementFromPoint(x, y);
    return !!dessus && (dessus === e || e.contains(dessus) || dessus.contains(e));
  }

  /// Laisser la main au navigateur SANS passer par une minuterie.
  ///
  /// Dans un volet caché, un `setTimeout(…, 320)` met huit secondes, puis
  /// vingt : le navigateur bride les minuteries des pages qu'on ne regarde
  /// pas, et de plus en plus fort. Un balayage de 46 espaces devenait
  /// impossible. Un canal de messages, lui, n'est pas bridé : vingt
  /// aller-retours prennent une milliseconde.
  function respirer() {
    return new Promise((r) => {
      const c = new MessageChannel();
      c.port1.onmessage = () => r();
      c.port2.postMessage(0);
    });
  }

  function balayer(racine) {
    const mauvais = [];
    for (const e of (racine || document.body).querySelectorAll("*")) {
      const texte = [...e.childNodes]
        .filter((n) => n.nodeType === 3)
        .map((n) => n.textContent.trim())
        .join("");
      if (texte.length < 3) continue;
      const r = e.getBoundingClientRect();
      if (r.width < 8 || r.height < 6) continue;
      if (r.bottom < 0 || r.top > innerHeight) continue;
      const s = getComputedStyle(e);
      if (s.visibility === "hidden" || +s.opacity < 0.35) continue;
      if (!vraimentVu(e)) continue;
      if (surUneImage(e)) continue;
      const devant = couleur(s.color);
      if (!devant) continue;
      const ratio = rapport(devant, fondDe(e));
      const seuil = seuilPour(s);
      if (ratio < seuil) {
        mauvais.push({
          texte: texte.slice(0, 48),
          ratio: +ratio.toFixed(2),
          seuil,
          taille: Math.round(parseFloat(s.fontSize)),
          couleur: s.color,
          classe: (e.className || "").toString().slice(0, 90),
        });
      }
    }
    return mauvais;
  }

  /// LE DÉTECTEUR SAIT-IL DÉTECTER ? À lancer avant de croire un « 0 ».
  function essai() {
    const d = document.createElement("div");
    d.style.cssText = "position:fixed;top:40%;left:40%;background:#ffffff;"
                    + "color:#dddddd;font-size:14px;padding:8px;z-index:2147483647";
    d.textContent = "Un texte gris clair sur blanc, illisible";
    document.body.appendChild(d);
    const vu = balayer(d.parentElement).some((m) => m.texte.startsWith("Un texte gris"));
    d.remove();
    return vu ? "✅ le détecteur voit un cas illisible" : "❌ LE DÉTECTEUR EST AVEUGLE";
  }

  async function partout() {
    if (innerWidth < 320) return "écran de " + innerWidth + "px : onglet masqué, rien à conclure";
    const theme = document.documentElement.classList.contains("light-mode") ? "CLAIR" : "sombre";
    const ids = (window.nexus && window.nexus.espacesConnus && window.nexus.espacesConnus()) || [];
    const out = [];
    const accueil = balayer();
    if (accueil.length) out.push({ espace: "accueil", problemes: accueil });
    for (const id of ids) {
      try {
        window.nexus.ouvrir(id);
        for (let i = 0; i < 30; i++) await respirer();   // que React ait fini
        const p = balayer();
        if (p.length) out.push({ espace: id, problemes: p });
      } catch (e) { out.push({ espace: id, erreur: String(e) }); }
    }
    return { theme, espaces: ids.length + 1, aRevoir: out.length, detail: out };
  }

  window.__contraste = { essai, balayer, partout, couleur, rapport, respirer };
})();

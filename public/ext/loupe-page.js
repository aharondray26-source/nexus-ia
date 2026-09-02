// ============================================================================
//  LA LOUPE NEXUS — la partie qui vit DANS la page qu'on regarde.
//
//  Aharon : « dans l'extension Chrome je te l'avais déjà demandé mais tu t'en
//  foutais : il faut que tu rajoutes quelque chose comme Google Lens ».
//
//  Google Lens photographie un bout d'écran et cherche. Nexus fait mieux pour
//  quelqu'un qui révise : il prend le bout d'écran ET le VRAI texte qui se
//  trouve dessous — pas une lecture d'image approximative, le texte lui-même,
//  exact, accents compris. Puis il l'explique, le résume ou le traduit avec le
//  modèle qui tourne sur ta machine, sans clé et sans que rien ne sorte.
//
//  Ce fichier est injecté à la demande (permission « activeTab ») : il ne
//  tourne jamais tant qu'on ne l'a pas appelé.
// ============================================================================
(() => {
  // Deux appuis de suite ne doivent pas empiler deux loupes.
  if (window.__nexusLoupe) { window.__nexusLoupe.recommencer(); return; }

  const ID = "nexus-loupe-" + Math.random().toString(36).slice(2, 8);
  const racine = document.createElement("div");
  racine.id = ID;
  // Le mode « fermé » : la page ne peut pas repeindre nos couleurs, et les
  // nôtres ne débordent pas sur la page.
  const ombre = racine.attachShadow({ mode: "open" });
  racine.style.cssText = "position:fixed;inset:0;z-index:2147483647";
  document.documentElement.appendChild(racine);

  ombre.innerHTML = `
    <style>
      :host{all:initial}
      *{box-sizing:border-box;margin:0;font-family:-apple-system,BlinkMacSystemFont,
        "SF Pro Text",Inter,system-ui,"Segoe UI",Roboto,sans-serif}
      .voile{position:fixed;inset:0;cursor:crosshair;
        background:rgba(6,7,16,.42);backdrop-filter:saturate(.72) blur(.5px);
        animation:vientDoux .22s cubic-bezier(.32,.72,0,1) both}
      @keyframes vientDoux{from{opacity:0}to{opacity:1}}
      /* La zone choisie n'est pas assombrie : on la « perce » avec une ombre
         portée immense, ce qui évite quatre rectangles à recalculer. */
      .trou{position:fixed;border-radius:9px;pointer-events:none;
        box-shadow:0 0 0 100vmax rgba(6,7,16,.42),0 10px 40px -8px rgba(0,0,0,.6);
        outline:1.5px solid rgba(165,166,255,.95);
        outline-offset:0}
      .trou::after{content:'';position:absolute;inset:-1.5px;border-radius:9px;
        box-shadow:inset 0 0 0 1px rgba(255,255,255,.22)}
      .coin{position:fixed;width:11px;height:11px;pointer-events:none;
        border:2px solid #a5a6ff;border-radius:3px}
      .aide{position:fixed;left:50%;transform:translateX(-50%);
        top:22px;padding:9px 15px;border-radius:999px;font-size:13px;color:#eef;
        background:rgba(18,18,30,.86);border:1px solid rgba(255,255,255,.12);
        box-shadow:0 12px 34px -10px rgba(0,0,0,.75);
        display:flex;align-items:center;gap:9px;white-space:nowrap;
        animation:aideEntre .34s cubic-bezier(.34,1.4,.5,1) both}
      @keyframes aideEntre{from{opacity:0;transform:translateX(-50%) translateY(-9px)}
                           to{opacity:1;transform:translateX(-50%)}}
      .aide b{font-weight:600}
      .aide .tou{font-size:11px;color:#9a9ab0;border:1px solid rgba(255,255,255,.16);
        border-radius:5px;padding:1px 5px}
      .taille{position:fixed;padding:3px 7px;border-radius:6px;font-size:11px;
        color:#dfe0ff;background:rgba(18,18,30,.9);pointer-events:none;
        border:1px solid rgba(255,255,255,.12);font-variant-numeric:tabular-nums}
    </style>
    <div class="voile"></div>
    <div class="aide">
      <b>Loupe Nexus</b><span>— glisse sur ce que tu veux comprendre</span>
      <span class="tou">Échap</span>
    </div>
  `;

  const voile = ombre.querySelector(".voile");
  const aide  = ombre.querySelector(".aide");
  let trou = null, etiquette = null;
  let x0 = 0, y0 = 0, tire = false;

  function cadre(x, y, w, h) {
    if (!trou) {
      trou = document.createElement("div"); trou.className = "trou";
      etiquette = document.createElement("div"); etiquette.className = "taille";
      ombre.appendChild(trou); ombre.appendChild(etiquette);
    }
    Object.assign(trou.style, { left: x + "px", top: y + "px",
                                width: w + "px", height: h + "px" });
    etiquette.textContent = Math.round(w) + " × " + Math.round(h);
    // L'étiquette passe au-dessus quand on approche du bas de l'écran.
    const bas = y + h + 8;
    const versLeHaut = bas + 22 > innerHeight;
    Object.assign(etiquette.style, {
      left: Math.min(x, innerWidth - 74) + "px",
      top: (versLeHaut ? y - 24 : bas) + "px",
    });
  }

  function fin() {
    racine.remove();
    window.__nexusLoupe = null;
    document.removeEventListener("keydown", surTouche, true);
  }

  function surTouche(e) {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); fin(); }
  }
  document.addEventListener("keydown", surTouche, true);

  window.__nexusLoupe = { recommencer() { if (trou) { trou.remove(); etiquette.remove();
    trou = null; etiquette = null; } } };

  voile.addEventListener("pointerdown", (e) => {
    tire = true; x0 = e.clientX; y0 = e.clientY;
    aide.style.opacity = "0";
    cadre(x0, y0, 0, 0);
    voile.setPointerCapture(e.pointerId);
  });

  voile.addEventListener("pointermove", (e) => {
    if (!tire) return;
    cadre(Math.min(x0, e.clientX), Math.min(y0, e.clientY),
          Math.abs(e.clientX - x0), Math.abs(e.clientY - y0));
  });

  voile.addEventListener("pointerup", (e) => {
    if (!tire) return;
    tire = false;
    const x = Math.min(x0, e.clientX), y = Math.min(y0, e.clientY);
    const w = Math.abs(e.clientX - x0), h = Math.abs(e.clientY - y0);
    // Un clic sec n'est pas une sélection : on annule plutôt que de renvoyer
    // un rectangle vide et une réponse vide.
    if (w < 12 || h < 12) { fin(); return; }
    envoyer(x, y, w, h);
  });

  // ── Ce qui se trouve SOUS le rectangle ────────────────────────────────────
  //
  // La force de Nexus par rapport à une loupe d'image : on ne devine pas le
  // texte, on le LIT dans la page. Exact, accents compris, sans reconnaissance
  // de caractères et sans se tromper d'un « e » pour un « c ».
  function texteDedans(x, y, w, h) {
    const zone = { g: x, d: x + w, ht: y, b: y + h };
    const morceaux = [];
    const vus = new Set();
    const marcheur = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = marcheur.nextNode())) {
      const t = n.nodeValue;
      if (!t || !t.trim()) continue;
      const p = n.parentElement;
      if (!p || vus.has(p)) continue;
      // Un nœud peut s'étendre sur plusieurs lignes : on regarde chaque
      // rectangle, pas la boîte englobante, sinon un paragraphe entier
      // « touche » la sélection dès qu'une seule de ses lignes la touche.
      const r = document.createRange(); r.selectNodeContents(n);
      let pris = false;
      for (const b of r.getClientRects()) {
        if (b.width < 1 || b.height < 1) continue;
        const chevauche = b.left < zone.d && b.right > zone.g
                       && b.top < zone.b && b.bottom > zone.ht;
        if (chevauche) { pris = true; break; }
      }
      if (!pris) continue;
      vus.add(p);
      morceaux.push({ y: r.getBoundingClientRect().top, t: t.trim() });
    }
    morceaux.sort((a, b) => a.y - b.y);
    return morceaux.map((m) => m.t).join("\n").slice(0, 6000);
  }

  /// Les images franchement présentes dans le rectangle : de quoi proposer une
  /// recherche par l'image, comme Lens.
  function imagesDedans(x, y, w, h) {
    const out = [];
    for (const img of document.images) {
      const b = img.getBoundingClientRect();
      if (b.width < 24 || b.height < 24) continue;
      const gx = Math.max(0, Math.min(b.right, x + w) - Math.max(b.left, x));
      const gy = Math.max(0, Math.min(b.bottom, y + h) - Math.max(b.top, y));
      const part = (gx * gy) / (b.width * b.height);
      if (part > 0.25 && img.currentSrc) out.push({ src: img.currentSrc, part });
    }
    out.sort((a, b) => b.part - a.part);
    return out.slice(0, 3).map((o) => o.src);
  }

  function envoyer(x, y, w, h) {
    const paquet = {
      k: "nexus-loupe",
      zone: { x, y, w, h, dpr: window.devicePixelRatio || 1 },
      texte: texteDedans(x, y, w, h),
      images: imagesDedans(x, y, w, h),
      page: { titre: document.title, url: location.href },
    };
    // On efface AVANT la photo : sinon Nexus se photographie lui-même, et le
    // voile sombre se retrouve dans l'image.
    racine.style.display = "none";
    try {
      chrome.runtime.sendMessage(paquet, () => { void chrome.runtime.lastError; fin(); });
    } catch (e) { fin(); }
  }
})();

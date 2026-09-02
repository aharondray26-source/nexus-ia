// Sans barre a la fin, TOUJOURS (voir popup.js).
const SITE = "https://nexus-espace.netlify.app";

chrome.runtime.onInstalled.addListener(() => {
  // `removeAll` d'abord : sans ça, une mise à jour de l'extension essaie de
  // recréer des entrées qui existent déjà et Chrome refuse tout le lot en
  // silence — on se retrouve alors SANS menu, sans savoir pourquoi.
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "nexus-loupe", title: "Analyser avec la Loupe Nexus",
      contexts: ["page", "selection", "image"],
    });
    chrome.contextMenus.create({
      id: "nexus-note", title: "Enregistrer dans Nexus", contexts: ["selection"],
    });
    chrome.contextMenus.create({
      id: "nexus-tache", title: "Ajouter aux tâches Nexus", contexts: ["selection"],
    });
    chrome.contextMenus.create({
      id: "nexus-page", title: "Enregistrer cette page dans Nexus", contexts: ["page"],
    });
  });
});

chrome.contextMenus.onClicked.addListener((info, onglet) => {
  if (info.menuItemId === "nexus-loupe") { ouvrirLaLoupe(onglet); return; }
  let cle = "note", contenu = info.selectionText || "";
  if (info.menuItemId === "nexus-tache") cle = "tache";
  if (info.menuItemId === "nexus-page") {
    contenu = ((onglet && onglet.title) || "Page") + "\n" + (info.pageUrl || "");
  }
  if (!contenu.trim()) return;
  chrome.tabs.create({ url: SITE + "/?" + cle + "=" + encodeURIComponent(contenu) });
});

// Le raccourci clavier, s'il est réglé dans chrome://extensions/shortcuts.
chrome.commands?.onCommand.addListener((nom) => {
  if (nom !== "loupe") return;
  chrome.tabs.query({ active: true, currentWindow: true }, ([o]) => ouvrirLaLoupe(o));
});

// ── LA LOUPE ────────────────────────────────────────────────────────────────
//
// Aharon : « il faut que tu rajoutes quelque chose comme Google Lens ».
// On injecte la sélection dans la page (permission « activeTab » : rien ne
// tourne tant qu'il n'a pas demandé), on photographie, on rogne, et on ouvre
// un petit panneau Nexus qui explique.
function ouvrirLaLoupe(onglet) {
  if (!onglet || !onglet.id) return;
  // Chrome interdit d'injecter dans ses propres pages : le dire vaut mieux que
  // de ne rien faire du tout.
  const u = onglet.url || "";
  if (/^(chrome|edge|about|devtools|chrome-extension):/.test(u)
      || u.startsWith("https://chrome.google.com/webstore")) {
    chrome.notifications?.create({
      type: "basic", iconUrl: "icones/128.png", title: "Loupe Nexus",
      message: "Chrome interdit d'analyser ses propres pages. Essaie sur un site.",
    });
    return;
  }
  chrome.scripting.executeScript({ target: { tabId: onglet.id }, files: ["loupe-page.js"] })
    .catch(() => {});
}

chrome.runtime.onMessage.addListener((m, envoyeur, repondre) => {
  // Depuis la petite fenetre de l'extension : elle n'a pas le droit d'injecter
  // elle-meme, c'est le fond qui le fait.
  if (m && m.k === "ouvrir-loupe") {
    chrome.tabs.get(m.tabId, (o) => {
      if (!chrome.runtime.lastError) ouvrirLaLoupe(o);
    });
    repondre({ recu: true });
    return true;
  }
  if (!m || m.k !== "nexus-loupe") return;
  const onglet = envoyeur.tab;
  // On répond TOUT DE SUITE : la page attend ce signal pour retirer son voile,
  // et la photo doit être prise sans lui.
  repondre({ recu: true });

  // Un tour de boucle pour laisser la page effacer son voile avant la photo.
  setTimeout(() => {
    chrome.tabs.captureVisibleTab(onglet.windowId, { format: "png" }, (image) => {
      if (chrome.runtime.lastError) image = null;
      rogner(image, m.zone).then((rognee) => {
        chrome.storage.session.set({
          loupe: { texte: m.texte, images: m.images, page: m.page, image: rognee },
        }, () => {
          chrome.windows.create({
            url: "loupe.html", type: "popup", width: 460, height: 620,
          });
        });
      });
    });
  }, 60);
  return true;
});

/// Rogner la photo de l'onglet sur la zone choisie. Sans ça on montrerait
/// l'écran entier, et l'on ne reconnaîtrait pas ce qu'on a pris.
async function rogner(dataURL, z) {
  if (!dataURL || !z) return null;
  try {
    const reponse = await fetch(dataURL);
    const flou = await createImageBitmap(await reponse.blob());
    // La photo est en pixels d'écran, la sélection en points de page : sans le
    // rapport de densité, on rogne à côté sur un écran Retina.
    const k = z.dpr || 1;
    const x = Math.max(0, Math.round(z.x * k));
    const y = Math.max(0, Math.round(z.y * k));
    const w = Math.min(flou.width - x, Math.round(z.w * k));
    const h = Math.min(flou.height - y, Math.round(z.h * k));
    if (w < 2 || h < 2) return null;
    const toile = new OffscreenCanvas(w, h);
    toile.getContext("2d").drawImage(flou, x, y, w, h, 0, 0, w, h);
    const b = await toile.convertToBlob({ type: "image/png" });
    return await new Promise((r) => {
      const l = new FileReader();
      l.onloadend = () => r(l.result);
      l.readAsDataURL(b);
    });
  } catch (e) { return null; }
}

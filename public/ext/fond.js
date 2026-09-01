// Sans barre a la fin, TOUJOURS (voir popup.js).
const SITE = "https://nexus-espace.netlify.app";
chrome.runtime.onInstalled.addListener(() => {
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

chrome.contextMenus.onClicked.addListener((info, onglet) => {
  let cle = "note", contenu = info.selectionText || "";
  if (info.menuItemId === "nexus-tache") cle = "tache";
  if (info.menuItemId === "nexus-page") {
    contenu = ((onglet && onglet.title) || "Page") + "\n" + (info.pageUrl || "");
  }
  if (!contenu.trim()) return;
  chrome.tabs.create({ url: SITE + "/?" + cle + "=" + encodeURIComponent(contenu) });
});
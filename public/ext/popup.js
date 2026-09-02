// Sans barre a la fin, TOUJOURS. Les chemins la portent au debut : c'est la
// seule convention qui ne fabrique jamais une adresse a double barre.
const SITE = "https://nexus-espace.netlify.app";
let mode = "note";
const $ = (id) => document.getElementById(id);

function basculer(m) {
  mode = m;
  $("tNote").classList.toggle("on", m === "note");
  $("tTache").classList.toggle("on", m === "tache");
  $("texte").placeholder = m === "note" ? "Une idée, un rappel…" : "À faire…";
  $("texte").focus();
}
$("tNote").addEventListener("click", () => basculer("note"));
$("tTache").addEventListener("click", () => basculer("tache"));

function envoyer(contenu) {
  const t = (contenu || "").trim();
  if (!t) { $("texte").focus(); return; }
  chrome.tabs.create({ url: SITE + "/?" + mode + "=" + encodeURIComponent(t) });
  window.close();
}
$("ok").addEventListener("click", () => envoyer($("texte").value));
$("texte").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) envoyer($("texte").value);
});

// « Cette page » : le titre et l'adresse de l'onglet en cours.
$("page").addEventListener("click", async () => {
  const [onglet] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!onglet) return;
  envoyer(onglet.title + "\n" + onglet.url);
});

// Les raccourcis d'espace ouvrent le site EN DEMANDANT l'espace : il s'affiche
// alors en grand, centre. Avant, on tombait sur l'accueil sans rien de plus.
document.querySelectorAll(".esp button").forEach((b) => {
  b.addEventListener("click", () => {
    // NeoSchool est desormais un ESPACE de Nexus : il s'ouvre dedans, comme
    // les autres. Avant, ce raccourci faisait sortir vers un autre site — ce
    // qui n'a jamais eu l'air d'appartenir a Nexus.
    const u = SITE + "/?app=" + (b.dataset.neo ? "neoschool" : b.dataset.app);
    chrome.tabs.create({ url: u });
    window.close();
  });
});

// Le compte. On ne PRETEND pas que tout est synchronise : tant qu'Aharon ne
// s'est pas connecte sur le site, ses notes ne vivent que dans ce navigateur.
// Le pied de la fenetre le dit maintenant honnetement, et ce bouton mene la ou
// on se connecte.
$("compte").addEventListener("click", () => {
  chrome.tabs.create({ url: SITE + "/?app=settings" });
  window.close();
});
$("mac").addEventListener("click", () => {
  // On TELECHARGE, on n'ouvre pas un onglet dessus : selon la reponse du
  // serveur, Chrome affichait le site au lieu du fichier et l'on se retrouvait
  // sur la page d'accueil sans comprendre pourquoi.
  const u = SITE + "/Nexus-macOS.zip";
  if (chrome.downloads && chrome.downloads.download) {
    chrome.downloads.download({ url: u, filename: "Nexus-macOS.zip" }, (id) => {
      if (chrome.runtime.lastError || id === undefined) chrome.tabs.create({ url: u });
    });
  } else {
    chrome.tabs.create({ url: u });
  }
  window.close();
});

// On garde le brouillon : fermer la fenêtre ne doit pas effacer ce qu'on écrit.
chrome.storage.local.get(["brouillon", "mode"], (d) => {
  if (d.brouillon) $("texte").value = d.brouillon;
  if (d.mode) basculer(d.mode);
});
$("texte").addEventListener("input", () => {
  chrome.storage.local.set({ brouillon: $("texte").value, mode });
});

// La Loupe : on ferme la fenetre AVANT d'injecter, sinon Chrome la garde
// ouverte par-dessus la page et l'on ne voit pas ce qu'on selectionne.
document.getElementById("loupe")?.addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, ([o]) => {
    if (!o) return;
    chrome.runtime.sendMessage({ k: "ouvrir-loupe", tabId: o.id }, () => {
      void chrome.runtime.lastError;
      window.close();
    });
  });
});

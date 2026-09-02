// ============================================================================
//  LA LOUPE NEXUS — le panneau qui explique.
//
//  Il reçoit ce que la page a donné : la photo du bout d'écran, le VRAI texte
//  qui se trouvait dessous, et les images franchement présentes. Puis il
//  répond — avec Ollama s'il tourne, sinon avec le modèle du navigateur, qui
//  n'exige ni clé ni installation.
// ============================================================================
const $ = (i) => document.getElementById(i);
const c = $("c");
let PRISE = null;
// Declare AVANT tout appel : si le chargement de la prise echoue, le reste du
// fichier ne doit pas rester a moitie evalue. Une seule ligne qui leve, et
// `occupe` n'existait plus — les boutons ne repondaient plus du tout, sans un
// mot a l'ecran.
let occupe = false;

const CONSIGNE = "Tu es Nexus, l'assistant d'un lycéen français. Réponds en "
  + "français, avec justesse et sans bavardage. Si c'est un exercice ou une "
  + "formule, montre les étapes. Si le texte est abîmé ou coupé, dis-le "
  + "plutôt que d'inventer.";

const ACTES = [
  { id: "expliquer", nom: "Expliquer", fort: true,
    consigne: (t) => "Explique clairement ce passage, comme à quelqu'un de "
      + "première qui ne l'a pas compris :\n\n" + t },
  { id: "resumer", nom: "Résumer",
    consigne: (t) => "Résume ce passage en trois phrases au plus :\n\n" + t },
  { id: "traduire", nom: "Traduire en français",
    consigne: (t) => "Traduis ce passage en français. Si c'est déjà du "
      + "français, traduis-le en anglais.\n\n" + t },
  { id: "resoudre", nom: "Résoudre",
    consigne: (t) => "Résous cet exercice pas à pas, en montrant chaque étape "
      + "et le résultat final :\n\n" + t },
];

function ech(t) {
  return (t == null ? "" : String(t))
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/// Le peu de mise en forme que les modèles produisent : **gras** et listes.
/// Sans ça, la réponse arrive constellée d'étoiles.
function fmt(t) {
  return ech(t)
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/^[-*]\s+/gm, "· ");
}

// ── Ce que la page nous a donné ──────────────────────────────────────────────
// `storage.session` disparaît à la fermeture de Chrome : une capture d'écran
// n'a aucune raison de survivre à la session, et surtout pas de rester sur le
// disque. On l'entoure : si le rangement refuse, on le DIT au lieu de laisser
// une page morte.
try {
  chrome.storage.session.get(["loupe"], (v) => {
    PRISE = (v && v.loupe) || null;
    dessiner();
  });
} catch (e) {
  c.innerHTML = '<div class="vide">Je n\'arrive pas à relire la sélection.<br>'
    + 'Refais un glissé sur la page.</div>';
}

function dessiner() {
  if (!PRISE) {
    c.innerHTML = '<div class="vide">Rien à analyser.<br>Refais un glissé sur '
      + 'la page.</div>';
    return;
  }
  $("source").textContent = PRISE.page?.titre || "";
  $("source").title = PRISE.page?.url || "";
  c.innerHTML = "";

  if (PRISE.image) {
    const d = document.createElement("div");
    d.className = "cliche";
    const i = new Image();
    i.src = PRISE.image; i.alt = "";
    d.appendChild(i);
    c.appendChild(d);
  }

  const texte = (PRISE.texte || "").trim();

  // CE QUE NEXUS SAIT AVEC CERTITUDE, avant tout le reste.
  //
  // Le modèle se trompe en calcul avec aplomb — « x = -5 » pour « 3x + 7 = 22 »,
  // en six étapes bien présentées. Quand Nexus peut calculer lui-même, il
  // affiche le résultat exact ici, AVANT, et sous une autre forme : ce bloc-là
  // ne se discute pas.
  const certain = NexusMaths.resoudre(texte);
  if (certain) c.appendChild(blocCertain(certain));

  const actes = document.createElement("div");
  actes.className = "actes";
  if (texte) {
    for (const a of ACTES) {
      const b = document.createElement("button");
      b.className = "acte" + (a.fort ? " fort" : "");
      b.textContent = a.nom;
      b.onclick = () => repondre(a, texte);
      actes.appendChild(b);
    }
    const cop = document.createElement("button");
    cop.className = "acte"; cop.textContent = "Copier le texte";
    cop.onclick = () => {
      navigator.clipboard.writeText(texte).then(() => {
        cop.textContent = "Copié ✓";
        setTimeout(() => { cop.textContent = "Copier le texte"; }, 1600);
      });
    };
    actes.appendChild(cop);
  }
  // Chercher par l'IMAGE, comme Lens : seulement s'il y en avait vraiment une.
  if (PRISE.images && PRISE.images.length) {
    const b = document.createElement("button");
    b.className = "acte"; b.textContent = "Chercher cette image";
    b.onclick = () => chrome.tabs.create({
      url: "https://lens.google.com/uploadbyurl?url=" + encodeURIComponent(PRISE.images[0]),
    });
    actes.appendChild(b);
  }
  c.appendChild(actes);

  if (texte) {
    const t = document.createElement("div");
    t.className = "bloc";
    t.innerHTML = '<div class="sig">Ce que Nexus a lu</div>'
                + '<div class="txt">' + ech(texte) + "</div>";
    c.appendChild(t);
  } else {
    const v = document.createElement("div");
    v.className = "vide";
    v.innerHTML = "Pas de texte dans cette zone.<br>"
      + (PRISE.images?.length ? "Tu peux chercher l'image ci-dessus."
                              : "Refais un glissé sur du texte.");
    c.appendChild(v);
  }
}

function blocCertain(r) {
  const d = document.createElement("div");
  d.className = "sur";
  const sig = document.createElement("div");
  sig.className = "sig";
  sig.textContent = r.genre === "calcul" ? "✓ Calculé exactement"
                                         : "✓ Résolu exactement";
  d.appendChild(sig);

  const v = document.createElement("div");
  v.className = "val"; v.textContent = r.texte;
  d.appendChild(v);

  if (r.etapes) {
    const ol = document.createElement("ol");
    for (const e of r.etapes) {
      const li = document.createElement("li");
      li.textContent = e; ol.appendChild(li);
    }
    d.appendChild(ol);
  }
  if (r.verif) {
    const p = document.createElement("div");
    p.className = "verif"; p.textContent = r.verif;
    d.appendChild(p);
  }
  return d;
}

// ── Répondre ────────────────────────────────────────────────────────────────
async function repondre(acte, texte) {
  if (occupe) return;
  occupe = true;
  document.querySelectorAll(".acte").forEach((b) => (b.disabled = true));

  const bloc = document.createElement("div");
  bloc.className = "bloc";
  bloc.innerHTML = '<div class="sig">' + ech(acte.nom) + "</div>";
  const corps = document.createElement("div");
  corps.className = "rep";
  corps.innerHTML = '<span class="pense"><i></i><i></i><i></i></span>';
  bloc.appendChild(corps);
  c.appendChild(bloc);
  bloc.scrollIntoView({ behavior: "smooth", block: "end" });

  let barre = null, vue = 0;
  const avance = (etape, part) => {
    if (!barre) {
      corps.textContent = "";
      barre = document.createElement("div");
      barre.className = "jauge"; barre.innerHTML = "<i></i>";
      corps.appendChild(document.createTextNode(""));
      corps.appendChild(barre);
    }
    corps.firstChild.nodeValue = etape;
    // Une jauge qui recule se lit comme une panne.
    vue = Math.max(vue, Math.max(0.02, part));
    barre.firstChild.style.width = Math.round(vue * 100) + "%";
  };

  try {
    const quel = (await new Promise((r) =>
      chrome.storage.local.get(["modeleLocal"], r)))?.modeleLocal || "";
    const r = await NexusModele.demander(CONSIGNE, acte.consigne(texte), avance, quel);
    if (r) {
      corps.innerHTML = fmt(r.texte);
      bloc.querySelector(".sig").textContent = acte.nom + " · " + r.moteur;
    } else {
      corps.textContent = "Ce navigateur ne sait pas faire tourner de modèle, "
        + "et aucun n'est installé sur la machine.";
    }
  } catch (e) {
    corps.textContent = "Je n'ai pas pu répondre : " + (e && e.message);
  } finally {
    occupe = false;
    document.querySelectorAll(".acte").forEach((b) => (b.disabled = false));
    bloc.scrollIntoView({ behavior: "smooth", block: "end" });
  }
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") window.close();
});

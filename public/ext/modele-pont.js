// ============================================================================
//  LE MODÈLE DE L'EXTENSION — UNE SEULE SOURCE.
//
//  Le nouvel onglet et la Loupe ont tous les deux besoin de répondre sans clé.
//  Ce fichier est le seul endroit qui sait le faire : recopier ces cinquante
//  lignes dans les deux, ce serait exactement ce qu'Aharon me reproche — « il
//  y a beaucoup trop de fichiers avec le même nom », une correction faite d'un
//  côté qui manque de l'autre sans que rien ne le dise.
//
//  La bibliothèque (`modele.js`) est LIVRÉE AVEC L'EXTENSION : Chrome interdit
//  à une extension de charger un script depuis internet.
// ============================================================================
const NexusModele = (() => {
  const MODELES = [
    { id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC", nom: "Nexus local", poids: "environ 1,1 Go" },
    { id: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC", nom: "Nexus léger", poids: "environ 380 Mo" },
  ];
  const OLLAMA = "http://127.0.0.1:11434";

  let cerveau = null;
  let enRoute = null;
  let ollamaConnu = null;

  const possible = () => typeof navigator !== "undefined" && !!navigator.gpu;

  // Traduire l'avancement, qui arrive en anglais. Un lycéen qui voit
  // « Fetching param cache[12/38]: 252MB loaded » ne sait pas si ça marche.
  //
  // La part d'avancement ne vient PAS du champ `progress` de la bibliothèque :
  // pendant tout le téléchargement il reste à zéro, et la jauge restait collée
  // à 2 % pendant des minutes — ce qui se lit comme une panne. Le vrai chiffre
  // est écrit dans la phrase anglaise ; c'est celui-là qu'on lit.
  function enFrancais(t, brut) {
    if (!t) return { texte: "Préparation…", part: brut || 0 };
    const m = t.match(/\[(\d+)\/(\d+)\]/);
    const pc = t.match(/(\d+(?:\.\d+)?)%\s*complet/i);
    const mo = t.match(/([\d.]+)\s*MB\s*(?:fetched|loaded)/i);
    const p = pc ? Math.min(1, parseFloat(pc[1]) / 100)
                 : (m ? Number(m[1]) / Number(m[2]) : (brut || 0));
    const q = mo ? " · " + Math.round(parseFloat(mo[1])) + " Mo" : "";
    if (/fetch|download/i.test(t)) return { texte: "Téléchargement du modèle" + q, part: p * 0.8 };
    if (/cache/i.test(t))          return { texte: "Chargement du modèle" + q, part: 0.8 + p * 0.15 };
    if (/shader|gpu/i.test(t))     return { texte: "Mise en route sur la carte graphique…", part: 0.95 + p * 0.05 };
    if (/finish|complet|ready/i.test(t)) return { texte: "Prêt.", part: 1 };
    if (/load|init|compil/i.test(t)) return { texte: "Mise en route du modèle…", part: Math.max(p, 0.8) };
    return { texte: "Préparation…", part: p };
  }

  /// Quel modèle est DÉJÀ dans ce navigateur, s'il y en a un.
  async function dejaLa() {
    try {
      const v = await new Promise((r) => chrome.storage.local.get(["modeleLocalInstalle"], r));
      return v && v.modeleLocalInstalle ? v.modeleLocalInstalle : null;
    } catch (e) { return null; }
  }

  async function preparer(avance, quel) {
    if (cerveau) return cerveau;
    if (enRoute) return enRoute;
    enRoute = (async () => {
      const lib = await import("./modele.js");
      const id = MODELES.some((m) => m.id === quel) ? quel : MODELES[0].id;
      const moteur = await lib.CreateMLCEngine(id, {
        initProgressCallback: (p) => {
          if (!avance) return;
          const e = enFrancais(String(p && p.text || ""),
                               typeof p?.progress === "number" ? p.progress : 0);
          avance(e.texte, e.part);
        },
      });
      cerveau = { moteur, id };
      try { chrome.storage.local.set({ modeleLocalInstalle: id }); } catch (e) {}
      return cerveau;
    })();
    try { return await enRoute; } finally { enRoute = null; }
  }

  /// Le modèle installé sur la MACHINE (Ollama), s'il y en a un. Une extension
  /// peut lui parler directement, sans que tu aies rien à régler.
  async function ollama() {
    if (ollamaConnu !== null) return ollamaConnu;
    try {
      const regle = { origins: ["http://127.0.0.1:11434/*"] };
      const deja = await new Promise((r) => chrome.permissions.contains(regle, r));
      if (!deja) { ollamaConnu = false; return false; }
    } catch (e) { /* pas d'API des permissions : on tente quand même */ }
    try {
      const c = new AbortController();
      const t = setTimeout(() => c.abort(), 1500);
      const r = await fetch(OLLAMA + "/api/tags", { signal: c.signal });
      clearTimeout(t);
      if (!r.ok) { ollamaConnu = false; return false; }
      const d = await r.json();
      const noms = (d.models || []).map((m) => m.name).filter(Boolean);
      const prefs = ["llama3.2","llama3.1","llama3","qwen2.5","mistral","gemma2","gemma3","phi3"];
      ollamaConnu = noms.find((n) => prefs.some((p) => n.startsWith(p))) || noms[0] || false;
    } catch (e) { ollamaConnu = false; }
    return ollamaConnu;
  }

  async function parOllama(consigne, question) {
    const m = await ollama();
    if (!m) return null;
    try {
      const r = await fetch(OLLAMA + "/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: m, stream: false, messages: [
          { role: "system", content: consigne }, { role: "user", content: question }] }),
      });
      if (!r.ok) return null;
      const d = await r.json();
      const t = d && d.message && d.message.content;
      return (typeof t === "string" && t.trim()) ? { texte: t.trim(), moteur: m + " · sur ta machine" } : null;
    } catch (e) { return null; }
  }

  async function parLeNavigateur(consigne, question, avance, quel) {
    if (!possible()) return null;
    const c = await preparer(avance, quel);
    const r = await c.moteur.chat.completions.create({
      messages: [{ role: "system", content: consigne }, { role: "user", content: question }],
      temperature: 0.25,
    });
    const t = r?.choices?.[0]?.message?.content;
    return (typeof t === "string" && t.trim())
      ? { texte: t.trim(), moteur: "Nexus local · dans ton navigateur" } : null;
  }

  /// LE MODÈLE EN LIGNE, hébergé avec le site.
  ///
  /// C'est le meilleur chemin de tous : rien à télécharger, rien à installer,
  /// une vraie réponse tout de suite. Aharon : « je veux que les utilisateurs
  /// n'aient simplement rien à faire ». L'extension s'adresse donc au même
  /// serveur que le site, à la même seconde où il est publié.
  // Ecrit ici en toutes lettres, PAS repris d'une variable d'un autre fichier :
  // ce fichier est charge AVANT « onglet.js », et la Loupe ne le charge pas du
  // tout. Sans barre a la fin, toujours.
  const SITE_IA = "https://nexus-espace.netlify.app";
  let enLigneConnu = null;

  async function enLigneDisponible() {
    if (enLigneConnu !== null) return enLigneConnu;
    try {
      const c = new AbortController();
      const t = setTimeout(() => c.abort(), 2500);
      const r = await fetch(SITE_IA + "/api/health", { signal: c.signal, cache: "no-store" });
      clearTimeout(t);
      const d = r.ok ? await r.json() : null;
      enLigneConnu = !!(d && d.modeleEnLigne);
    } catch (e) { enLigneConnu = false; }
    return enLigneConnu;
  }

  async function parLeSite(consigne, question) {
    if (!(await enLigneDisponible())) return null;
    try {
      const r = await fetch(SITE_IA + "/api/gemini/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question, history: [],
                               context: { systemCtx: consigne } }),
      });
      if (!r.ok) return null;
      const d = await r.json();
      return (d && d.reply)
        ? { texte: String(d.reply).trim(), moteur: "Nexus en ligne" } : null;
    } catch (e) { return null; }
  }

  /// La cascade complète, du plus simple au plus autonome :
  ///   1. le modèle EN LIGNE, hébergé avec le site — rien à faire, rien à
  ///      télécharger, c'est le chemin normal ;
  ///   2. Ollama, s'il tourne déjà sur cette machine ;
  ///   3. le modèle du navigateur, qui n'exige rien de personne mais se
  ///      télécharge une fois.
  async function demander(consigne, question, avance, quel) {
    const s = await parLeSite(consigne, question);
    if (s) return s;
    const o = await parOllama(consigne, question);
    if (o) return o;
    return parLeNavigateur(consigne, question, avance, quel);
  }

  return { MODELES, possible, demander, preparer, dejaLa, enFrancais, ollama,
           enLigneDisponible };
})();

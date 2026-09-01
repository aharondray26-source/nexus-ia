// Balayage d'un espace : on cherche ce qui deborde et ce qui est mal ecrit.
// Piege de mesure : un onglet masque ne fait pas AVANCER les animations. La
// fenetre reste alors figee sur la premiere image de sa naissance —
// scale(.9) translateY(9) — et l'on croit lire un debordement de 3px qui
// n'existe pas. On coupe donc animations et transitions avant de mesurer.
(function figer() {
  if (document.getElementById('nx-fige')) return;
  const st = document.createElement('style');
  st.id = 'nx-fige';
  st.textContent = '*{animation:none !important;transition:none !important}';
  document.head.appendChild(st);
})();

window.__bal = async function (id) {
  // Un onglet masque a un viewport de taille NULLE. Tout parait alors deborder
  // de plus de mille pixels, et l'on part chasser un fantome. On refuse de
  // conclure quoi que ce soit dans ces conditions.
  if (innerWidth < 320 || innerHeight < 240) {
    return { id, erreur: 'écran de ' + innerWidth + '×' + innerHeight +
             ' : onglet masqué, rien à conclure — remets la page au premier plan' };
  }
  const S = window.useWindowsDebug;
  window.nexus.ouvrir(id);
  await new Promise(r => setTimeout(r, 700));  // l'animation de naissance doit etre FINIE : sinon on mesure un scale(0.9) et on croit a un debordement

  // La fenetre la plus haute = celle qu'on vient d'ouvrir.
  const fens = [...document.querySelectorAll('div')].filter(e => {
    const c = (e.className || '').toString();
    return /absolute/.test(c) && /rounded-2xl/.test(c) && /flex-col/.test(c);
  });
  if (!fens.length) return { id, erreur: 'fenetre introuvable' };
  const fen = fens.reduce((a, b) =>
    (+getComputedStyle(b).zIndex || 0) >= (+getComputedStyle(a).zIndex || 0) ? b : a);
  const R = fen.getBoundingClientRect();

  const pb = [];
  if (R.right > innerWidth + 1) pb.push(`fenetre deborde a droite de ${Math.round(R.right - innerWidth)}px`);
  if (R.bottom > innerHeight + 1) pb.push(`fenetre deborde en bas de ${Math.round(R.bottom - innerHeight)}px`);
  if (R.left < -1) pb.push(`fenetre sort a gauche`);
  if (R.width < 320) pb.push(`fenetre trop etroite (${Math.round(R.width)}px)`);

  // Contenu coupe : un element dont le texte depasse son cadre sans pouvoir
  // defiler. C'est exactement « les boutons sont coupes, illisibles ».
  let coupes = 0; const exemples = [];
  for (const e of fen.querySelectorAll('*')) {
    const s = getComputedStyle(e);
    if (s.display === 'none' || s.visibility === 'hidden') continue;
    const debordeX = e.scrollWidth - e.clientWidth > 2;
    const peutDefiler = /auto|scroll/.test(s.overflowX);
    // Une troncature VOULUE (« Rapport de projet… ») n'est pas un defaut :
    // elle a un text-overflow ou un nombre de lignes fixe.
    const volontaire = s.textOverflow === 'ellipsis' ||
                       (s.webkitLineClamp && s.webkitLineClamp !== 'none') ||
                       e.tagName === 'INPUT' || e.tagName === 'TEXTAREA';
    if (debordeX && !peutDefiler && !volontaire && s.overflow !== 'visible' && e.clientWidth > 0) {
      coupes++;
      if (exemples.length < 4)
        exemples.push((e.textContent || '').trim().slice(0, 46) || '<' + e.tagName.toLowerCase() + '>');
    }
    const r = e.getBoundingClientRect();
    if (r.width > 0 && (r.right > R.right + 3 || r.left < R.left - 3) && s.position !== 'fixed') {
      const t = (e.textContent || '').trim();
      if (t && exemples.length < 6 && !exemples.includes('HORS:' + t.slice(0, 40)))
        exemples.push('HORS:' + t.slice(0, 40));
    }
  }
  if (coupes) pb.push(`${coupes} element(s) au texte coupe`);

  // Accents manquants dans le texte VU par Aharon.
  const txt = fen.innerText || '';
  const fautes = [];
  const mots = {
    'cree':'créé','creer':'créer','Creer':'Créer','cle':'clé','Cle':'Clé',
    'donnees':'données','Donnees':'Données','parametres':'paramètres','Parametres':'Paramètres',
    'reglages':'réglages','Reglages':'Réglages','fenetre':'fenêtre','Fenetre':'Fenêtre',
    'fenetres':'fenêtres','Fenetres':'Fenêtres','recherche':null,'resultat':'résultat',
    'Resultat':'Résultat','resultats':'résultats','Resultats':'Résultats','requete':'requête',
    'Requete':'Requête','apercu':'aperçu','Apercu':'Aperçu','selectionne':'sélectionné',
    'telecharger':'télécharger','Telecharger':'Télécharger','prefere':'préféré',
    'derniere':'dernière','Derniere':'Dernière','premiere':'première','Premiere':'Première',
    'deja':'déjà','Deja':'Déjà','memoire':'mémoire','Memoire':'Mémoire','modele':'modèle',
    'Modele':'Modèle','systeme':'système','Systeme':'Système','probleme':'problème',
    'Probleme':'Problème','elements':'éléments','Elements':'Éléments','element':'élément',
    'Element':'Élément','ecrire':'écrire','Ecrire':'Écrire','ecran':'écran','Ecran':'Écran',
    'etape':'étape','Etape':'Étape','general':'général','General':'Général','securite':'sécurité',
    'Securite':'Sécurité','activite':'activité','Activite':'Activité','journee':'journée',
    'Journee':'Journée','annee':'année','Annee':'Année','duree':'durée','Duree':'Durée',
    'reussi':'réussi','Reussi':'Réussi','termine':'terminé','Termine':'Terminé',
    'enregistre':'enregistré','Enregistre':'Enregistré',
    'supprime':'supprimé','Supprime':'Supprimé','Ajoute':'Ajouté',
    'a ecrire':'à écrire','Voila':'Voilà','tres':'très','Tres':'Très','apres':'après',
    'Apres':'Après','ou est':'où est','deuxieme':'deuxième','troisieme':'troisième',
    'evenement':'évènement','Evenement':'Évènement','numero':'numéro','Numero':'Numéro',
    'reponse':'réponse','Reponse':'Réponse','question':null,'video':'vidéo','Video':'Vidéo',
    'meteo':'météo','Meteo':'Météo','categorie':'catégorie','Categorie':'Catégorie',
    'prive':'privé','Prive':'Privé','cote':null,'defaut':'défaut','Defaut':'Défaut'
  };
  const vus = new Set();
  for (const m of txt.split(/[^A-Za-zÀ-ÿ']+/)) {
    if (mots[m] && !vus.has(m)) { vus.add(m); fautes.push(m + ' → ' + mots[m]); }
  }
  return { id, pb, exemples, fautes,
           rect: { x: Math.round(R.x), y: Math.round(R.y), w: Math.round(R.width), h: Math.round(R.height) } };
};
'ok';

// ── Comment s'en servir ─────────────────────────────────────────────────────
// 1. `npm run build`, puis servir `dist/` (ou lancer « Essayer le site » dans
//    l'application Mac).
// 2. Dans la console de la page, coller ce fichier.
// 3. `for (const id of window.nexus.espacesConnus()) console.log(await __bal(id))`
//    ou, plus court : `await __balTout()`.
//
// Il repond, pour chaque espace : ce qui DEBORDE de la fenetre, ce qui est
// COUPE sans pouvoir defiler, et les mots francais ecrits sans accent dans le
// texte reellement affiche.
//
// ATTENTION au piege de mesure : un onglet masque ne fait pas avancer les
// animations, la fenetre reste figee sur la premiere image de sa naissance
// (scale .9, translateY 9) et l'on croit lire un debordement de 3 px qui
// n'existe pas. Le fichier coupe donc animations et transitions avant de
// mesurer — ne pas retirer ce garde-fou.
window.__balTout = async function () {
  const ids = (window.nexus.espacesConnus && window.nexus.espacesConnus()) || [];
  const mauvais = [];
  for (const id of ids) {
    const r = await window.__bal(id);
    if (r.erreur || r.pb.length || r.fautes.length) mauvais.push(r);
  }
  console.log(mauvais.length ? mauvais : 'Les ' + ids.length + ' espaces sont propres.');
  return mauvais;
};

#!/bin/zsh
# ============================================================================
#  À LANCER AVANT DE METTRE LE SITE EN LIGNE.
#
#  Aharon : « vérifie sur le site que je vais publier que tous les
#  téléchargements mènent à la dernière version ».
#
#      ./outils/avant-de-publier.sh
#
#  Une seule commande, et elle dit OUI ou NON. Rien à interpréter.
# ============================================================================
cd "$(dirname "$0")/.."
echec=0

echo "══ 1/5  Le code tient debout ══"
npx tsc --noEmit || echec=1
echo "  ✓ types"

echo
echo "══ 2/5  Le site se construit ══"
npm run build 2>&1 | tail -2 || echec=1

echo
echo "══ 3/5  Le calcul certain ne se trompe pas ══"
# Un modèle qui tourne dans un navigateur se trompe en calcul AVEC APLOMB.
# Ce que Nexus affirme, il doit pouvoir le prouver.
node outils/maths.cjs | tail -1 || echec=1

echo
echo "══ 4/5  Les formules sont lisibles ══"
# Les modèles écrivent les maths en LaTeX ; Nexus affiche du texte. Sans
# nettoyage, on lit « \( U_1 \times q^{(n-1)} \) ».
node outils/formules.cjs | tail -2 || echec=1

echo
echo "══ 5/5  Les téléchargements mènent à la dernière version ══"
node outils/telechargements.cjs || echec=1

echo
if [ "$echec" = "0" ]; then
  echo "TU PEUX PUBLIER."
  echo "  · git push          (Netlify publie le visuel ET le modèle)"
  echo "  · l'extension est dans Téléchargements/Nexus-extension-Chrome"
  echo
  echo "  NE GLISSE PLUS le dossier « dist » sur Netlify : ça ne publie que le"
  echo "  visuel, le modèle reste sur ce Mac, et le site en ligne redemande une"
  echo "  clé à chaque visiteur. Voir METTRE-EN-LIGNE.md — c'est deux réglages,"
  echo "  une seule fois."
  echo
  echo "  Après la mise en ligne, vérifie d'un coup d'œil :"
  echo "      https://nexus-espace.netlify.app/api/health"
  echo "      → « modeleEnLigne: true » = tout le monde a un modèle, sans rien faire."
else
  echo "NE PUBLIE PAS ENCORE : regarde les ✗ ci-dessus."
fi
exit $echec

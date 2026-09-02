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

echo "══ 1/4  Le code tient debout ══"
npx tsc --noEmit || echec=1
echo "  ✓ types"

echo
echo "══ 2/4  Le site se construit ══"
npm run build 2>&1 | tail -2 || echec=1

echo
echo "══ 3/4  Le calcul certain ne se trompe pas ══"
# Un modèle qui tourne dans un navigateur se trompe en calcul AVEC APLOMB.
# Ce que Nexus affirme, il doit pouvoir le prouver.
node outils/maths.cjs | tail -1 || echec=1

echo
echo "══ 4/4  Les téléchargements mènent à la dernière version ══"
node outils/telechargements.cjs || echec=1

echo
if [ "$echec" = "0" ]; then
  echo "TU PEUX PUBLIER."
  echo "  · glisse le dossier « dist » sur Netlify"
  echo "  · l'extension est dans Téléchargements/Nexus-extension-Chrome"
else
  echo "NE PUBLIE PAS ENCORE : regarde les ✗ ci-dessus."
fi
exit $echec

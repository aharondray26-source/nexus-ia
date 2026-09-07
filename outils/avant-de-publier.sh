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

echo "══ 1/12  Le code tient debout ══"
npx tsc --noEmit || echec=1
echo "  ✓ types"

echo
echo "══ 2/12  Le site se construit ══"
npm run build 2>&1 | tail -2 || echec=1

echo
echo "══ 3/12  Le calcul certain ne se trompe pas ══"
# Un modèle qui tourne dans un navigateur se trompe en calcul AVEC APLOMB.
# Ce que Nexus affirme, il doit pouvoir le prouver.
node outils/maths.cjs | tail -1 || echec=1

echo
echo "══ 4/12  Les formules sont lisibles ══"
# Les modèles écrivent les maths en LaTeX ; Nexus affiche du texte. Sans
# nettoyage, on lit « \( U_1 \times q^{(n-1)} \) ».
node outils/formules.cjs | tail -2 || echec=1

echo
echo "══ 5/12  Les téléchargements mènent à la dernière version ══"
if ! node outils/telechargements.cjs; then
  # LA PANNE QUI REVIENT TOUJOURS, ET QUI N'EST PAS UNE PANNE.
  #
  # L'application macOS embarque une copie du site. Reconstruire le site APRÈS
  # l'application laisse donc l'application avec l'ancien — et Aharon lit
  # « NE PUBLIE PAS » sans rien pouvoir y faire lui-même. Or la correction
  # tient en une commande : reconstruire l'application. On la lance, et on
  # revérifie. On ne se plaint que si ça ne suffit pas.
  if [ -x ../nexus-mac/construire.sh ]; then
    echo
    echo "  → l'application macOS embarque un site plus ancien : je la reconstruis."
    (cd ../nexus-mac && ./construire.sh 2>&1 | tail -3)
    echo
    node outils/telechargements.cjs || echec=1
  else
    echec=1
  fi
fi

echo
echo "══ 6/12  La bureautique rend de VRAIS fichiers ══"
# Un .docx de 200 octets et un PDF sans texte passeraient pour des succès :
# le banc relit chaque fichier produit.
npx tsx outils/bureautique.mts | tail -1 || echec=1

echo
echo "══ 7/12  Les deux mascottes sont à parité ══"
# Aharon : « aucune capacité que la mascotte du site ait et que celle de macOS
# n'ait pas ». Le banc vérifie aussi que chaque case cochée existe VRAIMENT
# dans le code des deux côtés.
npx tsx outils/parite.mts | tail -1 || echec=1

echo
echo "══ 8/12  L'application Windows tient debout ══"
# On ne peut pas compiler du Rust sur ce Mac — le réseau bloque les serveurs de
# Rust — et l'on ne peut pas lancer Windows dessus. Mais on vérifie ce qui
# casse VRAIMENT dans ce genre de projet et qui ne se voit pas à la
# compilation : les noms de commandes entre le Rust et l'interface, les
# fichiers que la configuration promet, et les garde-fous des automatisations.
npx tsx outils/windows.mts | tail -1 || echec=1

echo
echo "══ 9/12  La mascotte comprend bien ce qu'on lui demande sur le PC ══"
# Un routeur d'intentions se casse toujours pareil : il attrape trop.
# « c'est quoi VLC ? » ne doit pas installer VLC.
npx tsx outils/intentions.mts | tail -1 || echec=1

echo
echo "══ 10/12  Le modèle est joignable depuis les applications ══"
# Il manquait l'autorisation d'origine : les applications Windows et macOS
# n'avaient AUCUNE intelligence, sans le moindre message. Mais pas d'ouverture
# à tout le monde non plus — la clé d'Aharon serait vidée.
node outils/origines.mjs | tail -1 || echec=1

echo
echo "══ 11/12  Nexus trouve son serveur, où qu'il soit ══"
npx tsx outils/adresse-api.mts | tail -1 || echec=1

echo
echo "══ 12/12  L'atelier qui fabrique l'installateur Windows ══"
if [ -f .github/workflows/windows.yml ]; then
  echo "  ✓ .github/workflows/windows.yml est là — GitHub fabriquera le .exe"
  echo "    (Actions → « Nexus pour Windows » → Run workflow)"
else
  echo "  ✗ l'atelier GitHub a disparu : plus personne ne peut fabriquer le .exe"
  echec=1
fi

echo
if [ "$echec" = "0" ]; then
  echo "TU PEUX PUBLIER."
  echo "  · git push          (Netlify publie le visuel ET le modèle)"
  echo "  · l'extension est dans Téléchargements/Nexus-extension-Chrome"
  echo "    (et Nexus-extension-Firefox pour Firefox)"
  echo "  · l'installateur Windows : GitHub → Actions → « Nexus pour Windows »"
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

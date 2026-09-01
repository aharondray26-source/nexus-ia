#!/bin/zsh
# UNE SEULE SOURCE pour l'extension : `public/ext/`.
#
# Le site fabrique le .zip a telecharger en LISANT ces fichiers (voir
# `telechargerExtension` dans MacIntegration.tsx). Ce script en derive les deux
# autres formes : le dossier qu'Aharon charge dans Chrome, et un .zip de
# secours. Ainsi une correction faite une fois arrive partout.
#
# Avant, l'extension existait en DEUX exemplaires — le dossier d'Aharon, et
# mille cinq cents lignes recopiees dans MacIntegration.tsx. Corriger l'un
# laissait l'autre en arriere, sans que rien ne le dise.
set -e
cd "$(dirname "$0")/.."
SRC=public/ext
DEST=~/Downloads/nexus-extension

for f in manifest.json onglet.html onglet.js popup.html popup.js fond.js LISEZ-MOI.txt; do
  [ -f "$SRC/$f" ] || { echo "  ✗ $SRC/$f manque"; exit 1; }
done

mkdir -p "$DEST/icones"
for f in manifest.json onglet.html onglet.js popup.html popup.js fond.js LISEZ-MOI.txt; do
  cp "$SRC/$f" "$DEST/$f"
done
# Le manifeste nomme les icones « icones/16.png » ; dans public/ elles sont a
# plat, parce que le site les sert par leur adresse.
cp "$SRC/icone-16.png"  "$DEST/icones/16.png"
cp "$SRC/icone-48.png"  "$DEST/icones/48.png"
cp "$SRC/icone-128.png" "$DEST/icones/128.png"

V=$(grep '"version"' "$SRC/manifest.json" | sed 's/[^0-9.]//g' | sed 's/\.$//')
rm -f ~/Downloads/nexus-extension-*.zip
( cd ~/Downloads && ditto -c -k --sequesterRsrc nexus-extension "nexus-extension-$V.zip" )

node --check "$DEST/onglet.js"
node --check "$DEST/popup.js"
node --check "$DEST/fond.js"
python3 -c "import json;json.load(open('$DEST/manifest.json'))"

echo "  ✓ extension $V — dossier « $DEST » et zip « nexus-extension-$V.zip »"
echo "    Dans Chrome : chrome://extensions → Supprimer → Charger l'extension"
echo "    non empaquetee → Telechargements/nexus-extension"

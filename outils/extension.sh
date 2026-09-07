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
# Le nom compte. Aharon : « dans mon fichier telechargement y a pas celui de
# l'extension de navigateur » — il cherchait un FICHIER et ne voyait qu'un
# dossier nomme « nexus-extension », noye au milieu du reste et pas range a
# cote de l'application. Les deux commencent maintenant par « Nexus », donc ils
# se suivent dans le Finder, et le nom dit a quoi ça sert.
# LE NUMERO DE VERSION EST DANS LE NOM DU DOSSIER.
#
# Aharon, plusieurs fois : « je trouve rien, le fichier ne change pas, tu te
# fous de ma tete ». Il avait raison sur le fond : le dossier s'appelait
# toujours pareil, donc RIEN ne lui disait qu'il avait ete refait. Il ouvrait
# le Finder, voyait le meme nom, et concluait que je n'avais rien fait.
# Maintenant le nom change a chaque version : « Nexus-extension-Chrome-2.10.0 ».
# On voit la difference sans ouvrir quoi que ce soit.
V=$(grep '"version"' "$SRC/manifest.json" | sed 's/[^0-9.]//g' | sed 's/\.$//')
DEST=~/Downloads/Nexus-extension-Chrome-$V

for f in manifest.json onglet.html onglet.js maths.js formules.js modele-pont.js loupe.html loupe.js loupe-page.js popup.html popup.js fond.js LISEZ-MOI.txt; do
  [ -f "$SRC/$f" ] || { echo "  ✗ $SRC/$f manque"; exit 1; }
done

# UN SEUL DOSSIER dans les Telechargements, et RIEN d'autre.
#
# On fabriquait aussi un .zip a cote. Aharon le double-cliquait, macOS en tirait
# « nexus-extension-2.6.0/ » — un SECOND dossier, d'apparence identique mais
# fige a la version du zip. Il s'est retrouve avec deux dossiers impossibles a
# distinguer a l'oeil, dont un perime : charger le mauvais dans Chrome, c'est
# retrouver d'anciens bugs et croire que rien n'a ete corrige.
# Le zip n'a aucune raison d'exister ici : le site sait le fabriquer, et ce
# script sait refaire le dossier a tout moment.
setopt NULL_GLOB 2>/dev/null || true   # un motif sans correspondance n'est pas une erreur
# LE MENAGE, A CHAQUE FOIS.
#
# Aharon : « dans mes telechargements j'ai toujours le meme fichier Nexus
# extension qui ne bouge pas. Quand tu fais quelque chose, je veux voir une
# difference : tu enleves l'ancien et tu mets le nouveau. Si tu vois un zip ET
# un dossier, tu gardes l'un des deux, je veux pas voir mille choses. »
#
# Il avait raison, et ça lui a coute cher : le 3 septembre il avait encore, a
# cote du dossier a jour, un « Nexus-extension-Chrome.zip » du 2 septembre —
# la version 2.7, SANS le modele et SANS la Loupe. C'est peut-etre celui-la
# qu'il a charge dans Chrome, d'ou « rien n'a change ».
#
# On garde LE DOSSIER (c'est ce que Chrome sait charger) et on efface tout le
# reste qui porte ce nom.
for vieux in ~/Downloads/nexus-extension* ~/Downloads/Nexus-extension*; do
  [ "$vieux" = "$DEST" ] && continue
  [ -e "$vieux" ] && { rm -rf "$vieux"; echo "  · SUPPRIME : $(basename "$vieux")"; }
done
# On repart d'un dossier NEUF : sans ça, un fichier qu'on a supprime du projet
# resterait la, et sa date ne bougerait pas.
rm -rf "$DEST"

mkdir -p "$DEST/icones"
# La bibliotheque du modele, livree AVEC l'extension : Chrome interdit a une
# extension de charger un script depuis internet. On la copie a part parce que
# c'est un module ES que `node --check` refuserait sous ce nom.
cp "$SRC/modele.js" "$DEST/modele.js"
for f in manifest.json onglet.html onglet.js maths.js formules.js modele-pont.js loupe.html loupe.js loupe-page.js popup.html popup.js fond.js LISEZ-MOI.txt; do
  cp "$SRC/$f" "$DEST/$f"
done
# LE NUMERO DE VERSION, ECRIT UNE SEULE FOIS.
#
# Le mode d'emploi annoncait « EXTENSION NEXUS 2.9 » alors que l'extension
# etait en 2.14 : Aharon ouvrait le fichier et en concluait, legitimement, que
# rien n'avait ete refait. Le numero n'est plus ecrit a la main nulle part —
# il est pris dans le manifeste, qui est la seule source.
sed -i "" "s/@VERSION@/$V/g" "$DEST/LISEZ-MOI.txt"
# Le manifeste nomme les icones « icones/16.png » ; dans public/ elles sont a
# plat, parce que le site les sert par leur adresse.
cp "$SRC/icone-16.png"  "$DEST/icones/16.png"
cp "$SRC/icone-48.png"  "$DEST/icones/48.png"
cp "$SRC/icone-128.png" "$DEST/icones/128.png"


node --check "$DEST/onglet.js"
node --check "$DEST/popup.js"
node --check "$DEST/fond.js"
python3 -c "import json;json.load(open('$DEST/manifest.json'))"

# UNE MARQUE VISIBLE. Aharon ouvre le Finder et veut voir, d'un coup d'oeil,
# que ce n'est plus le meme dossier. Le nom du dossier ne change pas (Chrome
# retient le chemin, et « Actualiser » suffit alors), mais la version est
# ecrite DANS le dossier, en gros, avec la date.
printf 'Extension Nexus %s\nPreparee le %s\n\nSi Chrome affiche une autre version, c est que tu as charge un\nancien dossier : supprime-la et recharge celui-ci.\n' \
  "$V" "$(date '+%d %B %Y a %H:%M')" > "$DEST/VERSION $V.txt"

# ════════════════════ LA VERSION FIREFOX ════════════════════
#
# Aharon : « une extension egalement compatible avec d'autres navigateurs ».
#
# Edge, Brave, Opera, Vivaldi et Arc sont tous batis sur Chromium : le dossier
# Chrome ci-dessus leur va TEL QUEL, il n'y a rien a faire de plus.
#
# Firefox, lui, ne parle pas tout a fait la meme langue. Trois differences, et
# elles empechent le dossier Chrome de se charger du tout :
#   1. le fond. Chrome veut « service_worker », Firefox veut « scripts ». Et ce
#      n'est pas negociable : Chrome REFUSE « background.scripts » en version 3
#      du manifeste, Firefox ignore « service_worker ». D'ou deux dossiers.
#   2. l'identite. Firefox exige un identifiant d'extension.
#   3. la permission « favicon » n'existe que chez Chrome ; laissee la, elle
#      fait afficher un avertissement a l'installation.
FDEST=~/Downloads/Nexus-extension-Firefox-$V
rm -rf "$FDEST"
cp -R "$DEST" "$FDEST"
python3 - "$FDEST/manifest.json" <<'PYFIN'
import json, sys
chemin = sys.argv[1]
m = json.load(open(chemin))
m["background"] = {"scripts": ["fond.js"]}
m["browser_specific_settings"] = {
    "gecko": {"id": "nexus@aharondray.fr", "strict_min_version": "115.0"}
}
m["permissions"] = [p for p in m["permissions"] if p != "favicon"]
json.dump(m, open(chemin, "w"), indent=2, ensure_ascii=False)
PYFIN
python3 -c "import json;json.load(open('$FDEST/manifest.json'))"
mv "$FDEST/VERSION $V.txt" "$FDEST/VERSION $V (Firefox).txt" 2>/dev/null || true

echo ""
echo "  ✓ EXTENSION $V"
echo ""
echo "     Elle est ICI, dans tes Telechargements :"
echo "        Nexus-extension-Chrome-$V"
echo ""
echo "     Le numero est DANS LE NOM : si tu vois autre chose que $V,"
echo "     c'est que tu regardes un ancien dossier."
echo ""
echo "     Dans Chrome : chrome://extensions → Supprimer l'ancienne Nexus,"
echo "     puis « Charger l'extension non empaquetee » et choisis"
echo "     Telechargements/Nexus-extension-Chrome-$V"
echo ""
echo "     Pour verifier SANS OUVRIR le Finder : ouvre un nouvel onglet,"
echo "     le numero est ecrit en bas a gauche, a cote de « Nexus pour macOS »."
echo ""
echo "     LES AUTRES NAVIGATEURS"
echo "        Edge, Brave, Opera, Vivaldi, Arc : le MEME dossier Chrome."
echo "           edge://extensions  (ou brave://, opera://…)"
echo "           → Mode developpeur, puis « Charger l'extension non empaquetee »."
echo "        Firefox : le dossier Nexus-extension-Firefox-$V"
echo "           about:debugging#/runtime/this-firefox"
echo "           → « Charger un module temporaire », choisis manifest.json"
echo "             DANS ce dossier."

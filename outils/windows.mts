// ============================================================================
//  LE BANC DE L'APPLICATION WINDOWS
//
//  On ne peut pas compiler du Rust sur ce Mac (le réseau de la machine bloque
//  les serveurs de Rust) et l'on ne peut pas lancer Windows dessus. Mais on
//  peut vérifier tout ce qui casse VRAIMENT dans ce genre de projet, et qui ne
//  se voit jamais à la compilation :
//
//  1. LES NOMS DE COMMANDES. Le Rust déclare « chercher_fichiers », le
//     TypeScript appelle « chercherFichiers » : ça compile des deux côtés, et
//     ça échoue chez l'utilisateur. On compare les deux listes, dans les deux
//     sens.
//  2. LES COMMANDES OUBLIÉES DANS LE ROUTEUR. Une commande peut exister,
//     être appelée, et ne pas être inscrite dans `generate_handler!` : Tauri
//     répond alors « command not found » au premier clic.
//  3. LES FICHIERS QUE LA CONFIGURATION PROMET. Une icône manquante fait
//     échouer la construction quinze minutes plus tard, sur le serveur.
//  4. LE POWERSHELL. On relit chaque script : équilibre des accolades, et
//     surtout — jamais une valeur de l'utilisateur collée dans le code.
//
//  À lancer : npx tsx outils/windows.mts
// ============================================================================

import { readFileSync, existsSync, readdirSync } from "fs";
import { resolve, join } from "path";
import { COMMANDES } from "../src/lib/pcWindows";

const RACINE = resolve(import.meta.dirname, "..");
const WIN = join(RACINE, "windows", "src-tauri");

let reussis = 0, total = 0;
function verifier(quoi: string, ok: boolean, detail = "") {
  total++;
  if (ok) reussis++;
  console.log(`  ${ok ? "✅" : "❌"} ${quoi}${detail ? `  — ${detail}` : ""}`);
}

const sources = readdirSync(join(WIN, "src")).filter((f) => f.endsWith(".rs"));
const rust: Record<string, string> = {};
for (const f of sources) rust[f] = readFileSync(join(WIN, "src", f), "utf8");
const toutLeRust = Object.values(rust).join("\n");

console.log("\n🦀 LE CODE RUST");
verifier("les dix fichiers sources sont là", sources.length >= 10, sources.join(" "));

// ── 1. les commandes déclarées ──────────────────────────────────────────────
const declarees = new Set<string>();
for (const [, code] of Object.entries(rust)) {
  const re = /#\[tauri::command\]\s*(?:pub\s+)?fn\s+([a-z0-9_]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code))) declarees.add(m[1]);
}
console.log("\n🔗 LES NOMS DE COMMANDES — Rust ↔ interface");
verifier("le Rust déclare des commandes", declarees.size > 0, `${declarees.size} trouvées`);

const attendues = new Set<string>(COMMANDES as readonly string[]);
const manquantesRust = [...attendues].filter((c) => !declarees.has(c));
const manquantesTS = [...declarees].filter((c) => !attendues.has(c));
verifier("chaque commande appelée par l'interface existe en Rust",
         manquantesRust.length === 0, manquantesRust.join(", ") || "aucun écart");
verifier("chaque commande Rust est connue de l'interface",
         manquantesTS.length === 0, manquantesTS.join(", ") || "aucun écart");

// ── 2. le routeur ───────────────────────────────────────────────────────────
const bloc = toutLeRust.match(/generate_handler!\s*\[([\s\S]*?)\]/);
console.log("\n🚦 LE ROUTEUR (generate_handler)");
verifier("le routeur existe", !!bloc);
if (bloc) {
  // Le bloc contient des commentaires : « // ── les fichiers ». Sans les
  // retirer, le commentaire se colle au nom qui suit et l'on croit à une
  // commande fantôme. Mon banc me l'a fait à moi-même.
  const inscrites = new Set(
    bloc[1]
      .replace(/\/\/[^\n]*/g, "")
      .split(",")
      .map((l) => l.trim().split("::").pop()!.trim())
      .filter(Boolean),
  );
  const oubliees = [...declarees].filter((c) => !inscrites.has(c));
  const fantomes = [...inscrites].filter((c) => !declarees.has(c));
  verifier("aucune commande n'est oubliée dans le routeur",
           oubliees.length === 0, oubliees.join(", ") || "toutes inscrites");
  verifier("le routeur ne cite aucune commande qui n'existe pas",
           fantomes.length === 0, fantomes.join(", ") || "aucune");
}

// ── 3. la configuration ─────────────────────────────────────────────────────
console.log("\n⚙️  LA CONFIGURATION");
const conf = JSON.parse(readFileSync(join(WIN, "tauri.conf.json"), "utf8"));
verifier("tauri.conf.json est du JSON valide", true, `Nexus ${conf.version}`);
verifier("l'identifiant est bien formé",
         /^[a-z][a-z0-9.]*[a-z0-9]$/.test(conf.identifier), conf.identifier);
verifier("l'interface pointe sur le site construit",
         conf.build?.frontendDist === "../../dist", conf.build?.frontendDist);
verifier("le site construit existe", existsSync(join(RACINE, "dist", "index.html")));
for (const ic of conf.bundle.icon as string[]) {
  verifier(`l'icône ${ic} existe`, existsSync(join(WIN, ic)));
}
verifier("l'installateur s'installe SANS droits administrateur",
         conf.bundle?.windows?.nsis?.installMode === "currentUser",
         conf.bundle?.windows?.nsis?.installMode);
verifier("l'installateur parle français",
         (conf.bundle?.windows?.nsis?.languages ?? []).includes("French"));
const fenetre = conf.app.windows[0];
verifier("la fenêtre principale s'appelle « main »", fenetre.label === "main");

// LE GLISSER-DÉPOSER, ET C'EST UN PIÈGE À L'ENVERS.
//
// « dragDropEnabled » à VRAI veut dire « c'est la coquille qui s'occupe des
// fichiers déposés » — et la page web ne reçoit alors RIEN. Or c'est la page
// qui gère ça dans Nexus : glisser un fichier sur la mascotte pour qu'elle le
// lise. Laissé à vrai (c'est la valeur par défaut), la fonctionnalité serait
// morte dans l'application, et seulement dans l'application.
verifier("le glisser-déposer est laissé à la page (la mascotte attrape les fichiers)",
         fenetre.dragDropEnabled === false, String(fenetre.dragDropEnabled));

// La fenêtre naît cachée : sinon, au démarrage du PC, on la voit apparaître
// puis disparaître. C'est Rust qui la montre, sauf en mode discret.
verifier("la fenêtre naît cachée (pas de clignotement au démarrage)",
         fenetre.visible === false, String(fenetre.visible));
verifier("… et le code la montre bien quand ce n'est pas le démarrage",
         toutLeRust.includes("if !discret {") && toutLeRust.includes("montrer(&poignee)"));

const cap = JSON.parse(readFileSync(join(WIN, "capabilities", "principal.json"), "utf8"));
verifier("les permissions visent la fenêtre principale",
         (cap.windows ?? []).includes("main"));
for (const greffon of ["opener", "dialog", "notification", "global-shortcut"]) {
  verifier(`la permission « ${greffon} » est accordée`,
           (cap.permissions as string[]).some((p) => p.startsWith(greffon + ":")));
}

// ── 4. les greffons déclarés en Rust doivent être dans Cargo.toml ───────────
console.log("\n📦 LES DÉPENDANCES");
const cargo = readFileSync(join(WIN, "Cargo.toml"), "utf8");
for (const g of ["tauri-plugin-opener", "tauri-plugin-dialog", "tauri-plugin-notification",
                 "tauri-plugin-global-shortcut", "tauri-plugin-single-instance"]) {
  const utilise = toutLeRust.includes(g.replace(/-/g, "_"));
  verifier(`${g} : déclaré et utilisé`, cargo.includes(g) && utilise,
           !cargo.includes(g) ? "absent de Cargo.toml"
           : !utilise ? "déclaré mais jamais utilisé" : "");
}
verifier("aucune dépendance Windows exotique",
         !cargo.includes("windows =") && !cargo.includes("winreg"),
         "tout passe par PowerShell");

// ── 5. le PowerShell ────────────────────────────────────────────────────────
console.log("\n🪟 LE POWERSHELL");
const scripts: { fichier: string; nom: string; code: string }[] = [];
for (const [f, code] of Object.entries(rust)) {
  const re = /const\s+([A-Z_0-9]+):\s*&str\s*=\s*r#"([\s\S]*?)"#;/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code))) scripts.push({ fichier: f, nom: m[1], code: m[2] });
}
verifier("des scripts PowerShell sont présents", scripts.length > 0, `${scripts.length} scripts`);

for (const s of scripts) {
  const ouvrantes = (s.code.match(/\{/g) || []).length;
  const fermantes = (s.code.match(/\}/g) || []).length;
  verifier(`${s.fichier} · ${s.nom} : accolades équilibrées`,
           ouvrantes === fermantes, `${ouvrantes} ouvertes, ${fermantes} fermées`);
}

// LA RÈGLE QUI COMPTE : une valeur venue de l'utilisateur ne doit JAMAIS être
// collée dans un script. Elle passe par $env:NEXUS_*, que PowerShell lit sans
// l'interpréter. Un nom de fichier avec une apostrophe suffirait sinon à
// changer le sens de la commande.
// On ne regarde QUE les `format!` qui fabriquent du PowerShell — ceux qui
// contiennent « {UTF8} », le préambule commun à tous nos scripts. Un
// `format!` qui écrit un fichier ou compose un nom de variable n'a rien à
// voir ici : ma première version les comptait, et signalait trois fautes qui
// n'existaient pas. Un banc qui crie au loup finit par ne plus être lu.
const fabriquentDuPowershell = [...toutLeRust.matchAll(/format!\(\s*\n?\s*"((?:[^"\\]|\\.)*)"/g)]
  .map((m) => m[1])
  .filter((litteral) => litteral.includes("{UTF8}"));
const CONSTANTES = /^[A-Z][A-Z_0-9]*$/;
const colleesEnDur = fabriquentDuPowershell
  .flatMap((litteral) => [...litteral.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))
  .filter((v) => !CONSTANTES.test(v));
verifier("aucune valeur d'utilisateur collée dans un script PowerShell",
         colleesEnDur.length === 0,
         colleesEnDur.join(", ") || `${fabriquentDuPowershell.length} scripts relus, tous propres`);

const utiliseEnv = scripts.filter((s) => s.code.includes("$env:NEXUS_")).length;
verifier("les scripts lisent les valeurs par variables d'environnement",
         utiliseEnv >= 6, `${utiliseEnv} scripts sur ${scripts.length}`);

// LE PIÈGE DU « * » DANS LE REGISTRE.
//
// La clé qui met « Analyser avec Nexus » sur tous les fichiers s'appelle
// littéralement « HKCU\Software\Classes\*\shell\Nexus ». Pour PowerShell,
// « * » veut dire « n'importe quoi » : New-Item, Test-Path et Remove-Item
// l'auraient pris pour un joker, seraient allés voir ailleurs, et la
// fonctionnalité phare de l'application n'aurait jamais marché — sans la
// moindre erreur affichée. Ces chemins-là doivent passer par `reg.exe`, qui
// prend le nom au pied de la lettre.
{
  const jokers = new RegExp(
    "(New-Item|Test-Path|Remove-Item|Set-ItemProperty|Get-ItemProperty)" +
    "[^\n]*HK(CU|LM)[^\n]*\\*", "g");
  const coupables: string[] = [];
  for (const s2 of scripts) {
    const m = s2.code.match(jokers);
    if (m) coupables.push(`${s2.fichier} · ${s2.nom} : ${m[0].slice(0, 60)}`);
  }
  verifier("aucun chemin de registre avec « * » confié à PowerShell",
           coupables.length === 0, coupables.join(" ; ") || "ils passent tous par reg.exe");
}

verifier("aucune console noire ne clignote",
         rust["ps.rs"].includes("CREATE_NO_WINDOW") || rust["ps.rs"].includes("0x0800_0000"));
verifier("la sortie est forcée en UTF-8 (sinon les accents partent en charabia)",
         rust["ps.rs"].includes("OutputEncoding"));
verifier("PowerShell est lancé sans le profil de l'utilisateur",
         rust["ps.rs"].includes("-NoProfile"));

// ── 6. les garde-fous des automatisations ───────────────────────────────────
console.log("\n🔒 LES AUTOMATISATIONS SONT-ELLES RELUES ?");
const sc = rust["scripts.rs"];
verifier("le code est relu AVANT d'être écrit", sc.includes("verifier(&code)"));
verifier("le code est relu AVANT d'être lancé",
         (sc.match(/verifier\(/g) || []).length >= 3, "écriture, lancement, et la fonction");
for (const danger of ["format-volume", "invoke-expression", "downloadstring",
                      "set-mppreference", "bcdedit"]) {
  verifier(`« ${danger} » est refusé`, sc.includes(danger));
}
verifier("le refus dit POURQUOI", sc.includes("Je ne l'ai pas installée"));

// ── 7. l'intégration Windows sans droits administrateur ─────────────────────
console.log("\n🔑 AUCUN MOT DE PASSE DEMANDÉ, JAMAIS");
const integ = rust["integration.rs"];
verifier("le registre n'est touché que dans HKCU (l'espace de l'utilisateur)",
         !integ.includes("HKLM") && integ.includes("HKCU"));
verifier("le démarrage automatique est réglable", integ.includes("regler_demarrage"));
verifier("l'adresse nexus:// est déclarée", integ.includes("URL Protocol"));
verifier("le clic droit de l'Explorateur est branché", integ.includes("Analyser avec Nexus"));
verifier("tout peut être retiré proprement", integ.includes("tout_debrancher"));

console.log(`\n${reussis}/${total} vérifications passées.`);
process.exit(reussis === total ? 0 : 1);

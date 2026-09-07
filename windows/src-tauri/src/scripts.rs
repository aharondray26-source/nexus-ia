// ============================================================================
//  LES AUTOMATISATIONS
//
//  Sur macOS, quand la mascotte fabrique un raccourci, Apple impose un clic
//  humain sur « Ajouter le raccourci » : aucune application ne peut l'installer
//  toute seule. Windows n'impose rien. C'est ce qu'Aharon appelle « moins
//  secure », et c'est vrai — donc c'est à NOUS d'être sérieux, puisque le
//  système ne le sera pas à notre place.
//
//  LES QUATRE RÈGLES QU'ON S'IMPOSE, ET POURQUOI :
//
//  1. ON RELIT AVANT D'ÉCRIRE. Le texte vient d'un modèle ; il peut se
//     tromper, et quelqu'un pourrait un jour essayer de lui faire écrire
//     n'importe quoi. Tout ce qui efface en masse, désarme une protection ou
//     va chercher du code sur internet pour l'exécuter est REFUSÉ, avec la
//     raison écrite en toutes lettres.
//  2. TOUT EST VISIBLE. Les automatisations vivent dans un seul dossier, sous
//     leur vrai nom, en clair. On peut les lire, les modifier, les supprimer
//     avec l'Explorateur, sans Nexus.
//  3. RIEN NE PART TOUT SEUL. Créer une automatisation ne la lance pas. C'est
//     un geste séparé.
//  4. LE TEXTE EST RENDU. La mascotte montre ce qu'elle a écrit avant qu'on
//     s'en serve. Une automatisation qu'on n'a pas lue n'est pas une
//     automatisation, c'est un pari.
// ============================================================================

use crate::ps::{powershell, UTF8};
use serde::Serialize;
use std::path::PathBuf;

#[derive(Serialize, Clone)]
pub struct Script {
    pub nom: String,
    pub chemin: String,
    pub quoi: String,
    pub code: String,
}

/// Un seul endroit, dans les données de l'application, à côté du reste.
pub fn dossier() -> Result<PathBuf, String> {
    let base = std::env::var("APPDATA")
        .or_else(|_| std::env::var("HOME"))
        .map_err(|_| "Impossible de trouver ton dossier personnel.".to_string())?;
    let d = PathBuf::from(base).join("Nexus").join("Automatisations");
    std::fs::create_dir_all(&d).map_err(|e| format!("Dossier impossible à créer : {e}"))?;
    Ok(d)
}

/// Un nom de fichier sûr, qui garde les accents. Même règle que la
/// bureautique : on ne perd pas « Révision d'histoire », on perd la barre
/// oblique qui casserait le chemin.
fn nom_sur(nom: &str) -> String {
    let mut n: String = nom
        .chars()
        .map(|c| if "\\/:*?\"<>|\n\t".contains(c) { ' ' } else { c })
        .collect();
    n = n.split_whitespace().collect::<Vec<_>>().join(" ");
    if n.is_empty() {
        n = "Automatisation Nexus".into();
    }
    if n.chars().count() > 60 {
        n = n.chars().take(60).collect();
    }
    n
}

/// Ce qu'on refuse d'écrire, et la phrase qu'on rend à la place.
///
/// La liste est courte EXPRÈS. Une liste longue donne l'illusion d'être à
/// l'abri et refuse plein de choses utiles ; celle-ci ne vise que ce qui est
/// irréversible, ce qui désarme la machine, et ce qui exécute du code venu
/// d'ailleurs.
const INTERDITS: &[(&str, &str)] = &[
    ("format-volume",     "elle formate un disque"),
    ("clear-disk",        "elle efface un disque entier"),
    ("initialize-disk",   "elle réinitialise un disque"),
    ("vssadmin delete",   "elle supprime les points de restauration de Windows"),
    ("wbadmin delete",    "elle supprime les sauvegardes de Windows"),
    ("cipher /w",         "elle écrase définitivement l'espace libre du disque"),
    ("bcdedit",           "elle touche au démarrage de Windows"),
    ("set-mppreference",  "elle désactive la protection antivirus de Windows"),
    ("add-mppreference",  "elle modifie la protection antivirus de Windows"),
    ("set-executionpolicy", "elle change les règles de sécurité de PowerShell"),
    ("downloadstring",    "elle va chercher du code sur internet pour l'exécuter"),
    ("downloadfile",      "elle télécharge un fichier depuis internet à ton insu"),
    ("iwr ",              "elle va chercher quelque chose sur internet"),
    ("invoke-webrequest", "elle va chercher quelque chose sur internet"),
    ("invoke-expression", "elle exécute du texte comme du code, ce qui peut tout faire"),
    ("iex ",              "elle exécute du texte comme du code, ce qui peut tout faire"),
    ("net user",          "elle touche aux comptes utilisateurs"),
    ("net localgroup",    "elle touche aux droits des comptes"),
    ("reg delete hklm",   "elle efface une partie du registre de Windows"),
    ("remove-item c:\\windows", "elle efface dans le dossier de Windows"),
    ("remove-item $env:systemroot", "elle efface dans le dossier de Windows"),
    ("start-process -verb runas", "elle demande les droits administrateur"),
];

/// Le grand ménage récursif à la racine : « Remove-Item C:\ -Recurse ».
/// Traité à part parce qu'il faut voir DEUX choses en même temps.
fn efface_tout(bas: &str) -> bool {
    let recursif = bas.contains("-recurse") || bas.contains("-r ");
    if !recursif {
        return false;
    }
    let efface = bas.contains("remove-item") || bas.contains("del ") || bas.contains("rd ")
        || bas.contains("rmdir");
    if !efface {
        return false;
    }
    ["c:\\\"", "c:\\ ", " c:\\", "\\*", "$env:systemdrive", "$env:userprofile\"",
     "$home\"", "$env:appdata\"", "c:\\users"]
        .iter()
        .any(|r| bas.contains(r))
}

/// Relire une automatisation. Rend le code accepté, ou la raison du refus.
pub fn verifier(code: &str) -> Result<String, String> {
    let propre = code.trim();
    if propre.len() < 5 {
        return Err("Le modèle n'a rien écrit d'utilisable.".into());
    }
    if propre.len() > 20_000 {
        return Err("Cette automatisation est bien trop longue pour être relue \
                    honnêtement. Demande quelque chose de plus simple."
            .into());
    }
    let bas = propre.to_lowercase();
    for (motif, raison) in INTERDITS {
        if bas.contains(motif) {
            return Err(format!("{raison}"));
        }
    }
    if efface_tout(&bas) {
        return Err("elle efface un dossier entier en cascade".into());
    }
    Ok(propre.to_string())
}

#[tauri::command]
pub fn creer_script(nom: String, code: String, quoi: Option<String>) -> Result<Script, String> {
    let code = verifier(&code).map_err(|raison| {
        format!(
            "Je ne l'ai pas installée : {raison}.\n\n\
             Une automatisation Nexus n'a le droit ni d'effacer en masse, ni de \
             désarmer Windows, ni d'aller chercher du code sur internet. \
             Dis-moi autrement ce que tu veux faire et je la réécris."
        )
    })?;
    let nom = nom_sur(&nom);
    let quoi = quoi.unwrap_or_default();
    let chemin = dossier()?.join(format!("{nom}.ps1"));

    // Un en-tête lisible : dans six mois, on doit savoir d'où sort ce fichier
    // en l'ouvrant, sans Nexus.
    let contenu = format!(
        "# ─── Nexus ───────────────────────────────────────────────\n\
         # {nom}\n\
         # {quoi}\n\
         # Écrit par Nexus. Tu peux le modifier ou le supprimer : c'est\n\
         # un fichier ordinaire, il n'y a rien de caché ailleurs.\n\
         # ─────────────────────────────────────────────────────────\n\n{code}\n"
    );
    std::fs::write(&chemin, &contenu).map_err(|e| format!("Écriture impossible : {e}"))?;

    Ok(Script {
        nom,
        chemin: chemin.to_string_lossy().to_string(),
        quoi,
        code,
    })
}

#[tauri::command]
pub fn lister_scripts() -> Result<Vec<Script>, String> {
    let d = dossier()?;
    let mut out = vec![];
    let entrees = std::fs::read_dir(&d).map_err(|e| format!("Lecture impossible : {e}"))?;
    for e in entrees.flatten() {
        let p = e.path();
        if p.extension().and_then(|x| x.to_str()) != Some("ps1") {
            continue;
        }
        let code = std::fs::read_to_string(&p).unwrap_or_default();
        // La troisième ligne de l'en-tête dit à quoi ça sert.
        let quoi = code
            .lines()
            .nth(2)
            .map(|l| l.trim_start_matches('#').trim().to_string())
            .unwrap_or_default();
        out.push(Script {
            nom: p.file_stem().and_then(|x| x.to_str()).unwrap_or("").to_string(),
            chemin: p.to_string_lossy().to_string(),
            quoi,
            code,
        });
    }
    out.sort_by(|a, b| a.nom.to_lowercase().cmp(&b.nom.to_lowercase()));
    Ok(out)
}

#[tauri::command]
pub fn lancer_script(nom: String) -> Result<String, String> {
    let chemin = dossier()?.join(format!("{}.ps1", nom_sur(&nom)));
    if !chemin.exists() {
        let existantes = lister_scripts()?
            .iter()
            .map(|s| s.nom.clone())
            .collect::<Vec<_>>()
            .join(", ");
        return Err(format!(
            "Il n'y a pas d'automatisation nommée « {nom} ».{}",
            if existantes.is_empty() {
                " Tu n'en as encore aucune.".to_string()
            } else {
                format!(" Celles que tu as : {existantes}.")
            }
        ));
    }
    // ON RELIT AVANT DE LANCER, pas seulement avant d'écrire : le fichier a pu
    // être modifié à la main entre-temps, et c'est son droit — mais alors on
    // le relit aussi.
    let code = std::fs::read_to_string(&chemin).map_err(|e| format!("Lecture impossible : {e}"))?;
    verifier(&code).map_err(|raison| {
        format!("Je ne la lance pas : {raison}. Ouvre le fichier et regarde — il est là : {}",
                chemin.display())
    })?;

    let script = format!(
        "{UTF8}& $env:NEXUS_CHEMIN 2>&1 | Out-String"
    );
    let r = powershell(&script, &[("CHEMIN", &chemin.to_string_lossy())]);
    if r.ok {
        Ok(if r.sortie.is_empty() {
            format!("« {nom} » s'est exécutée, sans rien afficher.")
        } else {
            r.sortie
        })
    } else {
        Err(format!(
            "« {nom} » s'est arrêtée en chemin :\n{}",
            if r.erreur.is_empty() { r.sortie } else { r.erreur }
        ))
    }
}

#[tauri::command]
pub fn supprimer_script(nom: String) -> Result<String, String> {
    let chemin = dossier()?.join(format!("{}.ps1", nom_sur(&nom)));
    std::fs::remove_file(&chemin).map_err(|e| format!("Suppression impossible : {e}"))?;
    Ok(nom)
}

/// Ouvrir le dossier des automatisations dans l'Explorateur. « Où sont mes
/// fichiers ? » doit avoir une réponse en un clic, pas une explication.
#[tauri::command]
pub fn montrer_scripts() -> Result<String, String> {
    let d = dossier()?;
    let script = format!("{UTF8}Start-Process explorer.exe -ArgumentList $env:NEXUS_CHEMIN");
    powershell(&script, &[("CHEMIN", &d.to_string_lossy())]).texte()?;
    Ok(d.to_string_lossy().to_string())
}

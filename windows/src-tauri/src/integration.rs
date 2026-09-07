// ============================================================================
//  NEXUS DANS WINDOWS, PAS À CÔTÉ
//
//  C'est ici que se joue la promesse d'Aharon : « Windows est plus
//  compatible ». Trois intégrations que macOS rend difficiles ou impossibles à
//  une application non signée par Apple, et que Windows accorde sans rien
//  demander :
//
//  1. DÉMARRER AVEC WINDOWS. Une ligne dans le registre. Sur macOS il faut un
//     agent de lancement, un fichier de configuration système, et l'utilisateur
//     doit approuver dans les Réglages.
//  2. L'ADRESSE « nexus:// ». N'importe quel lien, dans n'importe quelle
//     application — un mail, un document, un site — peut ouvrir Nexus sur la
//     bonne page. Le site peut donc dire « ouvrir dans l'application ».
//  3. LE CLIC DROIT DE L'EXPLORATEUR. « Analyser avec Nexus » apparaît sur
//     n'importe quel fichier et n'importe quel dossier. C'est l'intégration la
//     plus utile au quotidien, et c'est celle qui n'existe tout simplement pas
//     sur macOS sans passer par une extension système signée.
//
//  TOUT SE PASSE DANS HKCU — la partie du registre qui appartient à
//  l'utilisateur. Aucun droit administrateur n'est demandé, jamais. C'est
//  important : sur un PC d'école ou sur celui des parents, Nexus s'installe et
//  s'intègre sans mot de passe, et se retire aussi proprement.
// ============================================================================

use crate::ps::{powershell, UTF8};
use serde::Serialize;

#[derive(Serialize, Clone)]
pub struct Integrations {
    pub demarrage: bool,
    pub protocole: bool,
    pub menu_contextuel: bool,
}

fn exe() -> Result<String, String> {
    std::env::current_exe()
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| format!("Nexus n'arrive pas à savoir où il est installé : {e}"))
}

// ─────────────────────────────────────────────── démarrer avec Windows

const CLE_DEMARRAGE: &str = r"HKCU:\Software\Microsoft\Windows\CurrentVersion\Run";

#[tauri::command]
pub fn regler_demarrage(actif: bool) -> Result<bool, String> {
    let chemin = exe()?;
    let script = if actif {
        format!(
            "{UTF8}\
             New-Item -Path '{CLE_DEMARRAGE}' -Force | Out-Null; \
             Set-ItemProperty -Path '{CLE_DEMARRAGE}' -Name 'Nexus' \
               -Value ('\"' + $env:NEXUS_EXE + '\" --discret'); 'ok'"
        )
    } else {
        format!(
            "{UTF8}\
             Remove-ItemProperty -Path '{CLE_DEMARRAGE}' -Name 'Nexus' \
               -ErrorAction SilentlyContinue; 'ok'"
        )
    };
    powershell(&script, &[("EXE", &chemin)]).texte()?;
    Ok(actif)
}

// ─────────────────────────────────────────────── l'adresse nexus://

const PROTOCOLE: &str = r#"
$exe = $env:NEXUS_EXE
$racine = 'HKCU:\Software\Classes\nexus'
New-Item -Path $racine -Force | Out-Null
Set-ItemProperty -Path $racine -Name '(Default)' -Value 'URL:Nexus'
# Cette valeur VIDE est ce qui dit à Windows « ceci est une adresse ». Sans
# elle, la clé existe et ne sert à rien — et rien ne le signale.
Set-ItemProperty -Path $racine -Name 'URL Protocol' -Value ''
New-Item -Path "$racine\DefaultIcon" -Force | Out-Null
Set-ItemProperty -Path "$racine\DefaultIcon" -Name '(Default)' -Value "$exe,0"
New-Item -Path "$racine\shell\open\command" -Force | Out-Null
Set-ItemProperty -Path "$racine\shell\open\command" -Name '(Default)' -Value ('"' + $exe + '" "%1"')
'ok'
"#;

#[tauri::command]
pub fn regler_protocole(actif: bool) -> Result<bool, String> {
    let chemin = exe()?;
    let script = if actif {
        format!("{UTF8}{PROTOCOLE}")
    } else {
        format!(
            "{UTF8}Remove-Item -Path 'HKCU:\\Software\\Classes\\nexus' -Recurse \
             -ErrorAction SilentlyContinue; 'ok'"
        )
    };
    powershell(&script, &[("EXE", &chemin)]).texte()?;
    Ok(actif)
}

// ─────────────────────────────────────────────── le clic droit

const MENU: &str = r#"
$exe = $env:NEXUS_EXE
# Trois endroits, parce que Windows les traite séparément :
#   *          → n'importe quel fichier
#   Directory  → un dossier
#   Directory\Background → le fond du dossier, clic droit dans le vide
$cibles = @(
  'HKCU:\Software\Classes\*\shell\Nexus',
  'HKCU:\Software\Classes\Directory\shell\Nexus',
  'HKCU:\Software\Classes\Directory\Background\shell\Nexus'
)
foreach ($c in $cibles) {
  New-Item -Path $c -Force | Out-Null
  Set-ItemProperty -Path $c -Name '(Default)' -Value 'Analyser avec Nexus'
  Set-ItemProperty -Path $c -Name 'Icon' -Value "$exe,0"
  New-Item -Path "$c\command" -Force | Out-Null
  $arg = if ($c -like '*Background*') { '"%V"' } else { '"%1"' }
  Set-ItemProperty -Path "$c\command" -Name '(Default)' -Value ('"' + $exe + '" --fichier ' + $arg)
}
'ok'
"#;

#[tauri::command]
pub fn regler_menu_contextuel(actif: bool) -> Result<bool, String> {
    let chemin = exe()?;
    let script = if actif {
        format!("{UTF8}{MENU}")
    } else {
        format!(
            "{UTF8}\
             foreach ($c in @('HKCU:\\Software\\Classes\\*\\shell\\Nexus', \
                              'HKCU:\\Software\\Classes\\Directory\\shell\\Nexus', \
                              'HKCU:\\Software\\Classes\\Directory\\Background\\shell\\Nexus')) \
             {{ Remove-Item -Path $c -Recurse -ErrorAction SilentlyContinue }} 'ok'"
        )
    };
    powershell(&script, &[("EXE", &chemin)]).texte()?;
    Ok(actif)
}

// ─────────────────────────────────────────────── l'état, pour l'affichage

const ETAT: &str = r#"
$d = $null -ne (Get-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -Name 'Nexus' -ErrorAction SilentlyContinue)
$p = Test-Path 'HKCU:\Software\Classes\nexus'
$m = Test-Path 'HKCU:\Software\Classes\*\shell\Nexus'
[pscustomobject]@{ demarrage = [bool]$d; protocole = [bool]$p; menu = [bool]$m } | ConvertTo-Json -Compress
"#;

#[tauri::command]
pub fn etat_integrations() -> Result<Integrations, String> {
    let v = crate::ps::powershell_json(&format!("{UTF8}{ETAT}"), &[])?;
    Ok(Integrations {
        demarrage: v.get("demarrage").and_then(|x| x.as_bool()).unwrap_or(false),
        protocole: v.get("protocole").and_then(|x| x.as_bool()).unwrap_or(false),
        menu_contextuel: v.get("menu").and_then(|x| x.as_bool()).unwrap_or(false),
    })
}

/// Tout brancher d'un coup, au premier lancement.
///
/// On ne le fait qu'UNE fois : si Aharon décoche le clic droit, Nexus ne doit
/// pas le remettre au démarrage suivant. Une application qui rétablit ses
/// réglages toute seule est une application qu'on finit par désinstaller.
#[tauri::command]
pub fn tout_brancher() -> Result<Integrations, String> {
    let _ = regler_demarrage(true);
    let _ = regler_protocole(true);
    let _ = regler_menu_contextuel(true);
    etat_integrations()
}

/// Tout retirer. Pour une désinstallation propre — ce qu'on laisse derrière
/// soi dit beaucoup d'un logiciel.
#[tauri::command]
pub fn tout_debrancher() -> Result<Integrations, String> {
    let _ = regler_demarrage(false);
    let _ = regler_protocole(false);
    let _ = regler_menu_contextuel(false);
    etat_integrations()
}

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
//
//  ATTENTION AU « * », ET C'EST TOUT SAUF UN DÉTAIL.
//
//  La clé qui met « Analyser avec Nexus » sur TOUS les fichiers s'appelle
//  littéralement « HKCU\Software\Classes\*\shell\Nexus ». Or pour PowerShell,
//  « * » veut dire « n'importe quoi » : `New-Item` et `Test-Path` l'auraient
//  compris comme un joker, seraient allés voir ailleurs, et la fonctionnalité
//  phare de cette application n'aurait tout simplement jamais fonctionné —
//  sans la moindre erreur à l'écran.
//
//  On passe donc par `reg.exe`, l'outil de Windows lui-même, qui prend le nom
//  de la clé au pied de la lettre. C'est moins élégant, et c'est juste.

const MENU: &str = r#"
$exe = $env:NEXUS_EXE
# Trois endroits, parce que Windows les traite séparément :
#   *                     → n'importe quel fichier
#   Directory             → un dossier
#   Directory\Background   → le fond d'un dossier, clic droit dans le vide
$cles = @(
  'HKCU\Software\Classes\*\shell\Nexus',
  'HKCU\Software\Classes\Directory\shell\Nexus',
  'HKCU\Software\Classes\Directory\Background\shell\Nexus'
)
foreach ($c in $cles) {
  & reg.exe add $c /ve /t REG_SZ /d 'Analyser avec Nexus' /f | Out-Null
  & reg.exe add $c /v Icon /t REG_SZ /d "$exe,0" /f | Out-Null
  # « %1 » est le fichier sur lequel on a cliqué ; « %V » le dossier ouvert.
  $arg = if ($c -like '*Background*') { '"%V"' } else { '"%1"' }
  & reg.exe add "$c\command" /ve /t REG_SZ /d "`"$exe`" --fichier $arg" /f | Out-Null
}
'ok'
"#;

const MENU_RETIRER: &str = r#"
foreach ($c in @(
  'HKCU\Software\Classes\*\shell\Nexus',
  'HKCU\Software\Classes\Directory\shell\Nexus',
  'HKCU\Software\Classes\Directory\Background\shell\Nexus'
)) { & reg.exe delete $c /f 2>$null | Out-Null }
'ok'
"#;

#[tauri::command]
pub fn regler_menu_contextuel(actif: bool) -> Result<bool, String> {
    let chemin = exe()?;
    let script = if actif {
        format!("{UTF8}{MENU}")
    } else {
        format!("{UTF8}{MENU_RETIRER}")
    };
    powershell(&script, &[("EXE", &chemin)]).texte()?;
    Ok(actif)
}

// ─────────────────────────────────────────────── l'état, pour l'affichage

const ETAT: &str = r#"
$d = $null -ne (Get-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -Name 'Nexus' -ErrorAction SilentlyContinue)
$p = Test-Path 'HKCU:\Software\Classes\nexus'
# Ici encore : « Test-Path » avec un « * » répondrait « oui » dès qu'une clé
# quelconque existe. `reg query` regarde LA clé, et son code de sortie dit tout.
& reg.exe query 'HKCU\Software\Classes\*\shell\Nexus' 2>$null | Out-Null
$m = ($LASTEXITCODE -eq 0)
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

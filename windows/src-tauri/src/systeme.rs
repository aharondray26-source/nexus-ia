// ============================================================================
//  CE QUE NEXUS SAIT DE LA MACHINE
//
//  Batterie, mémoire, disque, réseau, fond d'écran. Rien d'extraordinaire —
//  mais deux choses comptent.
//
//  LA PREMIÈRE : ne jamais inventer. Sur le Mac, Nexus annonçait un
//  pourcentage de batterie sur une machine qui n'a pas de batterie. Ici, un
//  ordinateur fixe rend « pas de batterie » et le dit ; il ne rend pas 100 %.
//
//  LA SECONDE : le fond d'écran. macOS le change par un événement système
//  qu'il faut demander la permission d'envoyer. Windows a une fonction pour
//  ça, et il l'ouvre à tout le monde.
// ============================================================================

use crate::ps::{powershell, powershell_json, UTF8};
use serde::Serialize;

#[derive(Serialize, Clone)]
pub struct Machine {
    pub nom: String,
    pub windows: String,
    pub processeur: String,
    pub memoire_go: f64,
    pub memoire_libre_go: f64,
    pub disque_go: f64,
    pub disque_libre_go: f64,
    pub batterie: Option<u8>,
    pub sur_secteur: bool,
    pub reseau: bool,
}

const ETAT: &str = r#"
$os   = Get-CimInstance Win32_OperatingSystem
$cs   = Get-CimInstance Win32_ComputerSystem
$cpu  = (Get-CimInstance Win32_Processor | Select-Object -First 1).Name
$d    = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='$($env:SystemDrive)'"
# Un ordinateur fixe n'a PAS de batterie : Win32_Battery ne rend rien, et
# c'est une réponse, pas une panne.
$bat  = Get-CimInstance Win32_Battery -ErrorAction SilentlyContinue | Select-Object -First 1
$net  = (Get-NetConnectionProfile -ErrorAction SilentlyContinue | Measure-Object).Count -gt 0
[pscustomobject]@{
  nom             = $cs.Name
  windows         = $os.Caption + ' ' + $os.Version
  processeur      = $cpu
  memoire_go      = [math]::Round($cs.TotalPhysicalMemory / 1GB, 1)
  memoire_libre_go= [math]::Round($os.FreePhysicalMemory / 1MB, 1)
  disque_go       = [math]::Round($d.Size / 1GB, 1)
  disque_libre_go = [math]::Round($d.FreeSpace / 1GB, 1)
  batterie        = if ($bat) { [int]$bat.EstimatedChargeRemaining } else { $null }
  sur_secteur     = if ($bat) { $bat.BatteryStatus -ne 1 } else { $true }
  reseau          = [bool]$net
} | ConvertTo-Json -Depth 3 -Compress
"#;

#[tauri::command]
pub fn etat_machine() -> Result<Machine, String> {
    let v = powershell_json(&format!("{UTF8}{ETAT}"), &[])?;
    let lire_f = |c: &str| v.get(c).and_then(|x| x.as_f64()).unwrap_or(0.0);
    let lire_s = |c: &str| v.get(c).and_then(|x| x.as_str()).unwrap_or("").to_string();
    Ok(Machine {
        nom: lire_s("nom"),
        windows: lire_s("windows"),
        processeur: lire_s("processeur"),
        memoire_go: lire_f("memoire_go"),
        memoire_libre_go: lire_f("memoire_libre_go"),
        disque_go: lire_f("disque_go"),
        disque_libre_go: lire_f("disque_libre_go"),
        batterie: v.get("batterie").and_then(|x| x.as_u64()).map(|n| n.min(100) as u8),
        sur_secteur: v.get("sur_secteur").and_then(|x| x.as_bool()).unwrap_or(true),
        reseau: v.get("reseau").and_then(|x| x.as_bool()).unwrap_or(false),
    })
}

/// Le fond d'écran. On appelle la fonction de Windows prévue pour ça, et l'on
/// lui demande d'enregistrer le changement — sans le dernier paramètre, le
/// fond revient à l'ancien au prochain démarrage, et l'on croit que ça n'a pas
/// marché.
const FOND: &str = r#"
$chemin = $env:NEXUS_CHEMIN
if (-not (Test-Path -LiteralPath $chemin)) { throw "Cette image n'existe pas : $chemin" }
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class NexusFond {
  [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
  public static extern int SystemParametersInfo(int action, int param, string valeur, int maj);
}
"@
# 20 = poser le fond ; 1 = l'écrire dans les réglages ; 2 = prévenir le bureau.
$r = [NexusFond]::SystemParametersInfo(20, 0, $chemin, 1 -bor 2)
if ($r -eq 0) { throw "Windows a refusé de changer le fond d'écran." }
"ok"
"#;

#[tauri::command]
pub fn changer_fond_ecran(chemin: String) -> Result<String, String> {
    powershell(&format!("{UTF8}{FOND}"), &[("CHEMIN", &chemin)]).texte()?;
    Ok(chemin)
}

/// Le presse-papiers. Windows le laisse lire et écrire librement ; macOS aussi,
/// mais ici cela permet à la mascotte de travailler sur ce qu'on vient de
/// copier, sans avoir à le recoller dans une fenêtre.
#[tauri::command]
pub fn lire_presse_papiers() -> Result<String, String> {
    powershell(&format!("{UTF8}Get-Clipboard -Raw"), &[]).texte()
}

#[tauri::command]
pub fn ecrire_presse_papiers(texte: String) -> Result<String, String> {
    powershell(&format!("{UTF8}Set-Clipboard -Value $env:NEXUS_TEXTE"),
               &[("TEXTE", &texte)])
        .texte()?;
    Ok(texte)
}

/// Installer un logiciel avec winget, l'outil d'installation livré avec
/// Windows 11 (et disponible sur Windows 10). C'est la chose que macOS ne sait
/// pas faire sans Homebrew : ici, « installe VLC » suffit.
#[tauri::command]
pub fn installer_logiciel(nom: String) -> Result<String, String> {
    let propre: String = nom
        .chars()
        .filter(|c| c.is_alphanumeric() || matches!(c, ' ' | '.' | '-' | '_' | '+'))
        .collect();
    if propre.trim().len() < 2 {
        return Err("Quel logiciel installer ?".into());
    }
    let script = format!(
        "{UTF8}\
         if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {{ \
           throw \"winget n'est pas sur ce PC. Il vient avec Windows 11 ; \
           sur Windows 10 il s'installe depuis le Microsoft Store, il s'appelle \
           « Programme d'installation d'application ».\" }}\
         winget install --name $env:NEXUS_NOM --accept-source-agreements \
           --accept-package-agreements --disable-interactivity 2>&1 | Out-String"
    );
    let r = powershell(&script, &[("NOM", propre.trim())]);
    if r.ok {
        Ok(format!("« {} » est installé.\n\n{}", propre.trim(), r.sortie))
    } else {
        Err(format!(
            "L'installation de « {}» n'a pas abouti :\n{}",
            propre.trim(),
            if r.erreur.is_empty() { r.sortie } else { r.erreur }
        ))
    }
}

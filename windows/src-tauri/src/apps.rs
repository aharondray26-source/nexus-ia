// ============================================================================
//  LES APPLICATIONS, ET LES FENÊTRES OUVERTES
//
//  Sur macOS, ouvrir une application depuis Nexus est simple, mais en PILOTER
//  une autre demande à l'utilisateur d'accorder une autorisation par
//  application, dans les Réglages Système. Windows ne demande rien : Nexus
//  peut lister ce qui est installé, ce qui tourne, ce qui est à l'écran, et
//  passer d'une fenêtre à l'autre. C'est ce que réclamait Aharon quand il
//  disait que Windows est « plus compatible ».
//
//  CE QU'ON APPELLE « UNE APPLICATION INSTALLÉE ». Pas ce que dit le registre
//  — il est plein de rustines, de redistribuables et de pilotes que personne
//  n'a jamais ouverts. On lit le MENU DÉMARRER : c'est exactement la liste
//  qu'une personne a en tête quand elle dit « ouvre Word ».
// ============================================================================

use crate::ps::{powershell, powershell_json, UTF8};
use serde::Serialize;

#[derive(Serialize, Clone)]
pub struct App {
    pub nom: String,
    pub chemin: String,
}

#[derive(Serialize, Clone)]
pub struct Fenetre {
    pub titre: String,
    pub app: String,
    pub pid: u32,
}

const LISTER: &str = r#"
$dossiers = @(
  "$env:APPDATA\Microsoft\Windows\Start Menu\Programs",
  "$env:ProgramData\Microsoft\Windows\Start Menu\Programs"
)
$vus = @{}
$out = @()
foreach ($d in $dossiers) {
  if (-not (Test-Path -LiteralPath $d)) { continue }
  Get-ChildItem -LiteralPath $d -Recurse -Filter *.lnk -ErrorAction SilentlyContinue |
    ForEach-Object {
      $n = $_.BaseName
      # Le Menu Démarrer est plein de « Désinstaller X », « Manuel de X »,
      # « Site web de X ». Personne ne dit jamais « ouvre le manuel de X ».
      if ($n -match '(?i)désinstall|desinstall|uninstall|readme|lisez.?moi|manuel|aide$|help$|site web|website|documentation') { return }
      if ($vus.ContainsKey($n.ToLower())) { return }
      $vus[$n.ToLower()] = $true
      $out += [pscustomobject]@{ nom = $n; chemin = $_.FullName }
    }
}
$out | Sort-Object nom | ConvertTo-Json -Depth 3 -Compress
"#;

#[tauri::command]
pub fn lister_applications() -> Result<Vec<App>, String> {
    let v = powershell_json(&format!("{UTF8}{LISTER}"), &[])?;
    let liste = match v {
        serde_json::Value::Array(a) => a,
        serde_json::Value::Null => vec![],
        autre => vec![autre],
    };
    Ok(liste
        .into_iter()
        .filter_map(|o| {
            Some(App {
                nom: o.get("nom")?.as_str()?.to_string(),
                chemin: o.get("chemin")?.as_str()?.to_string(),
            })
        })
        .collect())
}

/// Trouver l'application dont on parle, sans exiger le nom exact.
///
/// « ouvre word » doit trouver « Word ». « ouvre libre office » doit trouver
/// « LibreOffice Writer ». On compare donc en minuscules, sans accents ni
/// espaces, et l'on préfère le nom le PLUS COURT parmi ceux qui conviennent —
/// « Word » plutôt que « Word Mobile Companion », qui contient aussi « word ».
fn replier(s: &str) -> String {
    s.to_lowercase()
        .chars()
        .filter(|c| c.is_alphanumeric())
        .collect()
}

#[tauri::command]
pub fn ouvrir_application(nom: String) -> Result<String, String> {
    let cible = replier(&nom);
    if cible.is_empty() {
        return Err("Quelle application ?".into());
    }
    let apps = lister_applications()?;

    let mut exact: Option<&App> = None;
    let mut partiel: Option<&App> = None;
    for a in &apps {
        let n = replier(&a.nom);
        if n == cible {
            exact = Some(a);
            break;
        }
        if n.contains(&cible) || cible.contains(&n) {
            match partiel {
                Some(p) if p.nom.len() <= a.nom.len() => {}
                _ => partiel = Some(a),
            }
        }
    }
    let choisie = exact.or(partiel).ok_or_else(|| {
        format!(
            "Aucune application nommée « {nom} » sur ce PC. Ce qui est installé, entre autres : {}",
            apps.iter().take(12).map(|a| a.nom.as_str()).collect::<Vec<_>>().join(", ")
        )
    })?;

    let script = format!("{UTF8}Start-Process -FilePath $env:NEXUS_CHEMIN");
    powershell(&script, &[("CHEMIN", &choisie.chemin)]).texte()?;
    Ok(choisie.nom.clone())
}

const FENETRES: &str = r#"
Get-Process | Where-Object { $_.MainWindowTitle -ne '' } |
  Select-Object -First 40 |
  ForEach-Object { [pscustomobject]@{
      titre = $_.MainWindowTitle
      app   = $_.ProcessName
      pid   = [int]$_.Id
  } } | ConvertTo-Json -Depth 3 -Compress
"#;

#[tauri::command]
pub fn lister_fenetres() -> Result<Vec<Fenetre>, String> {
    let v = powershell_json(&format!("{UTF8}{FENETRES}"), &[])?;
    let liste = match v {
        serde_json::Value::Array(a) => a,
        serde_json::Value::Null => vec![],
        autre => vec![autre],
    };
    Ok(liste
        .into_iter()
        .filter_map(|o| {
            Some(Fenetre {
                titre: o.get("titre")?.as_str()?.to_string(),
                app: o.get("app").and_then(|x| x.as_str()).unwrap_or("").to_string(),
                pid: o.get("pid").and_then(|x| x.as_u64()).unwrap_or(0) as u32,
            })
        })
        .collect())
}

/// Mettre une fenêtre au premier plan. Windows le permet sans rien demander ;
/// macOS exige l'autorisation « Accessibilité », donnée à la main.
const ACTIVER: &str = r#"
$cible = [int]$env:NEXUS_PID
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class NexusF {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c);
}
"@
$p = Get-Process -Id $cible -ErrorAction Stop
if ($p.MainWindowHandle -eq 0) { throw "Cette application n'a pas de fenêtre visible." }
[void][NexusF]::ShowWindow($p.MainWindowHandle, 9)   # 9 = restaurer si réduite
[void][NexusF]::SetForegroundWindow($p.MainWindowHandle)
"ok"
"#;

#[tauri::command]
pub fn activer_fenetre(pid: u32) -> Result<String, String> {
    powershell(&format!("{UTF8}{ACTIVER}"), &[("PID", &pid.to_string())]).texte()
}

/// Fermer une application, poliment d'abord.
///
/// `CloseMainWindow` demande à l'application de se fermer : elle peut alors
/// proposer d'enregistrer. La tuer directement ferait perdre le travail en
/// cours — ce n'est pas à Nexus de décider ça.
const FERMER: &str = r#"
$p = Get-Process -Id ([int]$env:NEXUS_PID) -ErrorAction Stop
$nom = $p.ProcessName
if (-not $p.CloseMainWindow()) { throw "« $nom » n'a pas voulu se fermer ; elle a peut-être une question à l'écran." }
"$nom"
"#;

#[tauri::command]
pub fn fermer_application(pid: u32) -> Result<String, String> {
    powershell(&format!("{UTF8}{FERMER}"), &[("PID", &pid.to_string())]).texte()
}

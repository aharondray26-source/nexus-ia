// ============================================================================
//  RETROUVER SES FICHIERS
//
//  C'est là que Windows est meilleur que le Mac, et il faut s'en servir.
//
//  Windows tient un INDEX de tout ce qu'il y a sur le disque — le même que
//  celui du menu Démarrer — et il l'ouvre à qui le demande, sans autorisation,
//  sans fenêtre de permission, sans rien à cocher. Sur macOS, Nexus doit
//  demander « Accès complet au disque » et attendre qu'Aharon aille le donner
//  dans les Réglages Système.
//
//  Cet index sait deux choses, et la deuxième est celle qui compte :
//    · les NOMS de fichiers, instantanément, sur tout le disque ;
//    · le CONTENU des documents — Word, PDF, texte — également indexé. On peut
//      donc demander « quel fichier parle de la photosynthèse ? » et avoir la
//      réponse tout de suite, sans ouvrir un seul fichier.
//
//  ET SI L'INDEX EST ÉTEINT ? Certaines machines d'école le désactivent. On ne
//  rend pas « aucun résultat » — ce serait un mensonge. On parcourt alors les
//  dossiers de l'utilisateur nous-mêmes, en s'arrêtant à temps.
// ============================================================================

use crate::ps::{powershell_json, UTF8};
use serde::Serialize;

#[derive(Serialize, Clone)]
pub struct Fichier {
    pub nom: String,
    pub chemin: String,
    pub taille: u64,
    pub modifie: String,
    pub dossier: bool,
}

/// Ce qu'on accepte dans une recherche. Le reste est retiré.
///
/// Ce n'est pas de la méfiance envers Aharon : c'est que le terme part dans
/// une requête, et qu'une apostrophe au milieu d'un nom de fichier — « L'été
/// dernier » — suffirait à en changer le sens. On garde les lettres, les
/// chiffres, les accents, l'espace, le point, le tiret et le souligné : tout
/// ce dont un vrai nom de fichier a besoin.
fn nettoyer(terme: &str) -> String {
    terme
        .chars()
        .filter(|c| c.is_alphanumeric() || matches!(c, ' ' | '.' | '-' | '_' | '\''))
        .map(|c| if c == '\'' { ' ' } else { c })
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

fn vers_fichiers(v: serde_json::Value) -> Vec<Fichier> {
    // PowerShell rend UN objet quand il n'y a qu'un résultat, et un TABLEAU
    // au-delà. Sans ce repli, une recherche qui trouve exactement un fichier
    // rendrait « rien trouvé » — le genre de bug qui ne se voit qu'un jour sur
    // vingt et qu'on met des heures à croire.
    let liste = match v {
        serde_json::Value::Array(a) => a,
        serde_json::Value::Null => vec![],
        autre => vec![autre],
    };
    liste
        .into_iter()
        .filter_map(|o| {
            let chemin = o.get("chemin")?.as_str()?.to_string();
            if chemin.is_empty() {
                return None;
            }
            Some(Fichier {
                nom: o.get("nom").and_then(|x| x.as_str()).unwrap_or("").to_string(),
                chemin,
                taille: o.get("taille").and_then(|x| x.as_u64()).unwrap_or(0),
                modifie: o.get("modifie").and_then(|x| x.as_str()).unwrap_or("").to_string(),
                dossier: o.get("dossier").and_then(|x| x.as_bool()).unwrap_or(false),
            })
        })
        .collect()
}

/// L'index de Windows, interrogé comme une base de données. C'est ce que fait
/// le menu Démarrer, en plus ciblé.
const REQUETE_INDEX: &str = r#"
$terme = $env:NEXUS_TERME
$ou    = $env:NEXUS_OU
$mode  = $env:NEXUS_MODE
$limite = 60
$cond = if ($mode -eq 'contenu') {
  "CONTAINS(System.Search.Contents, '""$terme""')"
} else {
  "System.ItemNameDisplay LIKE '%$terme%'"
}
if ($ou) { $cond = "$cond AND SCOPE='file:$ou'" }
$sql = "SELECT TOP $limite System.ItemPathDisplay, System.ItemNameDisplay, System.Size, System.DateModified, System.ItemType FROM SystemIndex WHERE $cond ORDER BY System.DateModified DESC"
$conn = New-Object -ComObject ADODB.Connection
$conn.Open("Provider=Search.CollatorDSO;Extended Properties='Application=Windows'")
$rs = $conn.Execute($sql)
$out = @()
while (-not $rs.EOF) {
  $out += [pscustomobject]@{
    nom     = [string]$rs.Fields.Item('System.ItemNameDisplay').Value
    chemin  = [string]$rs.Fields.Item('System.ItemPathDisplay').Value
    taille  = [uint64](($rs.Fields.Item('System.Size').Value) -as [uint64])
    modifie = [string]$rs.Fields.Item('System.DateModified').Value
    dossier = ([string]$rs.Fields.Item('System.ItemType').Value) -eq 'Directory'
  }
  $rs.MoveNext()
}
$conn.Close()
$out | ConvertTo-Json -Depth 3 -Compress
"#;

/// Le repli : on regarde nous-mêmes, dans les dossiers où l'on range ses
/// affaires. Plus lent, mais il répond toujours.
const REQUETE_A_LA_MAIN: &str = r#"
$terme = $env:NEXUS_TERME
$ou    = $env:NEXUS_OU
$racines = if ($ou) { @($ou) } else {
  @("$env:USERPROFILE\Desktop", "$env:USERPROFILE\Documents",
    "$env:USERPROFILE\Downloads", "$env:USERPROFILE\Pictures",
    "$env:USERPROFILE\OneDrive")
}
$out = @()
foreach ($r in $racines) {
  if (-not (Test-Path -LiteralPath $r)) { continue }
  Get-ChildItem -LiteralPath $r -Recurse -Force -ErrorAction SilentlyContinue -Depth 6 |
    Where-Object { $_.Name -like "*$terme*" } |
    Select-Object -First 40 |
    ForEach-Object {
      $out += [pscustomobject]@{
        nom     = $_.Name
        chemin  = $_.FullName
        taille  = [uint64](if ($_.PSIsContainer) { 0 } else { $_.Length })
        modifie = $_.LastWriteTime.ToString('s')
        dossier = [bool]$_.PSIsContainer
      }
    }
  if ($out.Count -ge 40) { break }
}
$out | Select-Object -First 40 | ConvertTo-Json -Depth 3 -Compress
"#;

#[tauri::command]
pub fn chercher_fichiers(nom: String, dossier: Option<String>) -> Result<Vec<Fichier>, String> {
    let terme = nettoyer(&nom);
    if terme.len() < 2 {
        return Err("Donne au moins deux lettres à chercher.".into());
    }
    let ou = dossier.unwrap_or_default();
    let valeurs = [("TERME", terme.as_str()), ("OU", ou.as_str()), ("MODE", "nom")];

    // L'index d'abord : il répond en quelques millisecondes.
    let script = format!("{UTF8}{REQUETE_INDEX}");
    if let Ok(v) = powershell_json(&script, &valeurs) {
        let r = vers_fichiers(v);
        if !r.is_empty() {
            return Ok(r);
        }
    }
    // Rien, ou l'index est éteint : on cherche nous-mêmes plutôt que de
    // répondre « aucun résultat » alors qu'on n'a rien regardé.
    let script = format!("{UTF8}{REQUETE_A_LA_MAIN}");
    Ok(vers_fichiers(powershell_json(&script, &valeurs)?))
}

#[tauri::command]
pub fn chercher_dans_contenu(texte: String) -> Result<Vec<Fichier>, String> {
    let terme = nettoyer(&texte);
    if terme.len() < 3 {
        return Err("Donne au moins trois lettres à chercher dans les documents.".into());
    }
    let valeurs = [("TERME", terme.as_str()), ("OU", ""), ("MODE", "contenu")];
    let script = format!("{UTF8}{REQUETE_INDEX}");
    match powershell_json(&script, &valeurs) {
        Ok(v) => Ok(vers_fichiers(v)),
        // Ici, pas de repli possible : ouvrir chaque document du disque pour y
        // chercher un mot prendrait des heures. On dit ce qui manque, et
        // comment l'allumer — c'est deux clics, et ça sert à tout Windows.
        Err(_) => Err("La recherche dans le contenu des documents a besoin de \
                       l'indexation de Windows, qui est éteinte sur cette machine.\n\n\
                       Pour l'allumer : Paramètres → Confidentialité et sécurité → \
                       Recherche Windows → « Amélioré ». Windows range alors le \
                       contenu de tes documents une fois, et après c'est instantané \
                       — pour Nexus comme pour le menu Démarrer."
                       .into()),
    }
}

/// Montrer un fichier dans l'Explorateur, SÉLECTIONNÉ. Pas « ouvrir le
/// dossier » : le fichier doit être en surbrillance, sinon on le cherche des
/// yeux dans une liste de trois cents.
#[tauri::command]
pub fn montrer_fichier(chemin: String) -> Result<String, String> {
    if !std::path::Path::new(&chemin).exists() {
        return Err(format!("Ce chemin n'existe pas : {chemin}"));
    }
    let script = format!(
        "{UTF8}Start-Process explorer.exe -ArgumentList ('/select,\"' + $env:NEXUS_CHEMIN + '\"')"
    );
    crate::ps::powershell(&script, &[("CHEMIN", &chemin)]).texte()?;
    Ok(chemin)
}

/// Ouvrir un fichier avec l'application qui lui est associée.
#[tauri::command]
pub fn ouvrir_fichier(chemin: String) -> Result<String, String> {
    if !std::path::Path::new(&chemin).exists() {
        return Err(format!("Ce chemin n'existe pas : {chemin}"));
    }
    let script = format!("{UTF8}Start-Process -FilePath $env:NEXUS_CHEMIN");
    crate::ps::powershell(&script, &[("CHEMIN", &chemin)]).texte()?;
    Ok(chemin)
}

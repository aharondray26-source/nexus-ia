// ============================================================================
//  LIRE L'ÉCRAN
//
//  La Loupe de Nexus, mais côté Windows — et en mieux.
//
//  Sur macOS, capturer l'écran demande une autorisation « Enregistrement de
//  l'écran » que l'utilisateur doit accorder dans les Réglages Système, puis
//  RELANCER l'application. Windows ne demande rien.
//
//  Et Windows sait LIRE ce qu'il y a sur l'image, tout seul, hors ligne, sans
//  rien installer : la reconnaissance de texte est livrée avec le système
//  depuis Windows 10. Nexus s'en sert avant même de parler au modèle — ce qui
//  veut dire qu'un exercice photographié est lu EXACTEMENT, accents compris,
//  au lieu d'être deviné par une intelligence qui regarde une image.
//
//  C'est exactement la règle qu'on s'était donnée pour les maths : ce qui peut
//  être su avec certitude ne doit pas être deviné.
// ============================================================================

use crate::ps::{powershell, UTF8};
use serde::Serialize;

#[derive(Serialize, Clone)]
pub struct Capture {
    /// L'image, en base64, prête à être affichée ou envoyée au modèle.
    pub png: String,
    pub largeur: u32,
    pub hauteur: u32,
    /// Le texte lu par Windows. Vide si la machine n'a pas de langue de
    /// reconnaissance installée — et l'on le dit alors franchement.
    pub texte: String,
}

/// Une capture, éventuellement d'une zone. Les quatre nombres sont en pixels
/// d'écran ; à zéro, on prend tout.
const CAPTURER: &str = r#"
Add-Type -AssemblyName System.Windows.Forms, System.Drawing
$x = [int]$env:NEXUS_X; $y = [int]$env:NEXUS_Y
$l = [int]$env:NEXUS_L; $h = [int]$env:NEXUS_H
if ($l -le 0 -or $h -le 0) {
  $ecran = [System.Windows.Forms.SystemInformation]::VirtualScreen
  $x = $ecran.X; $y = $ecran.Y; $l = $ecran.Width; $h = $ecran.Height
}
$bmp = New-Object System.Drawing.Bitmap $l, $h
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($x, $y, 0, 0, $bmp.Size)
$g.Dispose()
$flux = New-Object System.IO.MemoryStream
$bmp.Save($flux, [System.Drawing.Imaging.ImageFormat]::Png)
$octets = $flux.ToArray()
$flux.Dispose(); $bmp.Dispose()
[pscustomobject]@{
  png = [Convert]::ToBase64String($octets)
  largeur = $l
  hauteur = $h
} | ConvertTo-Json -Compress
"#;

/// La reconnaissance de texte de Windows.
///
/// Elle est asynchrone, et PowerShell ne sait pas attendre une opération WinRT
/// tout seul : il faut lui donner la méthode générique `AsTask`. C'est le seul
/// morceau tordu de tout le fichier, et il est tordu chez Microsoft, pas ici.
const LIRE_TEXTE: &str = r#"
$octets = [Convert]::FromBase64String($env:NEXUS_PNG)
$tmp = [System.IO.Path]::GetTempFileName() + '.png'
[System.IO.File]::WriteAllBytes($tmp, $octets)
try {
  [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null
  [Windows.Graphics.Imaging.BitmapDecoder, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null
  [Windows.Storage.StorageFile, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null

  $asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and
    $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })
  function Attendre($op, $type) {
    $m = $asTask.MakeGenericMethod($type)
    $t = $m.Invoke($null, @($op))
    $t.Wait(-1) | Out-Null
    $t.Result
  }

  $moteur = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
  if ($null -eq $moteur) { throw 'AUCUNE_LANGUE' }

  $fichier = Attendre ([Windows.Storage.StorageFile]::GetFileFromPathAsync($tmp)) ([Windows.Storage.StorageFile])
  $flux    = Attendre ($fichier.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
  $dec     = Attendre ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($flux)) ([Windows.Graphics.Imaging.BitmapDecoder])
  $image   = Attendre ($dec.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
  $res     = Attendre ($moteur.RecognizeAsync($image)) ([Windows.Media.Ocr.OcrResult])
  $res.Text
} finally {
  Remove-Item -LiteralPath $tmp -ErrorAction SilentlyContinue
}
"#;

#[tauri::command]
pub fn capturer_ecran(
    x: Option<i32>,
    y: Option<i32>,
    largeur: Option<i32>,
    hauteur: Option<i32>,
    lire: Option<bool>,
) -> Result<Capture, String> {
    let v = crate::ps::powershell_json(
        &format!("{UTF8}{CAPTURER}"),
        &[
            ("X", &x.unwrap_or(0).to_string()),
            ("Y", &y.unwrap_or(0).to_string()),
            ("L", &largeur.unwrap_or(0).to_string()),
            ("H", &hauteur.unwrap_or(0).to_string()),
        ],
    )?;
    let png = v
        .get("png")
        .and_then(|x| x.as_str())
        .ok_or("Windows n'a pas rendu d'image.")?
        .to_string();

    // Le texte, si on le demande. Une lecture ratée n'est PAS un échec de la
    // capture : on rend l'image quand même, et le modèle se débrouillera avec.
    let texte = if lire.unwrap_or(true) {
        match powershell(&format!("{UTF8}{LIRE_TEXTE}"), &[("PNG", &png)]).texte() {
            Ok(t) => t,
            Err(e) if e.contains("AUCUNE_LANGUE") => String::from(
                "(Windows n'a pas de langue de reconnaissance installée sur ce PC. \
                 Paramètres → Heure et langue → Langue → Français → Options → \
                 « Reconnaissance optique de caractères ». Ça se télécharge en \
                 quelques secondes et ça sert ensuite partout.)",
            ),
            Err(_) => String::new(),
        }
    } else {
        String::new()
    };

    Ok(Capture {
        png,
        largeur: v.get("largeur").and_then(|x| x.as_u64()).unwrap_or(0) as u32,
        hauteur: v.get("hauteur").and_then(|x| x.as_u64()).unwrap_or(0) as u32,
        texte,
    })
}

/// La taille de l'écran, pour que la Loupe sache où dessiner sa fenêtre.
#[tauri::command]
pub fn taille_ecran() -> Result<serde_json::Value, String> {
    let script = format!(
        "{UTF8}Add-Type -AssemblyName System.Windows.Forms; \
         $e = [System.Windows.Forms.SystemInformation]::VirtualScreen; \
         [pscustomobject]@{{ x = $e.X; y = $e.Y; largeur = $e.Width; hauteur = $e.Height }} \
         | ConvertTo-Json -Compress"
    );
    crate::ps::powershell_json(&script, &[])
}

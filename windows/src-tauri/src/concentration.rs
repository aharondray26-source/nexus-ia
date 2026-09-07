// ============================================================================
//  LE MODE CONCENTRATION
//
//  Aharon est lycéen. La fonction dont un lycéen a vraiment besoin sur son PC
//  n'est pas un widget de plus : c'est de pouvoir travailler une heure sans
//  que Discord, YouTube ou Steam ne reviennent le chercher.
//
//  CE QU'ON FAIT, ET CE QU'ON NE FAIT PAS.
//
//  On ne bloque pas des sites en modifiant le fichier « hosts » : cela demande
//  les droits administrateur, donc un mot de passe qu'un élève n'a pas
//  forcément sur le PC familial ou celui du lycée. Une fonction qui exige un
//  mot de passe est une fonction qui ne servira jamais.
//
//  On fait ce qui marche sans aucun droit particulier :
//    · on ferme POLIMENT les applications choisies, au début ;
//    · on repasse toutes les vingt secondes : si l'une revient — et elle
//      revient, c'est bien le problème — on la referme ;
//    · on coupe les notifications de Windows pendant la séance ;
//    · à la fin, on rend tout comme c'était, et l'on prévient.
//
//  ET SURTOUT : ON PEUT ARRÊTER À TOUT MOMENT. Un outil de concentration qui
//  enferme est un outil qu'on contourne, puis qu'on désinstalle. Celui-ci
//  demande un geste volontaire pour revenir en arrière — pas un combat.
// ============================================================================

use crate::ps::{powershell, UTF8};
use serde::Serialize;
use std::sync::atomic::{AtomicBool, AtomicI64, Ordering};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

/// La fin de la séance, en secondes depuis 1970. Zéro = aucune séance.
static FIN: AtomicI64 = AtomicI64::new(0);
static EN_COURS: AtomicBool = AtomicBool::new(false);
static APPS: Mutex<Vec<String>> = Mutex::new(Vec::new());

#[derive(Serialize, Clone)]
pub struct Seance {
    pub en_cours: bool,
    pub secondes_restantes: i64,
    pub applications: Vec<String>,
}

fn maintenant() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

/// Fermer poliment : l'application peut proposer d'enregistrer. On ne tue
/// jamais un processus — on ne va pas faire perdre un devoir en cours pour
/// aider quelqu'un à se concentrer dessus.
fn fermer(noms: &[String]) {
    if noms.is_empty() {
        return;
    }
    let liste = noms.join(",");
    let script = format!(
        "{UTF8}\
         foreach ($n in ($env:NEXUS_APPS -split ',')) {{ \
           Get-Process -Name $n -ErrorAction SilentlyContinue | ForEach-Object {{ \
             if ($_.MainWindowHandle -ne 0) {{ [void]$_.CloseMainWindow() }} \
           }} \
         }} 'ok'"
    );
    let _ = powershell(&script, &[("APPS", &liste)]);
}

const NOTIFS: &str = r"HKCU:\Software\Microsoft\Windows\CurrentVersion\PushNotifications";

fn notifications(actives: bool) {
    let script = format!(
        "{UTF8}\
         New-Item -Path '{NOTIFS}' -Force | Out-Null; \
         Set-ItemProperty -Path '{NOTIFS}' -Name 'ToastEnabled' -Type DWord -Value {}; 'ok'",
        if actives { 1 } else { 0 }
    );
    let _ = powershell(&script, &[]);
}

#[tauri::command]
pub fn demarrer_concentration(
    minutes: u32,
    applications: Vec<String>,
    silence: Option<bool>,
) -> Result<Seance, String> {
    if minutes == 0 || minutes > 8 * 60 {
        return Err("Une séance dure entre une minute et huit heures.".into());
    }
    // Des noms de processus, pas des chemins : « Discord », pas
    // « C:\...\Discord.exe ». On nettoie pour que la liste ne puisse pas
    // changer le sens de la commande.
    let propres: Vec<String> = applications
        .iter()
        .map(|a| {
            a.trim()
                .trim_end_matches(".exe")
                .chars()
                .filter(|c| c.is_alphanumeric() || matches!(c, '-' | '_' | ' '))
                .collect::<String>()
                .trim()
                .to_string()
        })
        .filter(|a| !a.is_empty())
        .collect();

    *APPS.lock().map_err(|_| "état interne inaccessible")? = propres.clone();
    FIN.store(maintenant() + (minutes as i64) * 60, Ordering::SeqCst);
    EN_COURS.store(true, Ordering::SeqCst);

    fermer(&propres);
    if silence.unwrap_or(true) {
        notifications(false);
    }

    // LA RONDE. Sans elle, on ferme Discord une fois et il est rouvert
    // trente secondes plus tard : le mode concentration ne servirait à rien.
    std::thread::spawn(move || {
        loop {
            std::thread::sleep(std::time::Duration::from_secs(20));
            if !EN_COURS.load(Ordering::SeqCst) {
                break;
            }
            if maintenant() >= FIN.load(Ordering::SeqCst) {
                EN_COURS.store(false, Ordering::SeqCst);
                notifications(true);
                break;
            }
            let liste = APPS.lock().map(|a| a.clone()).unwrap_or_default();
            fermer(&liste);
        }
    });

    etat_concentration()
}

#[tauri::command]
pub fn arreter_concentration() -> Result<Seance, String> {
    EN_COURS.store(false, Ordering::SeqCst);
    FIN.store(0, Ordering::SeqCst);
    notifications(true);
    etat_concentration()
}

#[tauri::command]
pub fn etat_concentration() -> Result<Seance, String> {
    let en_cours = EN_COURS.load(Ordering::SeqCst);
    let restant = (FIN.load(Ordering::SeqCst) - maintenant()).max(0);
    Ok(Seance {
        en_cours: en_cours && restant > 0,
        secondes_restantes: if en_cours { restant } else { 0 },
        applications: APPS.lock().map(|a| a.clone()).unwrap_or_default(),
    })
}

/// Ce qui distrait le plus, proposé d'avance. On ne devine pas : c'est ce
/// qu'on voit tourner sur la machine, croisé avec une liste connue.
const DISTRACTIONS: &[&str] = &[
    "Discord", "Steam", "EpicGamesLauncher", "Spotify", "Telegram", "WhatsApp",
    "Signal", "Battle.net", "RiotClientServices", "LeagueClient", "Roblox",
    "Messenger", "Snapchat", "TikTok", "Twitch", "obs64", "vlc",
];

#[tauri::command]
pub fn distractions_ouvertes() -> Result<Vec<String>, String> {
    let liste = DISTRACTIONS.join(",");
    let script = format!(
        "{UTF8}\
         $noms = $env:NEXUS_APPS -split ','; \
         $out = @(); \
         foreach ($n in $noms) {{ \
           if (Get-Process -Name $n -ErrorAction SilentlyContinue) {{ $out += $n }} \
         }} \
         $out | ConvertTo-Json -Compress"
    );
    let v = crate::ps::powershell_json(&script, &[("APPS", &liste)])?;
    Ok(match v {
        serde_json::Value::Array(a) => a
            .into_iter()
            .filter_map(|x| x.as_str().map(String::from))
            .collect(),
        serde_json::Value::String(s) => vec![s],
        _ => vec![],
    })
}

// ============================================================================
//  NEXUS POUR WINDOWS
//
//  Aharon : « il faut vraiment que tu fasses aussi une application compatible
//  avec Microsoft Windows, ça va être ta page principale. »
//
//  L'IDÉE DIRECTRICE, et tout le reste en découle : sur Windows, il manque
//  UNE chose que le Mac a et qu'on ne remplace jamais vraiment — la barre qui
//  s'ouvre au clavier, par-dessus tout, et à laquelle on demande n'importe
//  quoi. Le menu Démarrer ne fait pas ça : il cherche, il propose du web, il
//  met une seconde et demie, et il ne répond pas aux questions.
//
//  Nexus, lui, s'ouvre sur ALT + ESPACE, instantanément, par-dessus le jeu ou
//  le cours en visio, et on lui parle. C'est le cœur de l'application, et
//  c'est pour ça que tout le reste — la recherche, les automatisations, la
//  Loupe, la concentration — se branche là.
//
//  L'INTERFACE EST CELLE DU SITE. Pas une copie : le site lui-même, embarqué.
//  Une correction faite au visuel arrive donc partout à la fois, et le style
//  de Nexus reste le même d'un appareil à l'autre — c'est la règle depuis le
//  début.
// ============================================================================

mod apps;
mod concentration;
mod ecran;
mod fichiers;
mod integration;
mod ps;
mod scripts;
mod systeme;

use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{Emitter, Manager};

/// Ce que la ligne de commande a apporté : un fichier (clic droit dans
/// l'Explorateur) ou une adresse « nexus:// ». On le garde pour le donner à
/// l'interface dès qu'elle est prête — sinon l'événement part avant que
/// quiconque écoute, et le fichier est perdu sans un mot.
fn argument_utile(args: &[String]) -> Option<(String, String)> {
    let mut i = 0;
    while i < args.len() {
        let a = &args[i];
        if a == "--fichier" {
            if let Some(v) = args.get(i + 1) {
                if !v.is_empty() {
                    return Some(("fichier".into(), v.clone()));
                }
            }
            i += 2;
            continue;
        }
        if a.starts_with("nexus://") {
            return Some(("adresse".into(), a.clone()));
        }
        i += 1;
    }
    None
}

fn montrer(app: &tauri::AppHandle) {
    if let Some(f) = app.get_webview_window("main") {
        let _ = f.unminimize();
        let _ = f.show();
        let _ = f.set_focus();
    }
}

/// Montrer, et ouvrir la barre de commande. C'est le geste d'Alt+Espace.
fn montrer_et_demander(app: &tauri::AppHandle) {
    montrer(app);
    let _ = app.emit("nexus://palette", ());
}

fn cacher(app: &tauri::AppHandle) {
    if let Some(f) = app.get_webview_window("main") {
        let _ = f.hide();
    }
}

/// Le raccourci global, et pourquoi celui-là.
///
/// Alt+Espace est, sur Windows, le menu de fenêtre — une relique que plus
/// personne n'utilise et que personne ne regrettera. C'est le meilleur endroit
/// libre du clavier : à portée du pouce gauche, sans conflit avec Ctrl+quelque
/// chose, et déjà celui qu'utilisent les outils du même genre.
#[cfg(desktop)]
fn brancher_raccourci(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

    let alt_espace = Shortcut::new(Some(Modifiers::ALT), Code::Space);
    app.plugin(
        tauri_plugin_global_shortcut::Builder::new()
            .with_handler(move |app, recu, evenement| {
                // On agit au RELÂCHEMENT, pas à l'enfoncement : sinon un appui
                // maintenu déclenche en rafale, et la fenêtre clignote.
                if evenement.state() != ShortcutState::Released {
                    return;
                }
                if recu != &alt_espace {
                    return;
                }
                // Une bascule : si Nexus est déjà là et devant, on le range.
                // Sans ça, le même geste ne sert qu'à ouvrir, et l'on cherche
                // la souris pour refermer.
                let visible = app
                    .get_webview_window("main")
                    .and_then(|f| f.is_visible().ok())
                    .unwrap_or(false);
                let devant = app
                    .get_webview_window("main")
                    .and_then(|f| f.is_focused().ok())
                    .unwrap_or(false);
                if visible && devant {
                    cacher(app);
                } else {
                    montrer_et_demander(app);
                }
            })
            .build(),
    )?;
    app.global_shortcut().register(alt_espace)?;
    Ok(())
}

/// L'icône dans la zone de notification, près de l'horloge.
///
/// Sur Windows, une application qu'on ferme doit pouvoir continuer à vivre là :
/// c'est ce que les gens attendent, et c'est ce qui rend Alt+Espace instantané
/// — Nexus est déjà démarré, il ne fait que se montrer.
fn brancher_icone(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let ouvrir = MenuItem::with_id(app, "ouvrir", "Ouvrir Nexus", true, Some("Alt+Espace"))?;
    let palette = MenuItem::with_id(app, "palette", "Demander quelque chose…", true, None::<&str>)?;
    let loupe = MenuItem::with_id(app, "loupe", "Lire une zone de l'écran", true, None::<&str>)?;
    let concentration =
        MenuItem::with_id(app, "concentration", "Mode concentration", true, None::<&str>)?;
    let sep = PredefinedMenuItem::separator(app)?;
    let quitter = MenuItem::with_id(app, "quitter", "Quitter Nexus", true, None::<&str>)?;
    let menu = Menu::with_items(
        app,
        &[&ouvrir, &palette, &loupe, &concentration, &sep, &quitter],
    )?;

    TrayIconBuilder::with_id("nexus")
        .icon(app.default_window_icon().cloned().ok_or("icône manquante")?)
        .tooltip("Nexus — Alt+Espace pour demander quelque chose")
        .menu(&menu)
        // Sans ceci, un clic gauche ouvre le menu au lieu d'ouvrir Nexus, et
        // l'on croit que l'icône est cassée.
        .show_menu_on_left_click(false)
        .on_menu_event(|app, evenement| match evenement.id().as_ref() {
            "ouvrir" => montrer(app),
            "palette" => montrer_et_demander(app),
            "loupe" => {
                montrer(app);
                let _ = app.emit("nexus://loupe", ());
            }
            "concentration" => {
                montrer(app);
                let _ = app.emit("nexus://concentration", ());
            }
            "quitter" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|icone, evenement| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = evenement
            {
                montrer(icone.app_handle());
            }
        })
        .build(app)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn lancer() {
    let arguments: Vec<String> = std::env::args().collect();
    let au_demarrage = argument_utile(&arguments);
    // « --discret » : lancé par Windows au démarrage de la session. Nexus
    // s'installe dans la zone de notification sans ouvrir de fenêtre — se
    // réveiller devant une fenêtre qu'on n'a pas demandée est insupportable.
    let discret = arguments.iter().any(|a| a == "--discret");

    let mut constructeur = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init());

    #[cfg(desktop)]
    {
        // UNE SEULE COPIE DE NEXUS À LA FOIS. Sans ça, un clic droit dans
        // l'Explorateur lance une deuxième application : deux icônes, deux
        // fenêtres, et le raccourci global qui ne marche plus dans l'une des
        // deux. Le second lancement passe donc son message au premier.
        constructeur = constructeur.plugin(tauri_plugin_single_instance::init(
            |app, argv, _dossier| {
                if let Some((sorte, valeur)) = argument_utile(&argv) {
                    let _ = app.emit("nexus://argument", (sorte, valeur));
                }
                montrer(app);
            },
        ));
    }

    constructeur
        .invoke_handler(tauri::generate_handler![
            // ── les fichiers
            fichiers::chercher_fichiers,
            fichiers::chercher_dans_contenu,
            fichiers::montrer_fichier,
            fichiers::ouvrir_fichier,
            // ── les applications et les fenêtres
            apps::lister_applications,
            apps::ouvrir_application,
            apps::lister_fenetres,
            apps::activer_fenetre,
            apps::fermer_application,
            // ── les automatisations
            scripts::creer_script,
            scripts::lister_scripts,
            scripts::lancer_script,
            scripts::supprimer_script,
            scripts::montrer_scripts,
            // ── la machine
            systeme::etat_machine,
            systeme::changer_fond_ecran,
            systeme::lire_presse_papiers,
            systeme::ecrire_presse_papiers,
            systeme::installer_logiciel,
            // ── l'écran
            ecran::capturer_ecran,
            ecran::taille_ecran,
            // ── Windows lui-même
            integration::regler_demarrage,
            integration::regler_protocole,
            integration::regler_menu_contextuel,
            integration::etat_integrations,
            integration::tout_brancher,
            integration::tout_debrancher,
            // ── la concentration
            concentration::demarrer_concentration,
            concentration::arreter_concentration,
            concentration::etat_concentration,
            concentration::distractions_ouvertes,
            // ── le pont avec l'interface
            fenetre_cacher,
            fenetre_quitter,
            argument_de_lancement,
        ])
        .setup(move |app| {
            let poignee = app.handle().clone();
            brancher_icone(&poignee)?;

            #[cfg(desktop)]
            if let Err(e) = brancher_raccourci(&poignee) {
                // Un raccourci déjà pris par un autre logiciel ne doit PAS
                // empêcher Nexus de démarrer. On le dit à l'interface, qui
                // proposera d'en choisir un autre.
                let _ = poignee.emit("nexus://raccourci-refuse", e.to_string());
            }

            if let Some((sorte, valeur)) = au_demarrage.clone() {
                *ARGUMENT.lock().unwrap() = Some((sorte, valeur));
            }
            if discret {
                if let Some(f) = poignee.get_webview_window("main") {
                    let _ = f.hide();
                }
            }
            Ok(())
        })
        .on_window_event(|fenetre, evenement| {
            // FERMER N'EST PAS QUITTER. La croix range Nexus dans la zone de
            // notification ; c'est « Quitter » qui l'arrête. Sinon le
            // raccourci global cesse de marcher au premier réflexe de
            // fermeture, et l'on croit que l'application est cassée.
            if let tauri::WindowEvent::CloseRequested { api, .. } = evenement {
                api.prevent_close();
                let _ = fenetre.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("Nexus n'a pas pu démarrer");
}

/// Ce que la ligne de commande a apporté, gardé jusqu'à ce que l'interface
/// vienne le chercher.
static ARGUMENT: std::sync::Mutex<Option<(String, String)>> = std::sync::Mutex::new(None);

#[tauri::command]
fn argument_de_lancement() -> Option<(String, String)> {
    ARGUMENT.lock().ok().and_then(|mut a| a.take())
}

#[tauri::command]
fn fenetre_cacher(app: tauri::AppHandle) {
    cacher(&app);
}

#[tauri::command]
fn fenetre_quitter(app: tauri::AppHandle) {
    app.exit(0);
}

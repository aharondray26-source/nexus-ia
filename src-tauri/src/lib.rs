use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut, ShortcutState};

// Ouvre (ou refocalise) une fenetre dediee chargeant directement le vrai site
// d'une IA. C'est une WebviewWindow native : elle n'est PAS soumise au blocage
// X-Frame-Options qui empeche l'embarquement en iframe. L'utilisateur se
// connecte une fois a son compte gratuit, la session est ensuite memorisee.
#[tauri::command]
async fn open_ai_window(
    app: tauri::AppHandle,
    label: String,
    url: String,
) -> Result<(), String> {
    if let Some(win) = app.get_webview_window(&label) {
        win.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    let parsed = url
        .parse()
        .map_err(|_| format!("URL invalide : {url}"))?;

    WebviewWindowBuilder::new(&app, &label, WebviewUrl::External(parsed))
        .title(&label)
        .inner_size(1100.0, 860.0)
        .build()
        .map_err(|e| e.to_string())?;

    Ok(())
}

// Bascule la visibilite de la fenetre courante (appelee depuis le front quand
// l'app a le focus). Le raccourci SYSTEME global est gere separement plus bas.
#[tauri::command]
fn toggle_window_visibility(window: tauri::WebviewWindow) -> Result<(), String> {
    if window.is_visible().map_err(|e| e.to_string())? {
        window.hide().map_err(|e| e.to_string())?;
    } else {
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Raccourci systeme global Option/Alt + Espace : ramene l'app au premier
    // plan meme lorsqu'elle est en arriere-plan (memoire procedurale, "tic").
    let toggle_shortcut = Shortcut::new(Some(Modifiers::ALT), Code::Space);

    tauri::Builder::default()
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, shortcut, event| {
                    if shortcut == &toggle_shortcut
                        && event.state() == ShortcutState::Pressed
                    {
                        if let Some(win) = app.get_webview_window("main") {
                            let visible = win.is_visible().unwrap_or(false);
                            if visible {
                                let _ = win.hide();
                            } else {
                                let _ = win.show();
                                let _ = win.set_focus();
                            }
                        }
                    }
                })
                .build(),
        )
        .setup(move |app| {
            app.global_shortcut().register(toggle_shortcut)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            open_ai_window,
            toggle_window_visibility
        ])
        .run(tauri::generate_context!())
        .expect("erreur au demarrage de l'application Nexus IA");
}

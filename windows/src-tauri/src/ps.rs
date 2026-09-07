// ============================================================================
//  PARLER À WINDOWS
//
//  Tout ce que Nexus fait de particulier sur Windows passe par ici. Un seul
//  endroit qui lance PowerShell, un seul endroit où l'on gère les erreurs, un
//  seul endroit à relire quand quelque chose se tait.
//
//  POURQUOI POWERSHELL PLUTÔT QUE L'API DE WINDOWS :
//  parce qu'il est déjà là, sur chaque Windows, sans rien installer ; parce
//  que son code se relit à voix haute ; et parce qu'une bibliothèque en moins,
//  c'est une version qui ne peut pas casser dans six mois.
//
//  TROIS RÈGLES, ET ELLES VIENNENT D'ERREURS DÉJÀ PAYÉES AILLEURS :
//
//  1. On ne colle JAMAIS ce que l'utilisateur a tapé dans un script.
//     Un nom de fichier contenant une apostrophe suffirait à changer le sens
//     de la commande. Les valeurs passent par des variables d'environnement,
//     que PowerShell lit sans les interpréter.
//  2. Aucune fenêtre noire ne doit clignoter à l'écran. Sur Windows, lancer un
//     processus ouvre une console par défaut : c'est laid, et ça donne
//     l'impression que quelque chose ne va pas.
//  3. Une erreur remonte TELLE QUELLE. « Ça n'a pas marché » ne sert à
//     personne ; ce que Windows a répondu, si.
// ============================================================================

use std::collections::HashMap;
use std::process::Command;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

/// Lancer sans ouvrir de console. C'est le drapeau CREATE_NO_WINDOW de Windows.
#[cfg(windows)]
const SANS_FENETRE: u32 = 0x0800_0000;

/// Le résultat d'un appel à Windows : ce qui est sorti, et si ça s'est bien
/// passé. On garde les deux — un script peut réussir en se plaignant.
pub struct Reponse {
    pub ok: bool,
    pub sortie: String,
    pub erreur: String,
}

impl Reponse {
    /// Le texte utile, ou la raison. Jamais un vide silencieux.
    pub fn texte(self) -> Result<String, String> {
        if self.ok {
            Ok(self.sortie)
        } else if !self.erreur.is_empty() {
            Err(self.erreur)
        } else if !self.sortie.is_empty() {
            Err(self.sortie)
        } else {
            Err("Windows n'a rien répondu.".into())
        }
    }
}

/// Lance un bout de PowerShell. `valeurs` devient des variables
/// d'environnement, que le script lit avec `$env:NOM` — c'est ce qui permet de
/// passer un chemin, un nom de fichier ou une phrase SANS jamais les coller
/// dans le code.
pub fn powershell(script: &str, valeurs: &[(&str, &str)]) -> Reponse {
    if !cfg!(windows) {
        return Reponse {
            ok: false,
            sortie: String::new(),
            erreur: "Cette fonction n'existe que sur Windows.".into(),
        };
    }

    let mut env: HashMap<String, String> = HashMap::new();
    for (cle, valeur) in valeurs {
        env.insert(format!("NEXUS_{cle}"), (*valeur).to_string());
    }

    let mut commande = Command::new("powershell.exe");
    commande
        .arg("-NoLogo")
        .arg("-NoProfile")             // le profil de l'utilisateur peut tout casser
        .arg("-NonInteractive")        // jamais de question posée dans le vide
        .arg("-ExecutionPolicy").arg("Bypass")
        .arg("-Command").arg(script);
    for (cle, valeur) in &env {
        commande.env(cle, valeur);
    }
    #[cfg(windows)]
    commande.creation_flags(SANS_FENETRE);

    match commande.output() {
        Ok(sortie) => Reponse {
            ok: sortie.status.success(),
            sortie: String::from_utf8_lossy(&sortie.stdout).trim().to_string(),
            erreur: String::from_utf8_lossy(&sortie.stderr).trim().to_string(),
        },
        Err(e) => Reponse {
            ok: false,
            sortie: String::new(),
            erreur: format!("PowerShell est introuvable sur cette machine : {e}"),
        },
    }
}

/// Le même, mais qui attend du JSON en retour. La plupart de nos commandes
/// rendent une liste ; on la relit ici plutôt que dans dix endroits.
pub fn powershell_json(script: &str, valeurs: &[(&str, &str)]) -> Result<serde_json::Value, String> {
    let texte = powershell(script, valeurs).texte()?;
    if texte.is_empty() {
        return Ok(serde_json::json!([]));
    }
    serde_json::from_str(&texte).map_err(|e| {
        format!("Windows a répondu quelque chose d'illisible ({e}). Réponse brute : {}",
                texte.chars().take(300).collect::<String>())
    })
}

/// Un préambule commun : sortie en UTF-8, sinon les accents reviennent en
/// charabia — « contrôle » devient « contrÃ´le », et l'on cherche le bug
/// pendant une heure dans la mauvaise partie du code.
pub const UTF8: &str = "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; \
                        $ErrorActionPreference = 'Stop'; ";

// Windows ouvre une console noire derrière chaque programme, sauf si on lui
// dit que c'est une application à fenêtre. Sans cette ligne, Nexus démarre
// avec un rectangle noir à côté — et l'on croit à un virus.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    nexus_lib::lancer()
}

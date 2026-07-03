// Empeche l'ouverture d'une console supplementaire sous Windows en release.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    nexus_ia_lib::run()
}

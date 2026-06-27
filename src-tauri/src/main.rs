// Previene ventana de consola en Windows en release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    pos472_desktop_lib::run();
}

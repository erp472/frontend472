use mac_address::get_mac_address;

/// Retorna la MAC del primer adaptador de red no-loopback.
/// Se expone al frontend via invoke('get_mac_address').
#[tauri::command]
fn get_mac() -> Result<String, String> {
    match get_mac_address() {
        Ok(Some(ma)) => Ok(ma.to_string()),
        Ok(None)     => Err("No se encontró adaptador de red".into()),
        Err(e)       => Err(e.to_string()),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_mac])
        .run(tauri::generate_context!())
        .expect("error al ejecutar la aplicación");
}

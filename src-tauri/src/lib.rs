pub mod commands;

use commands::config_writer::{list_config_backups, mutate_claude_desktop_config, rollback_config_backup};
use commands::detector::scan_system;
use commands::launcher::launch_scoped_terminal;
use commands::litellm::{check_litellm_health, fetch_litellm_models};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            check_litellm_health,
            fetch_litellm_models,
            scan_system,
            mutate_claude_desktop_config,
            list_config_backups,
            rollback_config_backup,
            launch_scoped_terminal,
        ])
        .run(tauri::generate_context!())
        .expect("error while running litebridge desktop application");
}

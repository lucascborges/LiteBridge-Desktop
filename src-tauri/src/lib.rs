pub mod commands;

use commands::config_writer::{list_config_backups, mutate_claude_desktop_config, rollback_config_backup};
use commands::detector::scan_system;
use commands::launcher::{kill_tracked_process, launch_scoped_terminal, list_tracked_processes};
use commands::litellm::{check_litellm_health, fetch_litellm_models, probe_model_latency};
use commands::settings::{load_app_settings, save_app_settings};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            check_litellm_health,
            fetch_litellm_models,
            probe_model_latency,
            scan_system,
            mutate_claude_desktop_config,
            list_config_backups,
            rollback_config_backup,
            launch_scoped_terminal,
            list_tracked_processes,
            kill_tracked_process,
            load_app_settings,
            save_app_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running litebridge desktop application");
}

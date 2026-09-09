use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ModelRoleMappingSettings {
    pub opus: String,
    pub sonnet: String,
    pub haiku: String,
    pub fallback_enabled: bool,
}

impl Default for ModelRoleMappingSettings {
    fn default() -> Self {
        Self {
            opus: "bedrock/anthropic.claude-3-opus-20240229-v1:0".to_string(),
            sonnet: "gemini-2.5-flash-thinking".to_string(),
            haiku: "claude-3-5-haiku-20241022".to_string(),
            fallback_enabled: true,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ContextPolicySettings {
    pub max_context_tokens: u32,
    pub compact_threshold_percent: u32,
    pub stream_token_limit: u32,
}

impl Default for ContextPolicySettings {
    fn default() -> Self {
        Self {
            max_context_tokens: 200_000,
            compact_threshold_percent: 90,
            stream_token_limit: 8192,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppSettings {
    pub gateway_url: String,
    pub api_key: String,
    pub model_mapping: ModelRoleMappingSettings,
    pub context_policy: ContextPolicySettings,
    pub selected_emulator: String,
    pub custom_aliases: std::collections::HashMap<String, String>,
    pub updated_at: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            gateway_url: "http://localhost:4000".to_string(),
            api_key: String::new(),
            model_mapping: ModelRoleMappingSettings::default(),
            context_policy: ContextPolicySettings::default(),
            selected_emulator: "Terminal.app (macOS default)".to_string(),
            custom_aliases: std::collections::HashMap::new(),
            updated_at: Utc::now().to_rfc3339(),
        }
    }
}

pub fn get_settings_file_path() -> PathBuf {
    let config_dir = dirs::config_dir()
        .or_else(dirs::data_dir)
        .unwrap_or_else(|| PathBuf::from("."));
    config_dir.join("LiteBridge").join("settings.json")
}

pub fn load_settings_from_path(path: &Path) -> AppSettings {
    if !path.exists() {
        return AppSettings::default();
    }

    match fs::read_to_string(path) {
        Ok(data) => serde_json::from_str(&data).unwrap_or_default(),
        Err(_) => AppSettings::default(),
    }
}

pub fn save_settings_to_path(settings: &AppSettings, path: &Path) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create config dir: {e}"))?;
    }

    let json = serde_json::to_string_pretty(settings)
        .map_err(|e| format!("Serialization error: {e}"))?;

    let tmp_path = path.with_extension("tmp");
    fs::write(&tmp_path, json).map_err(|e| format!("Failed to write tmp settings: {e}"))?;
    fs::rename(&tmp_path, path).map_err(|e| format!("Failed to persist settings: {e}"))?;

    Ok(())
}

#[tauri::command]
pub async fn load_app_settings() -> Result<AppSettings, String> {
    let path = get_settings_file_path();
    Ok(load_settings_from_path(&path))
}

#[tauri::command]
pub async fn save_app_settings(mut settings: AppSettings) -> Result<AppSettings, String> {
    settings.updated_at = Utc::now().to_rfc3339();
    let path = get_settings_file_path();
    save_settings_to_path(&settings, &path)?;
    Ok(settings)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_settings_save_and_load() {
        let tmp_dir = std::env::temp_dir().join(format!("lb_cfg_test_{}", Utc::now().timestamp_micros()));
        let test_path = tmp_dir.join("settings.json");

        let mut initial = AppSettings::default();
        initial.gateway_url = "http://127.0.0.1:8787".to_string();
        initial.api_key = "sk-test-saved-key".to_string();
        initial.custom_aliases.insert("sonnet-workhorse".to_string(), "gemini-2.5-flash".to_string());

        assert!(save_settings_to_path(&initial, &test_path).is_ok());

        let loaded = load_settings_from_path(&test_path);
        assert_eq!(loaded.gateway_url, "http://127.0.0.1:8787");
        assert_eq!(loaded.api_key, "sk-test-saved-key");
        assert_eq!(loaded.custom_aliases.get("sonnet-workhorse").unwrap(), "gemini-2.5-flash");

        let _ = fs::remove_dir_all(&tmp_dir);
    }
}

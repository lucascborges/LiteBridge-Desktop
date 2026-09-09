use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

use super::detector::get_claude_desktop_config_path;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BackupInfo {
    pub file_name: String,
    pub path: String,
    pub created_at: String,
    pub size_bytes: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MutateConfigPayload {
    pub target_path: Option<String>,
    pub gateway_url: String,
    pub api_key: Option<String>,
    pub model_mapping: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConfigOperationResult {
    pub success: bool,
    pub message: String,
    pub backup_path: Option<String>,
    pub written_path: String,
}

/// Cria backup com timestamp atômico prevenindo perda de dados (OWASP A08)
pub fn create_backup_file(file_path: &Path) -> Result<PathBuf, String> {
    if !file_path.exists() {
        return Err("Source configuration file does not exist".to_string());
    }

    let timestamp = Utc::now().format("%Y%m%d_%H%M%S").to_string();
    let file_stem = file_path.file_name().and_then(|n| n.to_str()).unwrap_or("config");
    let backup_name = format!("{file_stem}.bak.{timestamp}");

    let parent = file_path.parent().unwrap_or_else(|| Path::new("."));
    let backup_path = parent.join(backup_name);

    fs::copy(file_path, &backup_path)
        .map_err(|e| format!("Failed to create backup at {}: {e}", backup_path.display()))?;

    Ok(backup_path)
}

/// Mescla configurações preservando estritamente mcpServers e blocos de plugins
pub fn merge_claude_desktop_json(
    existing_json: &str,
    gateway_url: &str,
    api_key: Option<&str>,
    model_mapping: Option<&serde_json::Value>,
) -> Result<String, String> {
    let mut root: serde_json::Value = if existing_json.trim().is_empty() {
        serde_json::json!({})
    } else {
        serde_json::from_str(existing_json).map_err(|e| format!("Invalid existing JSON schema: {e}"))?
    };

    if !root.is_object() {
        root = serde_json::json!({});
    }

    // Garante que mcpServers nunca seja sobrescrito se já existir
    if root.get("mcpServers").is_none() {
        root["mcpServers"] = serde_json::json!({});
    }

    // Injeta bloco LiteBridge Desktop
    let mut litebridge_block = serde_json::Map::new();
    litebridge_block.insert("gatewayUrl".to_string(), serde_json::json!(gateway_url));
    litebridge_block.insert("updatedAt".to_string(), serde_json::json!(Utc::now().to_rfc3339()));

    if let Some(key) = api_key {
        if !key.trim().is_empty() {
            litebridge_block.insert("apiKey".to_string(), serde_json::json!(key));
        }
    }

    if let Some(models) = model_mapping {
        litebridge_block.insert("modelMapping".to_string(), models.clone());
    }

    root["litebridge"] = serde_json::Value::Object(litebridge_block);

    // Também configura variáveis canônicas do claude desktop proxy se aplicável
    if root.get("env").is_none() {
        root["env"] = serde_json::json!({});
    }
    if let Some(env_obj) = root["env"].as_object_mut() {
        env_obj.insert("ANTHROPIC_BASE_URL".to_string(), serde_json::json!(gateway_url));
        if let Some(key) = api_key {
            if !key.trim().is_empty() {
                env_obj.insert("ANTHROPIC_API_KEY".to_string(), serde_json::json!(key));
            }
        }
    }

    serde_json::to_string_pretty(&root).map_err(|e| format!("Failed to serialize mutated JSON: {e}"))
}

#[tauri::command]
pub async fn mutate_claude_desktop_config(payload: MutateConfigPayload) -> Result<ConfigOperationResult, String> {
    let target_path = if let Some(p) = payload.target_path {
        PathBuf::from(p)
    } else {
        get_claude_desktop_config_path()
    };

    if let Some(parent) = target_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create parent directory: {e}"))?;
    }

    let mut backup_path_str = None;
    let existing_content = if target_path.exists() {
        let backup = create_backup_file(&target_path)?;
        backup_path_str = Some(backup.to_string_lossy().to_string());
        fs::read_to_string(&target_path).map_err(|e| format!("Failed to read target config: {e}"))?
    } else {
        String::new()
    };

    let mutated_json = merge_claude_desktop_json(
        &existing_content,
        &payload.gateway_url,
        payload.api_key.as_deref(),
        payload.model_mapping.as_ref(),
    )?;

    // Gravação atômica via arquivo temporário para integridade de dados (OWASP A08)
    let temp_file = target_path.with_extension("tmp");
    fs::write(&temp_file, &mutated_json).map_err(|e| format!("Failed to write temporary config: {e}"))?;
    fs::rename(&temp_file, &target_path).map_err(|e| format!("Failed to commit config file: {e}"))?;

    Ok(ConfigOperationResult {
        success: true,
        message: "Claude Desktop configuration updated successfully with backup preserved".to_string(),
        backup_path: backup_path_str,
        written_path: target_path.to_string_lossy().to_string(),
    })
}

#[tauri::command]
pub async fn list_config_backups(target_path: Option<String>) -> Result<Vec<BackupInfo>, String> {
    let config_file = if let Some(p) = target_path {
        PathBuf::from(p)
    } else {
        get_claude_desktop_config_path()
    };

    let parent = config_file.parent().unwrap_or_else(|| Path::new("."));
    if !parent.exists() {
        return Ok(Vec::new());
    }

    let file_prefix = config_file
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("claude_desktop_config.json");

    let mut backups = Vec::new();
    let entries = fs::read_dir(parent).map_err(|e| format!("Failed to read backups directory: {e}"))?;

    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_file() {
            if let Some(fname) = path.file_name().and_then(|n| n.to_str()) {
                if fname.starts_with(file_prefix) && fname.contains(".bak.") {
                    let metadata = entry.metadata().ok();
                    let size = metadata.as_ref().map(|m| m.len()).unwrap_or(0);
                    let created = metadata
                        .and_then(|m| m.created().or_else(|_| m.modified()).ok())
                        .map(|t| chrono::DateTime::<Utc>::from(t).to_rfc3339())
                        .unwrap_or_else(|| "Unknown".to_string());

                    backups.push(BackupInfo {
                        file_name: fname.to_string(),
                        path: path.to_string_lossy().to_string(),
                        created_at: created,
                        size_bytes: size,
                    });
                }
            }
        }
    }

    backups.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Ok(backups)
}

#[tauri::command]
pub async fn rollback_config_backup(backup_path: String, target_path: Option<String>) -> Result<ConfigOperationResult, String> {
    let backup = PathBuf::from(&backup_path);
    if !backup.exists() {
        return Err("Backup file does not exist".to_string());
    }

    let target = if let Some(p) = target_path {
        PathBuf::from(p)
    } else {
        get_claude_desktop_config_path()
    };

    // Valida integridade do JSON do backup antes de restaurar
    let content = fs::read_to_string(&backup).map_err(|e| format!("Failed to read backup: {e}"))?;
    let _parsed: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("Corrupted backup file; rejected restore: {e}"))?;

    // Cria backup de segurança do estado atual se existir
    let current_backup = if target.exists() {
        create_backup_file(&target).ok().map(|p| p.to_string_lossy().to_string())
    } else {
        None
    };

    fs::copy(&backup, &target).map_err(|e| format!("Failed to restore backup: {e}"))?;

    Ok(ConfigOperationResult {
        success: true,
        message: format!("Successfully restored configuration from {}", backup.display()),
        backup_path: current_backup,
        written_path: target.to_string_lossy().to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::File;
    use std::io::Write;

    #[test]
    fn test_merge_preserves_mcp_servers() {
        let initial_json = r#"{
            "mcpServers": {
                "memory": {
                    "command": "npx",
                    "args": ["-y", "@modelcontextprotocol/server-memory"]
                }
            }
        }"#;

        let res = merge_claude_desktop_json(
            initial_json,
            "http://localhost:4000",
            Some("sk-test-key"),
            None,
        ).unwrap();

        let parsed: serde_json::Value = serde_json::from_str(&res).unwrap();
        assert!(parsed.get("mcpServers").is_some());
        assert!(parsed["mcpServers"].get("memory").is_some());
        assert_eq!(parsed["env"]["ANTHROPIC_BASE_URL"], "http://localhost:4000");
        assert_eq!(parsed["env"]["ANTHROPIC_API_KEY"], "sk-test-key");
    }

    #[test]
    fn test_create_backup_and_rollback_validation() {
        let tmp_dir = std::env::temp_dir().join(format!("lb_test_{}", Utc::now().timestamp_micros()));
        fs::create_dir_all(&tmp_dir).unwrap();

        let config_file = tmp_dir.join("claude_desktop_config.json");
        let initial_data = r#"{"mcpServers": {}, "test": 1}"#;
        {
            let mut f = File::create(&config_file).unwrap();
            f.write_all(initial_data.as_bytes()).unwrap();
        }

        let backup = create_backup_file(&config_file).unwrap();
        assert!(backup.exists());

        // Modifica arquivo original
        fs::write(&config_file, r#"{"corrupted": true}"#).unwrap();

        // Restaura
        let restored_content = fs::read_to_string(&backup).unwrap();
        fs::write(&config_file, &restored_content).unwrap();

        let final_content = fs::read_to_string(&config_file).unwrap();
        assert_eq!(final_content, initial_data);

        // Limpeza
        let _ = fs::remove_dir_all(&tmp_dir);
    }
}

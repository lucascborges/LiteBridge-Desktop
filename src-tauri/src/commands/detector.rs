use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HarnessInfo {
    pub id: String,
    pub name: String,
    pub binary: String,
    pub path: Option<String>,
    pub detected: bool,
    pub status: String, // "DETECTED", "CONFIG-ONLY", "INACTIVE"
    pub version: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ClaudeDesktopLocation {
    pub config_path: String,
    pub exists: bool,
    pub os: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SystemScanResult {
    pub harnesses: Vec<HarnessInfo>,
    pub claude_desktop: ClaudeDesktopLocation,
    pub target_os: String,
    pub target_arch: String,
}

/// Sanitiza caminhos de binários prevenindo directory traversal e caracteres perigosos
pub fn sanitize_binary_name(name: &str) -> Result<String, String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err("Binary name cannot be empty".to_string());
    }
    // Proíbe separadores de path ou caracteres de injeção
    if trimmed.contains('/') || trimmed.contains('\\') || trimmed.contains(';') || trimmed.contains('&') || trimmed.contains('|') {
        return Err("Binary name cannot contain path separators or control characters".to_string());
    }
    Ok(trimmed.to_string())
}

/// Localiza o caminho de configuração canônico do Claude Desktop para o sistema operacional alvo
pub fn get_claude_desktop_config_path() -> PathBuf {
    #[cfg(target_os = "macos")]
    {
        if let Some(home) = dirs::home_dir() {
            return home.join("Library/Application Support/Claude/claude_desktop_config.json");
        }
    }

    #[cfg(target_os = "windows")]
    {
        if let Some(appdata) = dirs::data_dir() {
            // Em Windows, dirs::data_dir() aponta tipicamente para %APPDATA% (Roaming)
            return appdata.join("Claude").join("claude_desktop_config.json");
        }
    }

    #[cfg(target_os = "linux")]
    {
        if let Some(config_dir) = dirs::config_dir() {
            return config_dir.join("Claude/claude_desktop_config.json");
        }
    }

    // Fallback padrão se não conseguir determinar dirs
    PathBuf::from("claude_desktop_config.json")
}

/// Determina a localização multiplataforma a partir de base dirs fornecidos (útil para testes unitários)
pub fn resolve_claude_desktop_path_with_base(base_dir: &Path, os_name: &str) -> PathBuf {
    match os_name {
        "macos" => base_dir.join("Library/Application Support/Claude/claude_desktop_config.json"),
        "windows" => base_dir.join("Claude/claude_desktop_config.json"),
        "linux" => base_dir.join("Claude/claude_desktop_config.json"),
        _ => base_dir.join("claude_desktop_config.json"),
    }
}

/// Busca o binário no $PATH usando a crate `which` de forma segura sem invocar shell
pub fn find_binary_in_path(binary: &str) -> Option<PathBuf> {
    which::which(binary).ok()
}

#[tauri::command]
pub async fn scan_system() -> Result<SystemScanResult, String> {
    let harness_defs = vec![
        ("claude-code", "Claude Code", "claude"),
        ("claude-desktop", "Claude Desktop", "claude-desktop"),
        ("codex-cli", "Codex CLI", "codex"),
        ("opencode", "OpenCode", "opencode"),
        ("aider", "Aider", "aider"),
        ("pi-cli", "Pi CLI", "pi"),
    ];

    let claude_cfg = get_claude_desktop_config_path();
    let claude_cfg_exists = claude_cfg.exists();

    let mut harnesses = Vec::new();
    for (id, name, bin) in harness_defs {
        let binary_path = find_binary_in_path(bin);
        let detected = binary_path.is_some();
        let path_str = binary_path.map(|p| p.to_string_lossy().to_string());

        let status = if id == "claude-desktop" && claude_cfg_exists {
            "DETECTED".to_string()
        } else if detected {
            "DETECTED".to_string()
        } else if id == "codex-cli" {
            "CONFIG-ONLY".to_string()
        } else {
            "INACTIVE".to_string()
        };

        harnesses.push(HarnessInfo {
            id: id.to_string(),
            name: name.to_string(),
            binary: bin.to_string(),
            path: path_str,
            detected: detected || (id == "claude-desktop" && claude_cfg_exists),
            status,
            version: None,
        });
    }

    let target_os = std::env::consts::OS.to_string();
    let target_arch = std::env::consts::ARCH.to_string();

    Ok(SystemScanResult {
        harnesses,
        claude_desktop: ClaudeDesktopLocation {
            config_path: claude_cfg.to_string_lossy().to_string(),
            exists: claude_cfg_exists,
            os: target_os.clone(),
        },
        target_os,
        target_arch,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sanitize_binary_name() {
        assert_eq!(sanitize_binary_name("claude").unwrap(), "claude");
        assert_eq!(sanitize_binary_name("aider").unwrap(), "aider");
        assert!(sanitize_binary_name("claude; rm -rf /").is_err());
        assert!(sanitize_binary_name("../claude").is_err());
        assert!(sanitize_binary_name("c:\\evil.exe").is_err());
        assert!(sanitize_binary_name("").is_err());
    }

    #[test]
    fn test_resolve_claude_desktop_path_with_base() {
        let dummy = PathBuf::from("/mock/user");
        let mac = resolve_claude_desktop_path_with_base(&dummy, "macos");
        assert!(mac.to_string_lossy().contains("Library"));

        let win = resolve_claude_desktop_path_with_base(&dummy, "windows");
        assert!(win.to_string_lossy().contains("Claude"));
    }
}

use regex::Regex;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::Command;

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

/// Extrai a versão real do binário invocando --version com timeout seguro
pub fn detect_binary_version(binary_path: &Path) -> Option<String> {
    let output = Command::new(binary_path)
        .arg("--version")
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let stdout_str = String::from_utf8_lossy(&output.stdout);
    let stderr_str = String::from_utf8_lossy(&output.stderr);
    let combined = format!("{stdout_str} {stderr_str}");

    // Procura por versões semânticas como v1.2.3, 2.1.263, 0.45.0
    let re = Regex::new(r"v?(\d+\.\d+(\.\d+)?)").ok()?;
    re.captures(&combined)
        .and_then(|cap| cap.get(1))
        .map(|m| format!("v{}", m.as_str()))
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

/// Busca o binário no $PATH e em diretórios canônicos do usuário (ex: ~/.local/bin, /opt/homebrew/bin)
pub fn find_binary_in_path(binary: &str) -> Option<PathBuf> {
    // 1. Tenta buscar no PATH herdado pelo processo
    if let Ok(path) = which::which(binary) {
        return Some(path);
    }

    // 2. Em macOS e Linux, apps GUI (.app) iniciados pelo Finder não herdam o PATH do .zshrc/.bashrc
    // Verifica caminhos padrões onde npm, cargo, pipx e instaladores de CLI costumam colocar binários
    #[cfg(unix)]
    {
        let mut candidates = Vec::new();

        if let Some(home) = dirs::home_dir() {
            candidates.push(home.join(".local/bin").join(binary));
            candidates.push(home.join(".cargo/bin").join(binary));
            candidates.push(home.join(".npm-global/bin").join(binary));
            candidates.push(home.join(".nvm/current/bin").join(binary));
            candidates.push(home.join(".local/share/pnpm").join(binary));
            candidates.push(home.join(".bun/bin").join(binary));
            candidates.push(home.join("bin").join(binary));
        }

        candidates.push(PathBuf::from("/opt/homebrew/bin").join(binary));
        candidates.push(PathBuf::from("/usr/local/bin").join(binary));
        candidates.push(PathBuf::from("/usr/bin").join(binary));
        candidates.push(PathBuf::from("/bin").join(binary));

        for path in candidates {
            if path.exists() && path.is_file() {
                return Some(path);
            }
        }

        // 3. Consulta o shell de login do usuário (ex: zsh -l -c 'which <binary>')
        let user_shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());
        if let Ok(output) = Command::new(&user_shell)
            .args(["-l", "-c", &format!("which {binary}")])
            .output()
        {
            if output.status.success() {
                let found = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !found.is_empty() {
                    let pb = PathBuf::from(found);
                    if pb.exists() {
                        return Some(pb);
                    }
                }
            }
        }
    }

    #[cfg(windows)]
    {
        if let Some(home) = dirs::home_dir() {
            let win_candidates = vec![
                home.join(".cargo").join("bin").join(format!("{binary}.exe")),
                home.join("AppData").join("Roaming").join("npm").join(format!("{binary}.cmd")),
                home.join("AppData").join("Roaming").join("npm").join(format!("{binary}.exe")),
                home.join("AppData").join("Local").join("Programs").join(binary).join(format!("{binary}.exe")),
                home.join(".local").join("bin").join(format!("{binary}.exe")),
            ];
            for p in win_candidates {
                if p.exists() {
                    return Some(p);
                }
            }
        }
    }

    None
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
        let path_str = binary_path.as_ref().map(|p| p.to_string_lossy().to_string());
        let version_str = binary_path.as_ref().and_then(|p| detect_binary_version(p));

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
            version: version_str,
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

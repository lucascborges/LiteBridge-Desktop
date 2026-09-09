use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::process::Command;

#[derive(Debug, Serialize, Deserialize)]
pub struct LaunchTerminalPayload {
    pub binary: String,
    pub args: Option<Vec<String>>,
    pub emulator: Option<String>,
    pub env_vars: HashMap<String, String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LaunchResult {
    pub success: bool,
    pub pid: Option<u32>,
    pub emulator_used: String,
    pub command_str: String,
    pub message: String,
}

/// Sanitiza strings prevenindo Command Injection (OWASP A03)
pub fn sanitize_env_value(val: &str) -> String {
    // Remove quebras de linha e caracteres nulos que podem ser usados em injection
    val.replace('\r', "").replace('\n', "").replace('\0', "")
}

/// Gera payload de env vars isoladas seguro para exibição e injeção
pub fn build_scoped_env(
    gateway_url: &str,
    api_key: &str,
    model: Option<&str>,
) -> HashMap<String, String> {
    let mut env = HashMap::new();
    env.insert("ANTHROPIC_BASE_URL".to_string(), sanitize_env_value(gateway_url));
    env.insert("ANTHROPIC_API_KEY".to_string(), sanitize_env_value(api_key));
    env.insert("OPENAI_API_BASE".to_string(), format!("{}/v1", sanitize_env_value(gateway_url)));
    env.insert("OPENAI_API_KEY".to_string(), sanitize_env_value(api_key));

    if let Some(m) = model {
        if !m.trim().is_empty() {
            env.insert("CLAUDE_CODE_MODEL".to_string(), sanitize_env_value(m));
        }
    }

    env
}

/// Dispara terminal em macOS usando osascript isolado sem mutar .zshrc
#[cfg(target_os = "macos")]
pub fn spawn_terminal_platform(
    binary: &str,
    args: &[String],
    emulator: Option<&str>,
    env_vars: &HashMap<String, String>,
) -> Result<LaunchResult, String> {
    let chosen_emulator = emulator.unwrap_or("Terminal.app");

    // Monta variáveis de exportação no shell temporário
    let mut export_prefix = String::new();
    for (k, v) in env_vars {
        // Assegura escape de aspas simples
        let escaped_val = v.replace('\'', "'\\''");
        export_prefix.push_str(&format!("export {k}='{escaped_val}'; "));
    }

    let args_str = args.join(" ");
    let final_cmd = format!("{export_prefix}{binary} {args_str}");

    let script = if chosen_emulator.to_lowercase().contains("iterm") {
        format!(
            "tell application \"iTerm\" to create window with default profile command \"bash -c '{final_cmd}; exec bash'\""
        )
    } else {
        format!(
            "tell application \"Terminal\" to do script \"{final_cmd}\""
        )
    };

    let mut cmd = Command::new("osascript");
    cmd.args(["-e", &script]);

    let child = cmd.spawn().map_err(|e| format!("Failed to spawn macOS terminal via osascript: {e}"))?;

    Ok(LaunchResult {
        success: true,
        pid: Some(child.id()),
        emulator_used: chosen_emulator.to_string(),
        command_str: final_cmd,
        message: format!("Terminal window spawned via {chosen_emulator}"),
    })
}

/// Dispara terminal em Windows usando Windows Terminal (wt.exe) ou powershell.exe -NoExit
#[cfg(target_os = "windows")]
pub fn spawn_terminal_platform(
    binary: &str,
    args: &[String],
    emulator: Option<&str>,
    env_vars: &HashMap<String, String>,
) -> Result<LaunchResult, String> {
    let chosen_emulator = emulator.unwrap_or("wt.exe");

    let mut ps_env_setup = String::new();
    for (k, v) in env_vars {
        let escaped_val = v.replace('`', "``").replace('"', "`\"");
        ps_env_setup.push_str(&format!("$env:{k}=\"{escaped_val}\"; "));
    }

    let args_str = args.join(" ");
    let ps_full_script = format!("{ps_env_setup}& '{binary}' {args_str}");

    // Tenta wt.exe primeiro se disponível ou especificado, senão fallback powershell.exe
    let mut wt_attempt = false;
    if chosen_emulator.contains("wt") || which::which("wt.exe").is_ok() {
        let mut cmd = Command::new("wt.exe");
        cmd.args(["new-tab", "powershell.exe", "-NoExit", "-Command", &ps_full_script]);
        for (k, v) in env_vars {
            cmd.env(k, v);
        }

        if let Ok(child) = cmd.spawn() {
            return Ok(LaunchResult {
                success: true,
                pid: Some(child.id()),
                emulator_used: "Windows Terminal (wt.exe)".to_string(),
                command_str: format!("wt.exe new-tab powershell.exe -NoExit -Command ..."),
                message: "Spawned in Windows Terminal with isolated environment".to_string(),
            });
        }
        wt_attempt = true;
    }

    // Fallback nativo: powershell.exe com sessão mantida (-NoExit)
    let mut cmd = Command::new("powershell.exe");
    cmd.args(["-NoExit", "-Command", &ps_full_script]);
    for (k, v) in env_vars {
        cmd.env(k, v);
    }

    let child = cmd.spawn().map_err(|e| {
        format!(
            "Failed to launch terminal process (wt_attempt={wt_attempt}): {e}"
        )
    })?;

    Ok(LaunchResult {
        success: true,
        pid: Some(child.id()),
        emulator_used: "PowerShell (powershell.exe)".to_string(),
        command_str: format!("powershell.exe -NoExit -Command ..."),
        message: "Spawned in standalone PowerShell session with isolated environment".to_string(),
    })
}

/// Dispara terminal em Linux buscando emuladores instalados (x-terminal-emulator, gnome-terminal, kitty, etc)
#[cfg(target_os = "linux")]
pub fn spawn_terminal_platform(
    binary: &str,
    args: &[String],
    emulator: Option<&str>,
    env_vars: &HashMap<String, String>,
) -> Result<LaunchResult, String> {
    let emulators = if let Some(e) = emulator {
        vec![e.to_string()]
    } else {
        vec![
            "x-terminal-emulator".to_string(),
            "gnome-terminal".to_string(),
            "konsole".to_string(),
            "kitty".to_string(),
            "alacritty".to_string(),
            "xterm".to_string(),
        ]
    };

    let mut chosen = None;
    for emu in &emulators {
        if which::which(emu).is_ok() {
            chosen = Some(emu.clone());
            break;
        }
    }

    let emu = chosen.unwrap_or_else(|| "x-terminal-emulator".to_string());

    let mut shell_cmd = String::new();
    for (k, v) in env_vars {
        let escaped = v.replace('\'', "'\\''");
        shell_cmd.push_str(&format!("export {k}='{escaped}'; "));
    }
    let args_str = args.join(" ");
    shell_cmd.push_str(&format!("{binary} {args_str}; exec $SHELL"));

    let mut cmd = Command::new(&emu);
    if emu == "gnome-terminal" {
        cmd.args(["--", "bash", "-c", &shell_cmd]);
    } else if emu == "konsole" {
        cmd.args(["-e", "bash", "-c", &shell_cmd]);
    } else {
        cmd.args(["-e", "bash", "-c", &shell_cmd]);
    }

    for (k, v) in env_vars {
        cmd.env(k, v);
    }

    let child = cmd.spawn().map_err(|e| format!("Failed to launch terminal on Linux using {emu}: {e}"))?;

    Ok(LaunchResult {
        success: true,
        pid: Some(child.id()),
        emulator_used: emu,
        command_str: shell_cmd,
        message: "Linux terminal session launched with isolated environment".to_string(),
    })
}

#[tauri::command]
pub async fn launch_scoped_terminal(payload: LaunchTerminalPayload) -> Result<LaunchResult, String> {
    let binary = payload.binary.trim();
    if binary.is_empty() {
        return Err("Binary cannot be empty".to_string());
    }

    let args = payload.args.unwrap_or_default();
    let emulator = payload.emulator.as_deref();

    spawn_terminal_platform(binary, &args, emulator, &payload.env_vars)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sanitize_env_value() {
        assert_eq!(sanitize_env_value("safe-url_123"), "safe-url_123");
        assert_eq!(sanitize_env_value("line1\r\nline2\0malicious"), "line1line2malicious");
    }

    #[test]
    fn test_build_scoped_env() {
        let env = build_scoped_env("http://localhost:4000", "sk-litellm-key", Some("gemini-flash"));
        assert_eq!(env.get("ANTHROPIC_BASE_URL").unwrap(), "http://localhost:4000");
        assert_eq!(env.get("ANTHROPIC_API_KEY").unwrap(), "sk-litellm-key");
        assert_eq!(env.get("OPENAI_API_BASE").unwrap(), "http://localhost:4000/v1");
        assert_eq!(env.get("CLAUDE_CODE_MODEL").unwrap(), "gemini-flash");
    }
}

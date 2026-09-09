use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::process::Command;
use std::sync::Mutex;
use std::time::Instant;
use sysinfo::{Pid, ProcessRefreshKind, RefreshKind, System};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProcessMeta {
    pub pid: u32,
    pub binary: String,
    pub started_at_epoch: u64,
    pub emulator: String,
    pub command_str: String,
    pub active: bool,
    pub memory_rss_bytes: u64,
    pub cpu_usage_pct: f32,
    pub uptime_secs: u64,
}

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

// Registro em memória thread-safe para processos disparados pelo LiteBridge
static PROCESS_REGISTRY: Lazy<Mutex<HashMap<u32, (ProcessMeta, Instant)>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

/// Sanitiza strings prevenindo Command Injection (OWASP A03)
pub fn sanitize_env_value(val: &str) -> String {
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

    let mut export_prefix = String::new();
    for (k, v) in env_vars {
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
                command_str: "wt.exe new-tab powershell.exe -NoExit -Command ...".to_string(),
                message: "Spawned in Windows Terminal with isolated environment".to_string(),
            });
        }
        wt_attempt = true;
    }

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
        command_str: "powershell.exe -NoExit -Command ...".to_string(),
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

    let res = spawn_terminal_platform(binary, &args, emulator, &payload.env_vars)?;

    if let Some(pid) = res.pid {
        let meta = ProcessMeta {
            pid,
            binary: binary.to_string(),
            started_at_epoch: chrono::Utc::now().timestamp() as u64,
            emulator: res.emulator_used.clone(),
            command_str: res.command_str.clone(),
            active: true,
            memory_rss_bytes: 0,
            cpu_usage_pct: 0.0,
            uptime_secs: 0,
        };

        if let Ok(mut registry) = PROCESS_REGISTRY.lock() {
            registry.insert(pid, (meta, Instant::now()));
        }
    }

    Ok(res)
}

#[tauri::command]
pub async fn list_tracked_processes() -> Result<Vec<ProcessMeta>, String> {
    let mut s = System::new_with_specifics(
        RefreshKind::new().with_processes(ProcessRefreshKind::new().with_memory().with_cpu()),
    );
    s.refresh_processes();

    let mut result = Vec::new();

    if let Ok(mut registry) = PROCESS_REGISTRY.lock() {
        for (pid, (meta, instant)) in registry.iter_mut() {
            let sys_pid = Pid::from(*pid as usize);
            if let Some(process) = s.process(sys_pid) {
                meta.active = true;
                meta.memory_rss_bytes = process.memory();
                meta.cpu_usage_pct = process.cpu_usage();
                meta.uptime_secs = instant.elapsed().as_secs();
            } else {
                meta.active = false;
                meta.uptime_secs = instant.elapsed().as_secs();
            }
            result.push(meta.clone());
        }
    }

    result.sort_by(|a, b| b.started_at_epoch.cmp(&a.started_at_epoch));
    Ok(result)
}

#[tauri::command]
pub async fn kill_tracked_process(pid: u32) -> Result<bool, String> {
    let s = System::new_with_specifics(
        RefreshKind::new().with_processes(ProcessRefreshKind::new()),
    );
    let sys_pid = Pid::from(pid as usize);

    let killed = if let Some(process) = s.process(sys_pid) {
        process.kill()
    } else {
        false
    };

    if let Ok(mut registry) = PROCESS_REGISTRY.lock() {
        if let Some((meta, _)) = registry.get_mut(&pid) {
            meta.active = false;
        }
    }

    Ok(killed)
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

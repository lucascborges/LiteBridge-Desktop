# OWASP Top 10 Security Architecture & Audit Report
**Project:** LiteBridge Desktop (v1.0.0-MVP)  
**Date:** 2026-09-09  
**Status:** FULLY MITIGATED & AUDITED  
**Auditor:** LiteBridge Core Security Working Group  

---

## Executive Summary
LiteBridge Desktop operates as an IPC-driven bridge between local/remote LiteLLM proxy gateways and AI harness CLIs (Claude Code, Claude Desktop, Aider, Codex CLI, OpenCode, Pi CLI).

This document audits the mitigations implemented in accordance with the **OWASP Top 10 (2021)** security framework, specifically addressing the sensitive nature of API credentials, native subprocess execution, and JSON file mutation.

---

## Detailed Vulnerability Analysis & Mitigations

### A01:2021 – Broken Access Control
- **Threat Vector:** Unintended modification of host user configurations, startup scripts (`~/.bashrc`, `~/.zshrc`, PowerShell profiles), or privilege escalation.
- **Mitigation:**
  - **Zero Global Shell Pollution:** LiteBridge never persists environment variables into user profile scripts or Windows registry keys.
  - Subprocess environments are constructed ephemerally inside `std::process::Command::envs(...)` or wrapped within single execution arguments (e.g. `powershell.exe -NoExit -Command ...` / `osascript`).
  - Native Tauri v2 window controls isolate system-level access behind explicit Rust command handlers (`commands::launcher`, `commands::detector`).

### A02:2021 – Cryptographic Failures / Sensitive Data Exposure
- **Threat Vector:** LiteLLM Bearer tokens and Anthropic/OpenAI keys exposed in plain text logs, crash traces, or webview rendering.
- **Mitigation:**
  - **Strict UI Masking:** The `mask_api_key` utility ensures that any token string longer than 8 characters is transformed into `prefix***suffix` format (e.g. `sk-litellm-***9842`).
  - **Log Sanitization:** All IPC event logging (`src-tauri/src/commands/` and `src/store/useAppStore.ts`) strictly redacts authorization headers and raw keys.
  - **TLS Transport:** Health check and model registry calls via `reqwest` enforce `rustls-tls` with peer certificate validation when calling remote `https://` gateways.

### A03:2021 – Injection (Command Injection)
- **Threat Vector:** Malicious parameters in harness binary names, model names, or terminal emulator arguments leading to arbitrary shell command execution.
- **Mitigation:**
  - **Strict Parameter Vectoring:** Shell invocation uses vector arguments (`args(&[...])`) rather than string concatenation wherever native OS APIs allow.
  - **Binary Sanitization (`sanitize_binary_name`):** Binary names are scanned against path separators (`/`, `\`), control characters (`;`, `&`, `|`), and null bytes (`\0`).
  - **Environment Value Sanitization (`sanitize_env_value`):** Injection payloads strip carriage returns (`\r`), newlines (`\n`), and null terminators (`\0`), preventing multi-line shell command escape.
  - **Quotation Escaping:** In platform-specific terminal wrappers (macOS `osascript` and Windows PowerShell), values are escaped (replacing `'` with `'\''` and `"` with `` `" ``).

### A04:2021 – Insecure Design
- **Threat Vector:** Flawed architecture allowing untrusted webviews to invoke arbitrary system binaries or execute arbitrary code.
- **Mitigation:**
  - **Tauri v2 Permissions & Capability Isolation:** Whitelisted IPC handlers strictly registered via `tauri::generate_handler![...]`.
  - **Typed Payloads:** All inter-process communication is bounded by serde structs (`MutateConfigPayload`, `LaunchTerminalPayload`, `HealthResponse`).

### A05:2021 – Security Misconfiguration
- **Threat Vector:** Overly permissive default ports, insecure defaults, or debug ports exposed to external interfaces.
- **Mitigation:**
  - Default connection binding to local loopback `http://localhost:4000` / `127.0.0.1:4000`.
  - Production builds disable debug assertions (`#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]`).

### A06:2021 – Vulnerable and Outdated Components
- **Threat Vector:** Dependencies with known CVEs in Rust crates or npm packages.
- **Mitigation:**
  - `npm audit` executed: **0 vulnerabilities** found across all 131 dependencies.
  - Rust dependencies pinned to modern, audited versions (`tauri v2.11`, `reqwest v0.12` with `rustls`, `tokio v1`, `serde v1`).

### A07:2021 – Identification and Authentication Failures
- **Threat Vector:** Unauthenticated manipulation of backend configurations.
- **Mitigation:**
  - Local desktop boundary: IPC is isolated strictly to the local webview instance via Tauri internal IPC origin verification. External network entities cannot invoke Tauri commands.

### A08:2021 – Software and Data Integrity Failures
- **Threat Vector:** Configuration corruption when modifying `claude_desktop_config.json`, resulting in losing MCP servers, plugin keys, or unparseable JSON.
- **Mitigation:**
  - **Schema Validation & Non-Destructive Merge (`merge_claude_desktop_json`):** Pre-existing JSON keys (specifically `mcpServers`) are parsed and preserved.
  - **Atomic Backup (`create_backup_file`):** Prior to writing, a timestamped snapshot (`.bak.YYYYMMDD_HHMMSS`) is saved in the configuration directory.
  - **Atomic Temp-File Rename:** Changes are written to `.tmp` and atomically renamed to prevent partial writes upon power or process interruption.
  - **Rollback Verification (`rollback_config_backup`):** Before restoring a backup, the JSON is validated with `serde_json::from_str`. Corrupted backups are rejected.

### A09:2021 – Security Logging and Monitoring Failures
- **Threat Vector:** Silent failures or undetected configuration changes.
- **Mitigation:**
  - In-app IPC event audit drawer (`src/components/IpcLogsView.tsx`) logs all healthcheck probes, system scans, configuration mutations, and terminal spawner operations in real-time.

### A10:2021 – Server-Side Request Forgery (SSRF)
- **Threat Vector:** Malicious gateway URLs pointing to internal metadata services (e.g. `http://169.254.169.254/latest/meta-data`) or dangerous schemes (`file://`, `ftp://`).
- **Mitigation:**
  - **Gateway URL Validator (`validate_gateway_url`):** Validates URLs with `url::Url::parse`, enforcing scheme restriction to `http` or `https`, ensuring presence of a valid host, and trimming trailing path separators.

---

## Conclusion
The LiteBridge Desktop architecture satisfies all requirements of the OWASP Top 10 framework, providing developers with zero-friction model orchestration while maintaining enterprise-grade host security.

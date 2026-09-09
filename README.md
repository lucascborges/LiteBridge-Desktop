# LiteBridge Desktop 🌉

> **Open-Source Desktop Orchestrator for LiteLLM & Local AI Agent Harnesses**  
> Built with **Tauri v2**, **React 19**, **TypeScript**, **Tailwind CSS**, and **Rust**.

![LiteBridge Desktop Banner](public/icon.png)

---

## Overview

**LiteBridge Desktop** bridges the gap between your local/remote **LiteLLM** proxy gateway and AI developer CLIs (Claude Code, Claude Desktop, Aider, OpenCode, Codex CLI, Pi CLI).

It eliminates the friction of manual configuration:
- **Zero Global Pollution:** Ephemeral sub-process environment injection without touching `~/.bashrc`, `~/.zshrc`, or Windows registry profiles.
- **Model Role Routing Matrix:** Flexibly route Opus (reasoning), Sonnet (coding workhorse), and Haiku (fast indexing) tiers to lower-cost or local models (Gemini Flash, DeepSeek, Bedrock, Ollama).
- **Atomic Config Mutation:** Safely updates `claude_desktop_config.json` while preserving all `mcpServers` configurations, accompanied by instant 1-click snapshot rollbacks.
- **OWASP Top 10 Hardened:** Command injection prevention, API key masking, and JSON schema validation.

---

## Multiplatform Installation

### macOS (Apple Silicon & Intel)
1. Download the latest `.dmg` installer from [Releases](https://github.com/lucascborges/LiteBridge-Desktop/releases).
2. Open the `.dmg` and drag `LiteBridge Desktop` to your `Applications` folder.
3. Open Terminal.app or iTerm2 to grant accessibility permissions if prompted by `osascript`.

### Windows (10/11 x64)
1. Download `LiteBridge-Windows.msi` or `.exe` installer.
2. Ensure Windows Terminal (`wt.exe`) or PowerShell 7+ is installed for optimal terminal spawning.
3. Run the installer and launch LiteBridge from the Start Menu.

### Linux (Ubuntu/Debian, Fedora, Arch)
1. Download `LiteBridge-Linux.AppImage` or `.deb`.
2. For AppImage, grant execution permissions:
   ```bash
   chmod +x LiteBridge-Linux.AppImage
   ./LiteBridge-Linux.AppImage
   ```
3. Required runtime dependencies: `webkit2gtk-4.1`, `libappindicator3`.

---

## LiteLLM Setup Guide

1. Start your local LiteLLM proxy instance:
   ```bash
   pip install 'litellm[proxy]'
   litellm --port 4000 --config config.yaml
   ```
2. Verify that LiteBridge Desktop detects your gateway on `http://localhost:4000`.
3. Select your upstream models in the **Model Role Routing Matrix**.

---

## Development & Testing

### Prerequisites
- **Node.js:** v20+ (`npm install`)
- **Rust:** 1.80+ (`rustup default stable`)

### Running the App Locally
```bash
# Install frontend dependencies
npm install

# Run frontend tests
npm run test

# Run Rust unit tests
cargo test --manifest-path src-tauri/Cargo.toml

# Start the Tauri dev environment
npx tauri dev
```

### Building Release Binaries
```bash
npm run build
npx tauri build
```

---

## Documentation Links
- [PRD (Product Requirements Document)](PRD.md)
- [System Architecture & IPC](docs/ARCHITECTURE.md)
- [OWASP Security Audit](docs/SECURITY_OWASP.md)
- [Contribution Guide](CONTRIBUTING.md)

---

## License
Distributed under the MIT License.

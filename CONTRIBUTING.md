# Contributing to LiteBridge Desktop 🛠️

Thank you for contributing to LiteBridge Desktop! This guide outlines how to extend the application, add new CLI agent harnesses, and adhere to our security practices.

---

## 1. Adding a New CLI Agent Harness

Adding support for a new AI CLI (e.g. `cursor-cli`, `mentat`, `copilot-cli`) involves three simple steps:

### Step 1: Register the Harness in Rust Detector
Open `src-tauri/src/commands/detector.rs` and add your harness definition to `scan_system()`:

```rust
let harness_defs = vec![
    ("claude-code", "Claude Code", "claude"),
    ("my-new-cli", "My New CLI", "mycli"), // <-- Add here
    // ...
];
```

### Step 2: Configure Environment Injection in Launcher
If the CLI uses custom environment variables (e.g. `MYCLI_API_BASE` or `MYCLI_MODEL`), adjust `src-tauri/src/commands/launcher.rs`:

```rust
pub fn build_scoped_env(...) -> HashMap<String, String> {
    // ...
    env.insert("MYCLI_API_BASE".to_string(), gateway_url.to_string());
    env
}
```

### Step 3: Add the Harness to Frontend Store & UI
Open `src/store/useAppStore.ts` and append your harness to the initial `harnesses` list:

```typescript
{
  id: 'my-new-cli',
  name: 'My New CLI',
  binary: 'mycli',
  path: null,
  detected: false,
  status: 'INACTIVE',
}
```

---

## 2. Security Guidelines (OWASP Compliance)

Every contribution must preserve our security posture:
1. **Never Concatenate Commands:** Always use vector arguments (`Command::new(...).args(&[...])`) to avoid Command Injection (OWASP A03).
2. **Never Log Sensitive Keys:** Mask tokens via `mask_api_key` before printing or sending them to debug drawers (OWASP A02).
3. **Atomic File Writes:** When modifying configuration files on disk, always use temporary file generation followed by atomic file renaming and backup generation (OWASP A08).

---

## 3. Pull Request Checklist

Before opening a PR, ensure all checks pass:
```bash
# 1. Rust unit tests
cargo test --manifest-path src-tauri/Cargo.toml

# 2. Frontend unit tests
npm run test

# 3. TypeScript & bundle compilation
npm run build
```

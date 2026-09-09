# Product Requirements Document (PRD): LiteBridge Desktop (v1.0.0-MVP)

**Versao:** 1.0.0-MVP  
**Status:** Aprovado para Implementacao  
**Tech Stack:** Tauri v2, Rust, React 19, TypeScript, Tailwind CSS, Zustand, TanStack Query v5  

---

## 1. Visao Geral do Produto
O **LiteBridge Desktop** e um orquestrador desktop de alta performance e baixa latencia que atua como ponte segura entre o gateway **LiteLLM** (local ou remoto) e harnesses de agentes de IA locais e CLIs (incluindo Claude Code, Claude Desktop, OpenCode, Codex CLI, Aider, Pi CLI).

O software resolve a friccao de configuracao, eliminando a poluicao de variaveis de ambiente globais nos shells dos desenvolvedores, prevenindo conflitos de portas/rotas e permitindo o chaveamento dinamico e flexivel de modelos (ex.: rotear chamadas do Claude Code para modelos Gemini, DeepSeek, Bedrock ou Ollama via LiteLLM) com backup e rollback atomicos de arquivos de configuracao locais.

---

## 2. Personas e Casos de Uso
1. **Engenheiro de IA / Desenvolvedor:**
   - Deseja utilizar o Claude Code ou Claude Desktop apontando para modelos de menor custo ou auto-hospedados (ex: Gemini Flash Thinking, DeepSeek Coder, Ollama) via LiteLLM.
   - Precisa alternar papeis (Opus -> Arquitetura, Sonnet -> Coding Workhorse, Haiku -> Fast Summaries/Scans).
   - Quer lancar sessoes de terminal isoladas sem alterar `.bashrc`, `.zshrc` ou profiles do PowerShell.
2. **Arquiteto de Seguranca:**
   - Exige que credenciais de API (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`) nunca sejam expostas em logs nem gravadas em arquivos publicos desnecessarios.
   - Demanda protecao estrita contra Command Injection em invocacao de processos de terminal.

---

## 3. Requisitos Funcionais

### 3.1. LiteLLM Gateway
- **Endpoint Healthcheck:** `GET /health` no host configurado (padrao: `http://localhost:4000` ou `127.0.0.1:4000`). Retorna status `connected` | `offline` e latencia de ping em milissegundos.
- **Model Registry:** `GET /v1/models` obtem a lista de modelos upstream disponiveis. Suporte a cache inteligente via TanStack Query v5.
- **Gestao Segura de Chave:** Suporte a chave de API opcional (Header `Authorization: Bearer <key>`). Mascara visual estrita na UI (`sk-litellm-***9842`). Proibido logar chaves em texto claro.

### 3.2. System Scanner & Deteccao de Harnesses
- **Scan de Binarios no `$PATH`:**
  - Varre e detecta presenca e caminho absoluto de:
    - `claude` (Claude Code)
    - `opencode` (OpenCode)
    - `codex` (Codex CLI)
    - `aider` (Aider AI Pair)
    - `pi` (Pi CLI)
- **Descoberta do Claude Desktop:**
  - Localizacao automatica do arquivo `claude_desktop_config.json` nos caminhos canonicos:
    - **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
    - **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
    - **Linux:** `~/.config/Claude/claude_desktop_config.json`
  - Leitura segura preservando blocos existentes, especialmente `mcpServers`.

### 3.3. Model Mapping Matrix & Context Policies
- **Mapeamento de Papeis:**
  - `Opus Tier (Architectural Reasoning)`: Seleciona modelo upstream para tarefas analiticas profundas.
  - `Sonnet Tier (Coding Workhorse)`: Seleciona modelo para geracao e edicao de codigo em tempo real.
  - `Haiku Tier (Fast Summaries & Scans)`: Seleciona modelo ultra-rapido para indexacao e cache de arquivos.
- **Fallback Automatico:** Toggle para fallback automatico em erros HTTP 429/500 no cluster do LiteLLM.
- **Politicas de Context Window:**
  - Slider interativo de **Max Context Window Bound** (8k a 1.000k tokens, padrao 200.000).
  - Slider de **Auto-Compact Threshold** (50% a 95%, padrao 90%).
  - Configuracao de **Stream Token Limit** (padrao 8.192 tokens/turn).

### 3.4. Injection Engine A (Claude Desktop Config Mutator)
- **Mutacao Atomica:** Carrega `claude_desktop_config.json`, mescla as chaves necessarias preservando estritamente `mcpServers` e outras chaves customizadas.
- **Backup Automatico:** Antes de qualquer alteracao, cria copia `.bak.<timestamp>` no mesmo diretorio.
- **Rotina de Rollback:** Lista backups existentes e permite restauracao atomica com 1 clique.
- **Validacao de Schema:** Rejeita gravacao se a saida nao for um JSON valido e estruturado.

### 3.5. Injection Engine B (Scoped Native Terminal Spawner)
- **Lancamento Isolado de Processo:**
  - Injeta em tempo de execucao (`std::process::Command`):
    - `ANTHROPIC_BASE_URL`: URL base do LiteLLM (ex: `http://localhost:4000`)
    - `ANTHROPIC_API_KEY`: Chave do LiteLLM (ou virtual team key)
    - `OPENAI_API_BASE`: `http://localhost:4000/v1`
    - `OPENAI_API_KEY`: Chave mapeada
    - `CLAUDE_CODE_MODEL`: Modelo Sonnet/Opus mapeado
  - **Zero Poluicao Global:** Proibido modificar arquivos globais (`~/.bashrc`, `~/.zshrc`, perfis PowerShell ou variaveis de ambiente de usuario/sistema).
- **Suporte Multiplataforma Especifico:**
  - **macOS:** Invocacao de Terminal.app ou iTerm2 via `osascript` com script sanitizado.
  - **Windows:** Invocacao de `wt.exe` (Windows Terminal) ou fallback para `powershell.exe` com argumento `-NoExit` e script block seguro.
  - **Linux:** Deteccao de emulador padrao (`x-terminal-emulator`, `gnome-terminal`, `kitty`, `alacritty` ou `$TERM`).
- **Prevencao de Command Injection (OWASP A03):** Proibido concatenar strings diretamente em shells; uso de argumentos vetoriais estritos (`args(&[...])`) e sanitizacao de URLs e nomes de modelos.

---

## 4. Criterios de Aceitacao (Definition of Done)
1. **Compilacao Rust:** Sem erros ou warnings em `windows`, `darwin` e `linux`.
2. **Seguranca OWASP Top 10:** Documento dedicado `docs/SECURITY_OWASP.md` e mitigacao comprovada de injecao de comandos e vazamento de tokens.
3. **Testes Automatizados:** Testes em Rust para parser, backup, sanitizacao e injecao de env vars; testes em Vitest para componentes e hooks.
4. **CI/CD:** Pipeline de GitHub Actions multiplataforma com matrix para macOS, Windows e Linux.

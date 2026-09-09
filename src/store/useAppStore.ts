import { create } from 'zustand'
import type { HarnessInfo, ModelRoleMapping, ContextPolicy, BackupInfo } from '../types'

interface AppState {
  gatewayUrl: string
  apiKey: string
  maskedKey: string
  setGatewayUrl: (url: string) => void
  setApiKey: (key: string) => void

  selectedHarnessId: string
  setSelectedHarnessId: (id: string) => void

  harnesses: HarnessInfo[]
  setHarnesses: (harnesses: HarnessInfo[]) => void

  claudeDesktopConfigPath: string
  claudeDesktopExists: boolean
  targetOs: string
  targetArch: string
  setSystemScan: (data: {
    harnesses: HarnessInfo[]
    configPath: string
    exists: boolean
    os: string
    arch: string
  }) => void

  models: string[]
  setModels: (models: string[]) => void

  mapping: ModelRoleMapping
  setMappingRole: (role: 'opus' | 'sonnet' | 'haiku', model: string) => void
  setFallbackEnabled: (enabled: boolean) => void

  contextPolicy: ContextPolicy
  setMaxContextTokens: (val: number) => void
  setCompactThreshold: (val: number) => void

  selectedEmulator: string
  setSelectedEmulator: (emu: string) => void

  activePid: number | null
  setActivePid: (pid: number | null) => void

  backups: BackupInfo[]
  setBackups: (backups: BackupInfo[]) => void

  ipcLogs: string[]
  addIpcLog: (log: string) => void
}

export const useAppStore = create<AppState>((set) => ({
  gatewayUrl: 'http://localhost:4000',
  apiKey: 'sk-litellm-virtual-team-key',
  maskedKey: 'sk-l***-key',
  setGatewayUrl: (url) => set({ gatewayUrl: url }),
  setApiKey: (key) => {
    const trimmed = key.trim()
    const masked =
      trimmed.length > 8
        ? `${trimmed.slice(0, 4)}***${trimmed.slice(-4)}`
        : '********'
    set({ apiKey: key, maskedKey: masked })
  },

  selectedHarnessId: 'claude-code',
  setSelectedHarnessId: (id) => set({ selectedHarnessId: id }),

  harnesses: [
    {
      id: 'claude-code',
      name: 'Claude Code',
      binary: 'claude',
      path: '/usr/local/bin/claude',
      detected: true,
      status: 'DETECTED',
      version: 'v2.1.263',
    },
    {
      id: 'claude-desktop',
      name: 'Claude Desktop',
      binary: 'claude-desktop',
      path: null,
      detected: true,
      status: 'DETECTED',
    },
    {
      id: 'codex-cli',
      name: 'Codex CLI',
      binary: 'codex',
      path: null,
      detected: false,
      status: 'CONFIG-ONLY',
    },
    {
      id: 'opencode',
      name: 'OpenCode',
      binary: 'opencode',
      path: null,
      detected: false,
      status: 'INACTIVE',
    },
    {
      id: 'aider',
      name: 'Aider',
      binary: 'aider',
      path: null,
      detected: false,
      status: 'INACTIVE',
    },
    {
      id: 'pi-cli',
      name: 'Pi CLI',
      binary: 'pi',
      path: null,
      detected: false,
      status: 'INACTIVE',
    },
  ],
  setHarnesses: (harnesses) => set({ harnesses }),

  claudeDesktopConfigPath: '~/Library/Application Support/Claude/claude_desktop_config.json',
  claudeDesktopExists: true,
  targetOs: 'darwin',
  targetArch: 'arm64-apple-darwin',
  setSystemScan: ({ harnesses, configPath, exists, os, arch }) =>
    set({
      harnesses,
      claudeDesktopConfigPath: configPath,
      claudeDesktopExists: exists,
      targetOs: os,
      targetArch: arch,
    }),

  models: [
    'gemini-2.5-flash-thinking',
    'claude-3-5-sonnet-20241022',
    'bedrock/anthropic.claude-3-opus-20240229-v1:0',
    'claude-3-5-haiku-20241022',
    'deepseek/deepseek-coder-v2.5',
    'groq/llama-3.3-70b-versatile',
  ],
  setModels: (models) => set({ models }),

  mapping: {
    opus: 'bedrock/anthropic.claude-3-opus-20240229-v1:0',
    sonnet: 'gemini-2.5-flash-thinking',
    haiku: 'claude-3-5-haiku-20241022',
    fallbackEnabled: true,
  },
  setMappingRole: (role, model) =>
    set((state) => ({
      mapping: { ...state.mapping, [role]: model },
    })),
  setFallbackEnabled: (enabled) =>
    set((state) => ({
      mapping: { ...state.mapping, fallbackEnabled: enabled },
    })),

  contextPolicy: {
    maxContextTokens: 200000,
    compactThresholdPercent: 90,
    streamTokenLimit: 8192,
  },
  setMaxContextTokens: (val) =>
    set((state) => ({
      contextPolicy: { ...state.contextPolicy, maxContextTokens: val },
    })),
  setCompactThreshold: (val) =>
    set((state) => ({
      contextPolicy: { ...state.contextPolicy, compactThresholdPercent: val },
    })),

  selectedEmulator: 'Terminal.app (macOS default)',
  setSelectedEmulator: (emu) => set({ selectedEmulator: emu }),

  activePid: 48291,
  setActivePid: (pid) => set({ activePid: pid }),

  backups: [],
  setBackups: (backups) => set({ backups }),

  ipcLogs: [
    '[IPC] System initialization ready',
    '[IPC] Config loaded for Claude Code',
  ],
  addIpcLog: (log) => set((state) => ({ ipcLogs: [log, ...state.ipcLogs.slice(0, 49)] })),
}))

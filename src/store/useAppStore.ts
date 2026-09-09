import { create } from 'zustand'
import type {
  HarnessInfo,
  ModelRoleMapping,
  ContextPolicy,
  BackupInfo,
  ProcessMeta,
  AppSettingsPayload,
  Language,
} from '../types'

interface AppState {
  language: Language
  setLanguage: (lang: Language) => void

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

  trackedProcesses: ProcessMeta[]
  setTrackedProcesses: (processes: ProcessMeta[]) => void
  activePid: number | null
  setActivePid: (pid: number | null) => void

  customAliases: Record<string, string>
  setCustomAlias: (alias: string, targetModel: string) => void
  removeCustomAlias: (alias: string) => void

  backups: BackupInfo[]
  setBackups: (backups: BackupInfo[]) => void

  ipcLogs: string[]
  addIpcLog: (log: string) => void

  applyLoadedSettings: (settings: AppSettingsPayload) => void
}

export const useAppStore = create<AppState>((set) => ({
  language: 'en',
  setLanguage: (lang) => set({ language: lang }),

  gatewayUrl: 'http://localhost:4000',
  apiKey: '',
  maskedKey: '',
  setGatewayUrl: (url) => set({ gatewayUrl: url }),
  setApiKey: (key) => {
    const trimmed = key.trim()
    const masked =
      trimmed.length > 8
        ? `${trimmed.slice(0, 4)}***${trimmed.slice(-4)}`
        : trimmed.length > 0
        ? '********'
        : ''
    set({ apiKey: key, maskedKey: masked })
  },

  selectedHarnessId: 'claude-code',
  setSelectedHarnessId: (id) => set({ selectedHarnessId: id }),

  harnesses: [
    {
      id: 'claude-code',
      name: 'Claude Code',
      binary: 'claude',
      path: null,
      detected: false,
      status: 'INACTIVE',
      version: null,
    },
    {
      id: 'claude-desktop',
      name: 'Claude Desktop',
      binary: 'claude-desktop',
      path: null,
      detected: false,
      status: 'INACTIVE',
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

  claudeDesktopConfigPath: '',
  claudeDesktopExists: false,
  targetOs: '',
  targetArch: '',
  setSystemScan: ({ harnesses, configPath, exists, os, arch }) =>
    set({
      harnesses,
      claudeDesktopConfigPath: configPath,
      claudeDesktopExists: exists,
      targetOs: os,
      targetArch: arch,
    }),

  models: [],
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

  trackedProcesses: [],
  setTrackedProcesses: (processes) =>
    set({
      trackedProcesses: processes,
      activePid: processes.find((p) => p.active)?.pid ?? null,
    }),
  activePid: null,
  setActivePid: (pid) => set({ activePid: pid }),

  customAliases: {
    'sonnet-workhorse': 'gemini-2.5-flash-thinking',
    'fast-indexer': 'claude-3-5-haiku-20241022',
  },
  setCustomAlias: (alias, targetModel) =>
    set((state) => ({
      customAliases: { ...state.customAliases, [alias]: targetModel },
    })),
  removeCustomAlias: (alias) =>
    set((state) => {
      const next = { ...state.customAliases }
      delete next[alias]
      return { customAliases: next }
    }),

  backups: [],
  setBackups: (backups) => set({ backups }),

  ipcLogs: ['[IPC] Core initialized'],
  addIpcLog: (log) =>
    set((state) => ({ ipcLogs: [log, ...state.ipcLogs.slice(0, 99)] })),

  applyLoadedSettings: (settings) => {
    const trimmed = settings.api_key.trim()
    const masked =
      trimmed.length > 8
        ? `${trimmed.slice(0, 4)}***${trimmed.slice(-4)}`
        : trimmed.length > 0
        ? '********'
        : ''

    set({
      language: settings.language || 'en',
      gatewayUrl: settings.gateway_url,
      apiKey: settings.api_key,
      maskedKey: masked,
      selectedEmulator: settings.selected_emulator,
      customAliases: settings.custom_aliases || {},
      mapping: {
        opus: settings.model_mapping.opus,
        sonnet: settings.model_mapping.sonnet,
        haiku: settings.model_mapping.haiku,
        fallbackEnabled: settings.model_mapping.fallback_enabled,
      },
      contextPolicy: {
        maxContextTokens: settings.context_policy.max_context_tokens,
        compactThresholdPercent: settings.context_policy.compact_threshold_percent,
        streamTokenLimit: settings.context_policy.stream_token_limit,
      },
    })
  },
}))

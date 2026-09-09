export interface HarnessInfo {
  id: string
  name: string
  binary: string
  path: string | null
  detected: boolean
  status: 'DETECTED' | 'CONFIG-ONLY' | 'INACTIVE'
  version?: string
}

export interface ClaudeDesktopLocation {
  config_path: string
  exists: boolean
  os: string
}

export interface SystemScanResult {
  harnesses: HarnessInfo[]
  claude_desktop: ClaudeDesktopLocation
  target_os: string
  target_arch: string
}

export interface LiteLLMModelItem {
  id: string
  object?: string
  created?: number
  owned_by?: string
}

export interface ModelsResponse {
  data: LiteLLMModelItem[]
  total: number
}

export interface HealthResponse {
  status: string
  latency_ms: number
  url: string
}

export interface BackupInfo {
  file_name: string
  path: string
  created_at: string
  size_bytes: number
}

export interface LaunchResult {
  success: boolean
  pid?: number
  emulator_used: string
  command_str: string
  message: string
}

export interface ModelRoleMapping {
  opus: string
  sonnet: string
  haiku: string
  fallbackEnabled: boolean
  [key: string]: unknown
}

export interface ContextPolicy {
  maxContextTokens: number
  compactThresholdPercent: number
  streamTokenLimit: number
}

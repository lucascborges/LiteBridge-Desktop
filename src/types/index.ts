export interface HarnessInfo {
  id: string
  name: string
  binary: string
  path: string | null
  detected: boolean
  status: 'DETECTED' | 'CONFIG-ONLY' | 'INACTIVE'
  version?: string | null
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

export interface ModelProbeResult {
  model_id: string
  success: boolean
  latency_ms: number
  error: string | null
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

export interface ProcessMeta {
  pid: number
  binary: string
  started_at_epoch: number
  emulator: string
  command_str: string
  active: boolean
  memory_rss_bytes: number
  cpu_usage_pct: number
  uptime_secs: number
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

export interface AppSettingsPayload {
  gateway_url: string
  api_key: string
  model_mapping: {
    opus: string
    sonnet: string
    haiku: string
    fallback_enabled: boolean
  }
  context_policy: {
    max_context_tokens: number
    compact_threshold_percent: number
    stream_token_limit: number
  }
  selected_emulator: string
  custom_aliases: Record<string, string>
  updated_at: string
}

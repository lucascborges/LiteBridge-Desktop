import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'
import { useAppStore } from '../store/useAppStore'
import type {
  HealthResponse,
  SystemScanResult,
  ModelsResponse,
  BackupInfo,
  LaunchResult,
  ProcessMeta,
  ModelProbeResult,
  AppSettingsPayload,
} from '../types'

const safeInvoke = async <T>(cmd: string, args?: Record<string, unknown>): Promise<T> => {
  return await invoke<T>(cmd, args)
}

export const useAppInitSettings = () => {
  const applyLoadedSettings = useAppStore((s) => s.applyLoadedSettings)
  const addIpcLog = useAppStore((s) => s.addIpcLog)

  return useQuery<AppSettingsPayload, Error>({
    queryKey: ['app-settings'],
    queryFn: async () => {
      try {
        const res = await safeInvoke<AppSettingsPayload>('load_app_settings')
        applyLoadedSettings(res)
        addIpcLog('[SETTINGS] Persistent configuration loaded from host OS')
        return res
      } catch (err) {
        addIpcLog(`[SETTINGS_ERROR] Failed to load settings: ${err}`)
        throw err
      }
    },
    staleTime: Infinity,
  })
}

export const useSaveAppSettings = () => {
  const addIpcLog = useAppStore((s) => s.addIpcLog)

  return useMutation({
    mutationFn: async (settings: AppSettingsPayload) => {
      const res = await safeInvoke<AppSettingsPayload>('save_app_settings', { settings })
      addIpcLog('[SETTINGS] Configuration saved to host OS disk')
      return res
    },
  })
}

export const useLiteLLMHealth = () => {
  const gatewayUrl = useAppStore((s) => s.gatewayUrl)
  const apiKey = useAppStore((s) => s.apiKey)
  const addIpcLog = useAppStore((s) => s.addIpcLog)

  return useQuery<HealthResponse, Error>({
    queryKey: ['litellm-health', gatewayUrl],
    queryFn: async () => {
      try {
        const res = await safeInvoke<HealthResponse>('check_litellm_health', {
          gatewayUrl,
          apiKey: apiKey || null,
        })
        addIpcLog(`[HEALTH] LiteLLM connected (${res.latency_ms}ms)`)
        return res
      } catch (err) {
        addIpcLog(`[HEALTH_ERROR] LiteLLM unreachable: ${err}`)
        throw err
      }
    },
    refetchInterval: 15000,
    retry: false,
  })
}

export const useLiteLLMModels = () => {
  const gatewayUrl = useAppStore((s) => s.gatewayUrl)
  const apiKey = useAppStore((s) => s.apiKey)
  const setModels = useAppStore((s) => s.setModels)
  const addIpcLog = useAppStore((s) => s.addIpcLog)

  return useQuery<string[], Error>({
    queryKey: ['litellm-models', gatewayUrl],
    queryFn: async () => {
      try {
        const res = await safeInvoke<ModelsResponse>('fetch_litellm_models', {
          gatewayUrl,
          apiKey: apiKey || null,
        })
        const list = res.data.map((m) => m.id)
        setModels(list)
        addIpcLog(`[MODELS] Retrieved ${list.length} models from LiteLLM`)
        return list
      } catch (err) {
        addIpcLog(`[MODELS_OFFLINE] LiteLLM offline or /v1/models returned error: ${err}`)
        setModels([])
        throw err
      }
    },
    staleTime: 60000,
    retry: false,
  })
}

export const useProbeModelLatency = () => {
  const gatewayUrl = useAppStore((s) => s.gatewayUrl)
  const apiKey = useAppStore((s) => s.apiKey)
  const addIpcLog = useAppStore((s) => s.addIpcLog)

  return useMutation({
    mutationFn: async (modelId: string) => {
      const res = await safeInvoke<ModelProbeResult>('probe_model_latency', {
        gatewayUrl,
        apiKey: apiKey || null,
        modelId,
      })
      if (res.success) {
        addIpcLog(`[PROBE] ${modelId} probe latency: ${res.latency_ms}ms`)
      } else {
        addIpcLog(`[PROBE_ERR] ${modelId} failed: ${res.error || 'unknown'}`)
      }
      return res
    },
  })
}

export const useSystemScanner = () => {
  const setSystemScan = useAppStore((s) => s.setSystemScan)
  const addIpcLog = useAppStore((s) => s.addIpcLog)

  return useQuery<SystemScanResult, Error>({
    queryKey: ['system-scan'],
    queryFn: async () => {
      try {
        const res = await safeInvoke<SystemScanResult>('scan_system')
        setSystemScan({
          harnesses: res.harnesses,
          configPath: res.claude_desktop.config_path,
          exists: res.claude_desktop.exists,
          os: res.target_os,
          arch: res.target_arch,
        })
        const detectedCount = res.harnesses.filter((h) => h.detected).length
        addIpcLog(`[SCAN] Harnesses scanned (${detectedCount} detected on host)`)
        return res
      } catch (err) {
        addIpcLog(`[SCAN_ERROR] Failed to scan system: ${err}`)
        throw err
      }
    },
    staleTime: 120000,
  })
}

export const useConfigBackups = () => {
  const setBackups = useAppStore((s) => s.setBackups)

  return useQuery<BackupInfo[], Error>({
    queryKey: ['config-backups'],
    queryFn: async () => {
      try {
        const res = await safeInvoke<BackupInfo[]>('list_config_backups', {})
        setBackups(res)
        return res
      } catch {
        setBackups([])
        return []
      }
    },
  })
}

export const useMutateClaudeDesktopConfig = () => {
  const queryClient = useQueryClient()
  const addIpcLog = useAppStore((s) => s.addIpcLog)

  return useMutation({
    mutationFn: async (payload: {
      gatewayUrl: string
      apiKey?: string
      modelMapping?: Record<string, unknown>
    }) => {
      return await safeInvoke('mutate_claude_desktop_config', {
        payload: {
          target_path: null,
          gateway_url: payload.gatewayUrl,
          api_key: payload.apiKey || null,
          model_mapping: payload.modelMapping || null,
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config-backups'] })
      addIpcLog('[CONFIG] Claude Desktop configuration mutated & backup saved')
    },
  })
}

export const useLaunchTerminal = () => {
  const addIpcLog = useAppStore((s) => s.addIpcLog)
  const setActivePid = useAppStore((s) => s.setActivePid)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: {
      binary: string
      args?: string[]
      emulator?: string
      envVars: Record<string, string>
    }) => {
      const res = await safeInvoke<LaunchResult>('launch_scoped_terminal', {
        payload: {
          binary: payload.binary,
          args: payload.args || [],
          emulator: payload.emulator || null,
          env_vars: payload.envVars,
        },
      })
      if (res.pid) {
        setActivePid(res.pid)
      }
      queryClient.invalidateQueries({ queryKey: ['tracked-processes'] })
      addIpcLog(`[SPAWN] ${res.message} (PID ${res.pid || 'n/a'})`)
      return res
    },
  })
}

export const useTrackedProcesses = () => {
  const setTrackedProcesses = useAppStore((s) => s.setTrackedProcesses)

  return useQuery<ProcessMeta[], Error>({
    queryKey: ['tracked-processes'],
    queryFn: async () => {
      try {
        const res = await safeInvoke<ProcessMeta[]>('list_tracked_processes')
        setTrackedProcesses(res)
        return res
      } catch {
        return []
      }
    },
    refetchInterval: 3000,
  })
}

export const useKillProcess = () => {
  const queryClient = useQueryClient()
  const addIpcLog = useAppStore((s) => s.addIpcLog)

  return useMutation({
    mutationFn: async (pid: number) => {
      const res = await safeInvoke<boolean>('kill_tracked_process', { pid })
      addIpcLog(`[PROCESS] Kill signal sent to PID ${pid} (result: ${res})`)
      return res
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracked-processes'] })
    },
  })
}

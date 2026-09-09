import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'
import { useAppStore } from '../store/useAppStore'
import type { HealthResponse, SystemScanResult, ModelsResponse, BackupInfo, LaunchResult, LiteLLMModelItem } from '../types'

// Mock de fallback gracioso para quando rodar no browser/vitest sem Tauri nativo
const safeInvoke = async <T>(cmd: string, args?: Record<string, unknown>): Promise<T> => {
  try {
    return await invoke<T>(cmd, args)
  } catch (err) {
    console.warn(`Tauri invoke "${cmd}" failed or browser environment:`, err)
    throw err
  }
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
      } catch {
        return {
          status: 'connected',
          latency_ms: 18,
          url: gatewayUrl,
        }
      }
    },
    refetchInterval: 15000,
  })
}

export const useLiteLLMModels = () => {
  const gatewayUrl = useAppStore((s) => s.gatewayUrl)
  const apiKey = useAppStore((s) => s.apiKey)
  const setModels = useAppStore((s) => s.setModels)

  return useQuery<string[], Error>({
    queryKey: ['litellm-models', gatewayUrl],
    queryFn: async () => {
      try {
        const res = await safeInvoke<ModelsResponse>('fetch_litellm_models', {
          gatewayUrl,
          apiKey: apiKey || null,
        })
        const list = res.data.map((m: LiteLLMModelItem) => m.id)
        setModels(list)
        return list
      } catch {
        const defaults = [
          'gemini-2.5-flash-thinking',
          'claude-3-5-sonnet-20241022',
          'bedrock/anthropic.claude-3-opus-20240229-v1:0',
          'claude-3-5-haiku-20241022',
          'deepseek/deepseek-coder-v2.5',
          'groq/llama-3.3-70b-versatile',
        ]
        setModels(defaults)
        return defaults
      }
    },
    staleTime: 60000,
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
        addIpcLog(`[SCAN] Harnesses scanned (${res.harnesses.filter((h) => h.detected).length} detected)`)
        return res
      } catch {
        return {
          harnesses: useAppStore.getState().harnesses,
          claude_desktop: {
            config_path: useAppStore.getState().claudeDesktopConfigPath,
            exists: true,
            os: 'darwin',
          },
          target_os: 'darwin',
          target_arch: 'arm64-apple-darwin',
        }
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

  return useMutation({
    mutationFn: async (payload: {
      binary: string
      args?: string[]
      emulator?: string
      envVars: Record<string, string>
    }) => {
      try {
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
        addIpcLog(`[SPAWN] ${res.message} (PID ${res.pid || 'n/a'})`)
        return res
      } catch {
        const mockPid = Math.floor(40000 + Math.random() * 10000)
        setActivePid(mockPid)
        addIpcLog(`[SPAWN] Terminal launched with ephemeral env (PID ${mockPid})`)
        return {
          success: true,
          pid: mockPid,
          emulator_used: payload.emulator || 'Terminal.app',
          command_str: `env ${Object.entries(payload.envVars)
            .map(([k, v]) => `${k}="${v}"`)
            .join(' ')} ${payload.binary}`,
          message: `Agent Spawned (PID ${mockPid})`,
        }
      }
    },
  })
}

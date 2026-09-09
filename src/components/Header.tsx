import React, { useState } from 'react'
import { Activity, RefreshCw, Settings, User, Globe } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '../store/useAppStore'
import { useLiteLLMHealth, useSaveAppSettings } from '../hooks/useTauriBridge'
import { useTranslation } from '../i18n/useTranslation'
import type { Language } from '../types'

export const Header: React.FC<{ onOpenDiagnostics: () => void }> = ({ onOpenDiagnostics }) => {
  const queryClient = useQueryClient()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { t, language, setLanguage } = useTranslation()
  const gatewayUrl = useAppStore((s) => s.gatewayUrl)
  const apiKey = useAppStore((s) => s.apiKey)
  const models = useAppStore((s) => s.models)
  const selectedEmulator = useAppStore((s) => s.selectedEmulator)
  const customAliases = useAppStore((s) => s.customAliases)
  const modelMapping = useAppStore((s) => s.mapping)
  const contextPolicy = useAppStore((s) => s.contextPolicy)

  const { data: health, isLoading } = useLiteLLMHealth()
  const saveSettingsMutation = useSaveAppSettings()

  const isConnected = !isLoading && health?.status === 'connected'
  const latency = health?.latency_ms ?? 18

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang)
    saveSettingsMutation.mutate({
      gateway_url: gatewayUrl,
      api_key: apiKey,
      language: newLang,
      selected_emulator: selectedEmulator,
      custom_aliases: customAliases,
      updated_at: new Date().toISOString(),
      model_mapping: {
        opus: modelMapping.opus,
        sonnet: modelMapping.sonnet,
        haiku: modelMapping.haiku,
        fallback_enabled: modelMapping.fallbackEnabled,
      },
      context_policy: {
        max_context_tokens: contextPolicy.maxContextTokens,
        compact_threshold_percent: contextPolicy.compactThresholdPercent,
        stream_token_limit: contextPolicy.streamTokenLimit,
      },
    })
  }

  return (
    <header
      className="fixed top-0 inset-x-0 z-50 h-[38px] bg-[#0e0e10]/95 backdrop-blur-xl border-b border-[#27272a] select-none"
      data-tauri-drag-region
    >
      <div className="h-[38px] w-full px-3 flex items-center justify-between">
        {/* Window controls / Traffic lights simulation + Brand */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#ef4444] cursor-pointer hover:opacity-80" />
            <span className="w-3 h-3 rounded-full bg-[#f59e0b] cursor-pointer hover:opacity-80" />
            <span className="w-3 h-3 rounded-full bg-[#10b981] cursor-pointer hover:opacity-80" />
          </div>

          <div className="flex items-center gap-2 pl-2">
            <div className="w-5 h-5 rounded bg-[#18181b] border border-[#27272a] flex items-center justify-center">
              <span className="text-xs text-[#10b981] font-bold">L</span>
            </div>
            <span className="font-mono text-xs text-[#e5e1e4] tracking-tight">
              {t('appTitle')}{' '}
              <span className="text-[#bbcabf] text-[10px]">{t('appSubtitle')}</span>
            </span>
          </div>
        </div>

        {/* Center Gateway Status Pill */}
        <div className="hidden md:flex items-center">
          <div className="flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#1c1b1d] border border-[#27272a] shadow-inner text-xs">
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isConnected ? 'bg-[#10b981]' : 'bg-[#ef4444]'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isConnected ? 'bg-[#10b981]' : 'bg-[#ef4444]'
                }`}
              />
            </span>
            <span className="font-mono text-[11px] text-[#e5e1e4]">
              <span className={isConnected ? 'text-[#10b981] font-medium' : 'text-[#ef4444] font-medium'}>
                {isConnected ? t('gatewayConnected') : t('gatewayOffline')}
              </span>{' '}
              ({models.length} models) •{' '}
              <span className="text-[#4cd7f6]">{gatewayUrl}</span> •{' '}
              <span className="text-[#86948a]">{latency}ms</span>
            </span>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center gap-1.5">
          {/* Language Selector */}
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#201f22] border border-[#27272a] text-xs font-mono">
            <Globe className="w-3.5 h-3.5 text-[#4cd7f6]" />
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value as Language)}
              className="bg-transparent text-[#e5e1e4] text-[11px] font-mono focus:outline-none cursor-pointer pr-1"
              aria-label={t('language')}
            >
              <option value="en" className="bg-[#1c1b1d] text-[#e5e1e4]">
                EN
              </option>
              <option value="pt" className="bg-[#1c1b1d] text-[#e5e1e4]">
                PT
              </option>
              <option value="es" className="bg-[#1c1b1d] text-[#e5e1e4]">
                ES
              </option>
            </select>
          </div>

          <button
            type="button"
            onClick={onOpenDiagnostics}
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#201f22] hover:bg-[#2a2a2c] text-[#bbcabf] hover:text-[#e5e1e4] text-xs transition-colors cursor-pointer"
            title={t('ipcDiagnostics')}
          >
            <Activity className="w-3.5 h-3.5 text-[#10b981]" />
            <span className="hidden lg:inline text-[11px] font-mono">{t('ipcDiagnostics')}</span>
          </button>

          <button
            type="button"
            disabled={isRefreshing}
            onClick={async () => {
              setIsRefreshing(true)
              await queryClient.invalidateQueries()
              setTimeout(() => setIsRefreshing(false), 500)
            }}
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#201f22] hover:bg-[#2a2a2c] disabled:opacity-50 text-[#bbcabf] hover:text-[#e5e1e4] text-xs transition-colors cursor-pointer"
            title={t('refresh')}
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#4cd7f6] ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden lg:inline text-[11px] font-mono">{t('refresh')}</span>
          </button>

          <button
            type="button"
            className="p-1 rounded bg-[#201f22] hover:bg-[#2a2a2c] text-[#bbcabf] hover:text-[#e5e1e4] transition-colors"
            title={t('settings')}
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          <div className="w-6 h-6 rounded-full bg-[#10b981] text-[#003824] flex items-center justify-center ml-1">
            <User className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </header>
  )
}

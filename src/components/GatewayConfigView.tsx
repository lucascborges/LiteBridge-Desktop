import React, { useState } from 'react'
import { Server, Check, Key } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useLiteLLMHealth, useSaveAppSettings } from '../hooks/useTauriBridge'
import { useTranslation } from '../i18n/useTranslation'

export const GatewayConfigView: React.FC = () => {
  const gatewayUrl = useAppStore((s) => s.gatewayUrl)
  const setGatewayUrl = useAppStore((s) => s.setGatewayUrl)
  const apiKey = useAppStore((s) => s.apiKey)
  const setApiKey = useAppStore((s) => s.setApiKey)
  const maskedKey = useAppStore((s) => s.maskedKey)
  const selectedEmulator = useAppStore((s) => s.selectedEmulator)
  const customAliases = useAppStore((s) => s.customAliases)
  const modelMapping = useAppStore((s) => s.mapping)
  const contextPolicy = useAppStore((s) => s.contextPolicy)
  const language = useAppStore((s) => s.language)

  const { t } = useTranslation()

  const [inputUrl, setInputUrl] = useState(gatewayUrl)
  const [inputKey, setInputKey] = useState(apiKey)
  const [saved, setSaved] = useState(false)

  const { data: health, refetch, isFetching } = useLiteLLMHealth()
  const saveSettingsMutation = useSaveAppSettings()

  const handleSave = async () => {
    setGatewayUrl(inputUrl)
    setApiKey(inputKey)

    await saveSettingsMutation.mutateAsync({
      gateway_url: inputUrl,
      api_key: inputKey,
      selected_emulator: selectedEmulator,
      custom_aliases: customAliases,
      language,
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

    await refetch()
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="rounded-xl bg-[#1c1b1d] p-5 border border-[#27272a] shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#201f22] border border-[#27272a] flex items-center justify-center">
            <Server className="w-5 h-5 text-[#4cd7f6]" />
          </div>
          <div>
            <h2 className="text-lg text-[#e5e1e4] font-semibold">{t('gatewayConfigTitle')}</h2>
            <p className="text-xs text-[#bbcabf]">
              {t('gatewayConfigDesc')}
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <div className="space-y-1">
            <label className="font-mono text-xs text-[#bbcabf] font-medium block">
              {t('proxyHostLabel')}
            </label>
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="http://localhost:4000"
              className="w-full h-10 px-3 rounded-lg bg-[#0e0e10] text-[#e5e1e4] font-mono text-xs border border-[#27272a] focus:outline-none focus:border-[#10b981]"
            />
            <p className="text-[11px] text-[#86948a]">
              {t('proxyHostHelp')}
            </p>
          </div>

          <div className="space-y-1">
            <label className="font-mono text-xs text-[#bbcabf] font-medium block flex items-center justify-between">
              <span>{t('masterKeyLabel')}</span>
              <span className="text-[10px] text-[#ffb95f] flex items-center gap-1">
                <Key className="w-3 h-3" /> {t('maskedInUi')}: {maskedKey || 'None'}
              </span>
            </label>
            <input
              type="password"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="sk-litellm-..."
              className="w-full h-10 px-3 rounded-lg bg-[#0e0e10] text-[#e5e1e4] font-mono text-xs border border-[#27272a] focus:outline-none focus:border-[#10b981]"
            />
            <p className="text-[11px] text-[#86948a]">
              {t('masterKeyHelp')}
            </p>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 rounded-lg bg-[#10b981] hover:bg-[#4edea3] text-[#003824] font-bold text-xs transition-colors flex items-center gap-2 cursor-pointer shadow-md"
            >
              {saved ? <Check className="w-4 h-4" /> : null}
              <span>{saved ? t('savedToDisk') : t('saveAndPersist')}</span>
            </button>
            {isFetching && (
              <span className="font-mono text-xs text-[#bbcabf] animate-pulse">
                {t('probingGateway')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Gateway Live Diagnostics Card */}
      <div className="rounded-xl bg-[#0e0e10] p-4 border border-[#27272a] shadow-inner space-y-2">
        <h3 className="font-mono text-xs uppercase text-[#bbcabf] font-bold tracking-wider">
          {t('telemetryAndPing')}
        </h3>
        <div className="grid grid-cols-3 gap-3 font-mono text-xs">
          <div className="bg-[#1c1b1d] p-3 rounded-lg border border-[#27272a]">
            <span className="text-[#86948a] block text-[10px]">{t('healthcheck')}</span>
            <span
              className={`font-bold text-sm ${
                health?.status === 'connected' ? 'text-[#10b981]' : 'text-[#ef4444]'
              }`}
            >
              {health?.status === 'connected' ? '200 OK' : 'OFFLINE'}
            </span>
          </div>
          <div className="bg-[#1c1b1d] p-3 rounded-lg border border-[#27272a]">
            <span className="text-[#86948a] block text-[10px]">{t('roundtripLatency')}</span>
            <span className="text-[#4cd7f6] font-bold text-sm">
              {health?.latency_ms ? `${health.latency_ms} ms` : 'N/A'}
            </span>
          </div>
          <div className="bg-[#1c1b1d] p-3 rounded-lg border border-[#27272a]">
            <span className="text-[#86948a] block text-[10px]">{t('hostSettingsDisk')}</span>
            <span className="text-[#e5e1e4] font-bold text-sm">
              %APPDATA%/LiteBridge
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

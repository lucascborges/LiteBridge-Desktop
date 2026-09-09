import React, { useState } from 'react'
import {
  Database,
  Plus,
  Trash2,
  Activity,
  Check,
  Search,
  Zap,
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useProbeModelLatency, useSaveAppSettings } from '../hooks/useTauriBridge'
import { useTranslation } from '../i18n/useTranslation'

export const ModelRegistryView: React.FC = () => {
  const models = useAppStore((s) => s.models)
  const gatewayUrl = useAppStore((s) => s.gatewayUrl)
  const apiKey = useAppStore((s) => s.apiKey)
  const customAliases = useAppStore((s) => s.customAliases)
  const setCustomAlias = useAppStore((s) => s.setCustomAlias)
  const removeCustomAlias = useAppStore((s) => s.removeCustomAlias)
  const modelMapping = useAppStore((s) => s.mapping)
  const contextPolicy = useAppStore((s) => s.contextPolicy)
  const selectedEmulator = useAppStore((s) => s.selectedEmulator)
  const language = useAppStore((s) => s.language)

  const { t } = useTranslation()

  const probeMutation = useProbeModelLatency()
  const saveSettingsMutation = useSaveAppSettings()

  const [aliasName, setAliasName] = useState('')
  const [aliasTarget, setAliasTarget] = useState(models[0] || '')
  const [filterQuery, setFilterQuery] = useState('')
  const [probeResults, setProbeResults] = useState<Record<string, { latency?: number; error?: string | null; loading?: boolean }>>({})
  const [savedNotice, setSavedNotice] = useState(false)

  const handleProbe = async (modelId: string) => {
    setProbeResults((prev) => ({ ...prev, [modelId]: { loading: true } }))
    try {
      const res = await probeMutation.mutateAsync(modelId)
      setProbeResults((prev) => ({
        ...prev,
        [modelId]: { latency: res.latency_ms, error: res.error, loading: false },
      }))
    } catch (err) {
      setProbeResults((prev) => ({
        ...prev,
        [modelId]: { error: String(err), loading: false },
      }))
    }
  }

  const handleAddAlias = async () => {
    if (!aliasName.trim() || !aliasTarget) return
    setCustomAlias(aliasName.trim(), aliasTarget)

    const updatedAliases = { ...customAliases, [aliasName.trim()]: aliasTarget }

    await saveSettingsMutation.mutateAsync({
      gateway_url: gatewayUrl,
      api_key: apiKey,
      selected_emulator: selectedEmulator,
      custom_aliases: updatedAliases,
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

    setAliasName('')
    setSavedNotice(true)
    setTimeout(() => setSavedNotice(false), 2000)
  }

  const handleRemoveAlias = async (alias: string) => {
    removeCustomAlias(alias)
    const updatedAliases = { ...customAliases }
    delete updatedAliases[alias]

    await saveSettingsMutation.mutateAsync({
      gateway_url: gatewayUrl,
      api_key: apiKey,
      selected_emulator: selectedEmulator,
      custom_aliases: updatedAliases,
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
  }

  const filteredModels = models.filter((m) =>
    m.toLowerCase().includes(filterQuery.toLowerCase())
  )

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="rounded-xl bg-[#1c1b1d] p-5 border border-[#27272a] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#201f22] border border-[#27272a] flex items-center justify-center">
            <Database className="w-5 h-5 text-[#ffb95f]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg text-[#e5e1e4] font-semibold">{t('modelRegistryTitle')}</h2>
              <span className="px-2 py-0.5 rounded-full bg-[#ffb95f]/10 text-[#ffb95f] font-mono text-[10px] font-bold">
                {models.length} {t('discovered')}
              </span>
            </div>
            <p className="text-xs text-[#bbcabf]">
              {t('modelRegistryDesc')}
            </p>
          </div>
        </div>

        {savedNotice && (
          <div className="px-3 py-1 rounded bg-[#10b981]/10 border border-[#10b981]/30 text-xs text-[#10b981] font-mono flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5" />
            <span>{t('aliasPersistedNotice')}</span>
          </div>
        )}
      </div>

      {/* Model Alias Creator */}
      <div className="rounded-xl bg-[#0e0e10] p-4 border border-[#27272a] shadow-inner space-y-3">
        <h3 className="text-xs font-mono uppercase text-[#bbcabf] font-bold tracking-wider flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-[#10b981]" />
          <span>{t('createRouteAlias')}</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
          <div className="sm:col-span-4">
            <input
              type="text"
              placeholder={t('aliasNamePlaceholder')}
              value={aliasName}
              onChange={(e) => setAliasName(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-[#1c1b1d] text-[#e5e1e4] font-mono text-xs border border-[#27272a] focus:outline-none focus:border-[#10b981]"
            />
          </div>
          <div className="sm:col-span-6">
            <select
              value={aliasTarget}
              onChange={(e) => setAliasTarget(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-[#1c1b1d] text-[#e5e1e4] font-mono text-xs border border-[#27272a] focus:outline-none focus:border-[#10b981]"
            >
              {models.length === 0 ? (
                <option value="">{t('noModelsDiscovered')}</option>
              ) : (
                models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))
              )}
            </select>
          </div>
          <div className="sm:col-span-2">
            <button
              type="button"
              onClick={handleAddAlias}
              disabled={!aliasName.trim() || !aliasTarget}
              className="w-full h-9 rounded-lg bg-[#10b981] hover:bg-[#4edea3] text-[#003824] font-bold text-xs font-mono transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('saveAliasBtn')}</span>
            </button>
          </div>
        </div>

        {/* Existing Aliases Chips */}
        {Object.keys(customAliases).length > 0 && (
          <div className="pt-2 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono text-[#86948a] uppercase">{t('activeAliases')}</span>
            {Object.entries(customAliases).map(([alias, target]) => (
              <div
                key={alias}
                className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#1c1b1d] border border-[#27272a] text-xs font-mono"
              >
                <span className="text-[#4cd7f6] font-semibold">{alias}</span>
                <span className="text-[#86948a]">&rarr;</span>
                <span className="text-[#e5e1e4] text-[11px] truncate max-w-[200px]">{target}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveAlias(alias)}
                  className="text-[#86948a] hover:text-[#ef4444] transition-colors cursor-pointer"
                  title="Remove alias"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upstream Models Explorer */}
      <div className="rounded-xl bg-[#0e0e10] border border-[#27272a] overflow-hidden shadow-inner space-y-2">
        <div className="p-3 bg-[#1c1b1d] border-b border-[#27272a] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#86948a]" />
            <input
              type="text"
              placeholder={t('filterUpstreamPlaceholder')}
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 rounded bg-[#0e0e10] text-[#e5e1e4] font-mono text-xs border border-[#27272a] focus:outline-none focus:border-[#10b981]"
            />
          </div>
          <span className="font-mono text-xs text-[#86948a]">
            {t('showingModelsCount', { filtered: filteredModels.length, total: models.length })}
          </span>
        </div>

        {models.length === 0 ? (
          <div className="p-8 text-center text-xs font-mono text-[#86948a] space-y-1">
            <p>{t('noModelsDiscovered')}</p>
            <p className="text-[11px] text-[#bbcabf]">
              {t('ensureLiteLLMRunning', { url: gatewayUrl })}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#27272a] max-h-[420px] overflow-y-auto font-mono text-xs">
            {filteredModels.map((modelId) => {
              const probe = probeResults[modelId]
              return (
                <div
                  key={modelId}
                  className="p-3 flex items-center justify-between hover:bg-[#18181b] transition-colors"
                >
                  <div className="space-y-0.5 min-w-0 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[#e5e1e4] font-medium truncate">{modelId}</span>
                      {Object.values(customAliases).includes(modelId) && (
                        <span className="px-1.5 py-0.2 rounded bg-[#4cd7f6]/10 text-[#4cd7f6] text-[9px] uppercase font-bold">
                          {t('aliasedBadge')}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-[#86948a]">Target: {gatewayUrl}/v1</span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {probe?.loading ? (
                      <span className="text-[#ffb95f] text-[11px] animate-pulse">{t('probingOneToken')}</span>
                    ) : probe?.latency !== undefined ? (
                      <span
                        className={`text-[11px] font-bold ${
                          probe.error ? 'text-[#ef4444]' : 'text-[#10b981]'
                        }`}
                      >
                        {probe.error ? `Error: ${probe.error}` : `~${probe.latency}ms`}
                      </span>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => handleProbe(modelId)}
                      disabled={probe?.loading}
                      className="px-2.5 py-1 rounded bg-[#201f22] hover:bg-[#2a2a2c] text-[#e5e1e4] hover:text-[#10b981] text-xs transition-colors flex items-center gap-1 border border-[#27272a] cursor-pointer disabled:opacity-50"
                      title="Probe model inference response time"
                    >
                      <Activity className="w-3 h-3 text-[#10b981]" />
                      <span>{t('probeLatencyBtn')}</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

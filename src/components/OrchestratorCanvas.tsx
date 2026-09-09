import React, { useState } from 'react'
import {
  Network,
  PlayCircle,
  Copy,
  Check,
  Terminal as TerminalIcon,
  AlertCircle,
  RefreshCw,
  FolderOpen,
  BookOpen,
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import {
  useLaunchTerminal,
  useMutateClaudeDesktopConfig,
  useTrackedProcesses,
  useSystemScanner,
} from '../hooks/useTauriBridge'
import { useTranslation } from '../i18n/useTranslation'

export const OrchestratorCanvas: React.FC = () => {
  const selectedHarnessId = useAppStore((s) => s.selectedHarnessId)
  const harnesses = useAppStore((s) => s.harnesses)
  const targetArch = useAppStore((s) => s.targetArch)
  const gatewayUrl = useAppStore((s) => s.gatewayUrl)
  const apiKey = useAppStore((s) => s.apiKey)
  const maskedKey = useAppStore((s) => s.maskedKey)
  const models = useAppStore((s) => s.models)
  const mapping = useAppStore((s) => s.mapping)
  const setMappingRole = useAppStore((s) => s.setMappingRole)
  const setFallbackEnabled = useAppStore((s) => s.setFallbackEnabled)
  const contextPolicy = useAppStore((s) => s.contextPolicy)
  const setMaxContextTokens = useAppStore((s) => s.setMaxContextTokens)
  const setCompactThreshold = useAppStore((s) => s.setCompactThreshold)
  const selectedEmulator = useAppStore((s) => s.selectedEmulator)
  const setSelectedEmulator = useAppStore((s) => s.setSelectedEmulator)
  const activePid = useAppStore((s) => s.activePid)
  const { t } = useTranslation()

  const { data: trackedProcesses = [] } = useTrackedProcesses()
  const { refetch: refetchSystemScan, isFetching: isScanning } = useSystemScanner()

  const [copiedBinary, setCopiedBinary] = useState(false)
  const [copiedEnv, setCopiedEnv] = useState(false)
  const [copiedCmd, setCopiedCmd] = useState(false)
  const [launchingState, setLaunchingState] = useState<'idle' | 'spawning' | 'success'>('idle')
  const [launchFeedback, setLaunchFeedback] = useState<string | null>(null)

  const launchMutation = useLaunchTerminal()
  const mutateConfigMutation = useMutateClaudeDesktopConfig()

  const currentHarness = harnesses.find((h) => h.id === selectedHarnessId) || harnesses[0]
  const binaryPath =
    currentHarness?.path ||
    (currentHarness?.id === 'claude-desktop'
      ? 'claude_desktop_config.json'
      : currentHarness?.binary
      ? `/usr/local/bin/${currentHarness.binary}`
      : 'claude')

  const handleCopyBinary = () => {
    navigator.clipboard.writeText(binaryPath).catch(() => {})
    setCopiedBinary(true)
    setTimeout(() => setCopiedBinary(false), 1500)
  }

  const activeSonnetModel = mapping.sonnet?.trim() || 'claude-3-7-sonnet-20250219'
  const activeOpusModel = mapping.opus?.trim() || 'claude-3-opus-20240229'
  const activeHaikuModel = mapping.haiku?.trim() || 'claude-3-5-haiku-20241022'

  const envPayloadText = `export ANTHROPIC_BASE_URL="${gatewayUrl}"\nexport ANTHROPIC_API_KEY="${apiKey}"\nexport ANTHROPIC_MODEL="${activeSonnetModel}"\nexport CLAUDE_CODE_MODEL="${activeSonnetModel}"\nexport OPENAI_API_BASE="${gatewayUrl}/v1"\nexport OPENAI_MODEL="${activeSonnetModel}"`

  const handleCopyEnv = () => {
    navigator.clipboard.writeText(envPayloadText).catch(() => {})
    setCopiedEnv(true)
    setTimeout(() => setCopiedEnv(false), 1500)
  }

  const spawnCmdText = `env ANTHROPIC_BASE_URL="${gatewayUrl}" ANTHROPIC_MODEL="${activeSonnetModel}" ${binaryPath}`

  const handleCopyCmd = () => {
    navigator.clipboard.writeText(spawnCmdText).catch(() => {})
    setCopiedCmd(true)
    setTimeout(() => setCopiedCmd(false), 1500)
  }

  const handleLaunchAgent = async () => {
    if (currentHarness.id !== 'claude-desktop' && !currentHarness.detected) {
      setLaunchFeedback(t('binaryNotInstalled', { name: currentHarness.name }))
      setLaunchingState('idle')
      setTimeout(() => setLaunchFeedback(null), 4000)
      return
    }

    setLaunchingState('spawning')

    try {
      if (currentHarness.id === 'claude-desktop') {
        const res = await mutateConfigMutation.mutateAsync({
          gatewayUrl,
          apiKey,
          modelMapping: {
            opus: activeOpusModel,
            sonnet: activeSonnetModel,
            haiku: activeHaikuModel,
            fallbackEnabled: mapping.fallbackEnabled,
          },
        })
        setLaunchFeedback(res ? 'Claude Desktop configuration updated & backup saved!' : 'Config injected!')
      } else {
        const targetExec = currentHarness.path || currentHarness.binary
        const res = await launchMutation.mutateAsync({
          binary: targetExec,
          emulator: selectedEmulator,
          envVars: {
            ANTHROPIC_BASE_URL: gatewayUrl,
            ANTHROPIC_API_KEY: apiKey,
            OPENAI_API_BASE: `${gatewayUrl}/v1`,
            OPENAI_API_KEY: apiKey,
            ANTHROPIC_MODEL: activeSonnetModel,
            CLAUDE_MODEL: activeSonnetModel,
            CLAUDE_CODE_MODEL: activeSonnetModel,
            ANTHROPIC_DEFAULT_SONNET_MODEL: activeSonnetModel,
            ANTHROPIC_DEFAULT_OPUS_MODEL: activeOpusModel,
            ANTHROPIC_DEFAULT_HAIKU_MODEL: activeHaikuModel,
            OPENAI_MODEL: activeSonnetModel,
            MODEL: activeSonnetModel,
          },
        })
        setLaunchFeedback(res.message || `Process spawned (PID ${res.pid})`)
      }

      setLaunchingState('success')
    } catch (err) {
      setLaunchFeedback(`Launch failed: ${err}`)
      setLaunchingState('idle')
    } finally {
      setTimeout(() => {
        setLaunchingState('idle')
        setLaunchFeedback(null)
      }, 3500)
    }
  }

  const activeProcessesList = trackedProcesses.filter((p) => p.active)
  const currentProcess = activeProcessesList.find((p) => p.pid === activePid) || activeProcessesList[0]

  return (
    <div className="space-y-4">
      {/* Top Header & Status Hero Strip */}
      <div className="rounded-xl bg-[#1c1b1d] p-4 border border-[#27272a] shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#2a2a2c] flex items-center justify-center shrink-0 border border-[#3c4a42]">
              <TerminalIcon className="w-7 h-7 text-[#10b981]" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl text-[#e5e1e4] font-semibold tracking-tight">
                  {currentHarness.name}
                </h1>
                {currentHarness.version ? (
                  <span className="px-2 py-0.5 rounded font-mono text-xs bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/30">
                    {currentHarness.version}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded font-mono text-xs bg-[#201f22] text-[#86948a] border border-[#27272a]">
                    {t('versionUnindexed')}
                  </span>
                )}

                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#0e0e10] border border-[#27272a]">
                  <span className="relative flex h-2 w-2">
                    <span
                      className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        currentHarness.detected ? 'bg-[#10b981]' : 'bg-[#86948a]'
                      }`}
                    />
                    <span
                      className={`relative inline-flex rounded-full h-2 w-2 ${
                        currentHarness.detected ? 'bg-[#10b981]' : 'bg-[#86948a]'
                      }`}
                    />
                  </span>
                  <span
                    className={`font-mono text-[10px] uppercase font-bold tracking-wider ${
                      currentHarness.detected ? 'text-[#10b981]' : 'text-[#86948a]'
                    }`}
                  >
                    {currentHarness.detected ? t('detected') : t('configOnly')}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[#bbcabf] text-xs">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#86948a]">
                  Binary / Target Path
                </span>
                <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded bg-[#0e0e10] font-mono text-xs text-[#e5e1e4] border border-[#27272a]">
                  <span className={currentHarness.path ? 'text-[#10b981]' : 'text-[#86948a]'}>
                    {currentHarness.path || t('notFoundInPath')}
                  </span>
                  {currentHarness.path && (
                    <button
                      type="button"
                      onClick={handleCopyBinary}
                      className="text-[#86948a] hover:text-[#10b981] transition-colors cursor-pointer"
                      title="Copy path"
                    >
                      {copiedBinary ? (
                        <Check className="w-3.5 h-3.5 text-[#10b981]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
                <span className="text-[#3c4a42]">•</span>
                <span className="font-mono text-xs text-[#bbcabf]">
                  {t('targetArch')}: <span className="text-[#e5e1e4]">{targetArch || 'Detecting...'}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleLaunchAgent}
              disabled={launchingState === 'spawning'}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#10b981] hover:bg-[#4edea3] text-[#003824] font-bold text-xs shadow-[0_0_15px_rgba(16,185,129,0.3)] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
            >
              {launchingState === 'spawning' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{t('dispatchingProcess')}</span>
                </>
              ) : launchingState === 'success' ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>{launchFeedback || t('agentSpawned')}</span>
                </>
              ) : (
                <>
                  <TerminalIcon className="w-4 h-4" />
                  <span>
                    {currentHarness.id === 'claude-desktop'
                      ? t('mutateClaudeConfig')
                      : t('launchInTerminal', { name: currentHarness.name })}
                  </span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={isScanning}
              onClick={() => refetchSystemScan()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#201f22] hover:bg-[#2a2a2c] disabled:opacity-50 text-[#e5e1e4] text-xs transition-all border border-[#27272a] cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#10b981] ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? '...' : t('detectAgain')}</span>
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#201f22] hover:bg-[#2a2a2c] text-[#e5e1e4] text-xs transition-all border border-[#27272a]"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>{t('openFolder')}</span>
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#201f22] hover:bg-[#2a2a2c] text-[#bbcabf] hover:text-[#e5e1e4] text-xs transition-all border border-[#27272a]"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{t('docs')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Gateway Quick Info Bar */}
      <div className="rounded-xl bg-[#0e0e10] px-4 py-2 flex flex-col md:flex-row md:items-center justify-between gap-2 border border-[#27272a] shadow-inner text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#201f22] text-[#10b981] font-mono font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
            <span>LiteLLM Proxy: {gatewayUrl}</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[#bbcabf]">
            <span className="text-[#e5e1e4]">
              {models.length > 0 ? 'Connected' : 'Waiting connection'}
            </span>
            <span>•</span>
            <span className="text-[#4cd7f6]">{models.length} models upstream</span>
            <span>•</span>
            <span className="text-[#86948a]">Key: {maskedKey || 'No key set'}</span>
          </div>
        </div>
      </div>

      {/* 2-Column Grid Canvas */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* Left 7 Columns: Model Role Routing Matrix & Context Policies */}
        <div className="xl:col-span-7 space-y-4">
          <div className="rounded-xl bg-[#1c1b1d] p-4 border border-[#27272a] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Network className="w-4 h-4 text-[#10b981]" />
                  <h2 className="text-base text-[#e5e1e4] font-semibold">
                    {t('modelRoutingMatrix')}
                  </h2>
                </div>
                <p className="text-xs text-[#bbcabf]">
                  {t('modelRoutingDesc')}
                </p>
              </div>
              <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-[#201f22] text-[#4cd7f6] uppercase font-bold tracking-wider border border-[#27272a]">
                {t('zeroLockin')}
              </span>
            </div>

            {/* Tier 1: Opus */}
            <div className="rounded-lg bg-[#201f22] p-3 space-y-2 border border-[#27272a]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#ffb95f]" />
                  <span className="font-mono text-[11px] text-[#e5e1e4] font-bold uppercase tracking-wider">
                    {t('primaryOpusTier')}
                  </span>
                  <span className="px-1.5 py-0.5 rounded font-mono text-[10px] bg-[#2a2a2c] text-[#ffb95f]">
                    {t('architecturalReasoning')}
                  </span>
                </div>
              </div>
              <div className="relative">
                <input
                  type="text"
                  list="opus-model-options"
                  value={mapping.opus}
                  onChange={(e) => setMappingRole('opus', e.target.value)}
                  placeholder="e.g. claude-3-opus-20240229, bedrock/anthropic.claude-3-opus..."
                  className="w-full h-9 px-3 rounded bg-[#0e0e10] text-[#e5e1e4] font-mono text-xs border border-[#27272a] focus:outline-none focus:border-[#10b981]"
                />
                <datalist id="opus-model-options">
                  {models.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Tier 2: Sonnet */}
            <div className="rounded-lg bg-[#201f22] p-3 space-y-2 border border-[#10b981]/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  <span className="font-mono text-[11px] text-[#e5e1e4] font-bold uppercase tracking-wider">
                    {t('codingSonnetTarget')}
                  </span>
                  <span className="px-1.5 py-0.5 rounded font-mono text-[10px] bg-[#10b981]/10 text-[#10b981] font-semibold">
                    {t('activeWorkhorse')}
                  </span>
                </div>
              </div>
              <div className="relative">
                <input
                  type="text"
                  list="sonnet-model-options"
                  value={mapping.sonnet}
                  onChange={(e) => setMappingRole('sonnet', e.target.value)}
                  placeholder="e.g. claude-3-7-sonnet-20250219, gemini-2.0-flash, gpt-4o, etc."
                  className="w-full h-9 px-3 rounded bg-[#0e0e10] text-[#e5e1e4] font-mono text-xs border border-[#10b981]/50 focus:outline-none focus:border-[#10b981]"
                />
                <datalist id="sonnet-model-options">
                  {models.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Tier 3: Haiku */}
            <div className="rounded-lg bg-[#201f22] p-3 space-y-2 border border-[#27272a]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#4cd7f6]" />
                  <span className="font-mono text-[11px] text-[#e5e1e4] font-bold uppercase tracking-wider">
                    {t('fastHaikuTarget')}
                  </span>
                  <span className="px-1.5 py-0.5 rounded font-mono text-[10px] bg-[#2a2a2c] text-[#4cd7f6]">
                    {t('fastSummariesScans')}
                  </span>
                </div>
              </div>
              <div className="relative">
                <input
                  type="text"
                  list="haiku-model-options"
                  value={mapping.haiku}
                  onChange={(e) => setMappingRole('haiku', e.target.value)}
                  placeholder="e.g. claude-3-5-haiku-20241022"
                  className="w-full h-9 px-3 rounded bg-[#0e0e10] text-[#e5e1e4] font-mono text-xs border border-[#27272a] focus:outline-none focus:border-[#10b981]"
                />
                <datalist id="haiku-model-options">
                  {models.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Router Fallback Toggle */}
            <div className="pt-1 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFallbackEnabled(!mapping.fallbackEnabled)}
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                    mapping.fallbackEnabled ? 'bg-[#10b981]' : 'bg-[#353437]'
                  }`}
                >
                  <div
                    className={`w-4 h-4 bg-[#0e0e10] rounded-full transition-transform ${
                      mapping.fallbackEnabled ? 'ml-auto' : 'mr-auto'
                    }`}
                  />
                </button>
                <div>
                  <span className="text-xs text-[#e5e1e4] font-medium block">
                    {t('fallbackRoutingTitle')}
                  </span>
                  <span className="font-mono text-[11px] text-[#bbcabf] block">
                    {t('fallbackRoutingDesc')}
                  </span>
                </div>
              </div>
              <span className="font-mono text-[10px] text-[#10b981] font-bold uppercase">
                {mapping.fallbackEnabled ? t('enabled') : t('disabled')}
              </span>
            </div>
          </div>

          {/* Context Policies & Token Budget */}
          <div className="rounded-xl bg-[#1c1b1d] p-4 border border-[#27272a] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base text-[#e5e1e4] font-semibold">
                {t('contextPoliciesTitle')}
              </h2>
              <span className="font-mono text-xs text-[#bbcabf]">{t('activeProfile')}</span>
            </div>

            <div className="bg-[#201f22] p-3 rounded-lg border border-[#27272a] space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-[11px] text-[#bbcabf] uppercase font-bold tracking-wider">
                    {t('maxContextBound')}
                  </span>
                  <p className="text-xs text-[#bbcabf]">
                    {t('maxContextDesc')}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-1 rounded bg-[#0e0e10] text-[#10b981] font-mono text-xs font-semibold border border-[#27272a]">
                    {contextPolicy.maxContextTokens.toLocaleString()}
                  </span>
                  <span className="text-xs text-[#bbcabf]">{t('tokens')}</span>
                </div>
              </div>
              <input
                type="range"
                min="8000"
                max="1000000"
                step="4000"
                value={contextPolicy.maxContextTokens}
                onChange={(e) => setMaxContextTokens(Number(e.target.value))}
                className="w-full h-1.5 bg-[#0e0e10] rounded-lg appearance-none cursor-pointer accent-[#10b981]"
              />
              <div className="flex justify-between font-mono text-[10px] text-[#86948a]">
                <span>8k (Low-mem)</span>
                <span className="text-[#10b981]">200k (Claude Default)</span>
                <span>1,000k (Gemini Ultra)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-[#201f22] p-3 rounded-lg border border-[#27272a] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-[#bbcabf] uppercase font-bold">
                    {t('autoCompactThreshold')}
                  </span>
                  <span className="font-mono text-xs font-bold text-[#ffb95f]">
                    {contextPolicy.compactThresholdPercent}%
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="95"
                  value={contextPolicy.compactThresholdPercent}
                  onChange={(e) => setCompactThreshold(Number(e.target.value))}
                  className="w-full h-1.5 bg-[#0e0e10] rounded-lg appearance-none cursor-pointer accent-[#ffb95f]"
                />
                <p className="text-[11px] text-[#bbcabf] leading-snug">
                  {t('autoCompactDesc')}
                </p>
              </div>

              <div className="bg-[#201f22] p-3 rounded-lg border border-[#27272a] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-[#bbcabf] uppercase font-bold">
                    {t('streamTokenLimit')}
                  </span>
                  <span className="font-mono text-xs font-bold text-[#4cd7f6]">
                    {contextPolicy.streamTokenLimit.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 text-xs">
                  <span className="text-[#bbcabf]">{t('perTurnResponse')}</span>
                  <span className="px-2 py-0.5 rounded bg-[#0e0e10] text-[#e5e1e4] font-mono text-[11px] border border-[#27272a]">
                    Chunked HTTP/2
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 Columns: Injection Engine & Launch Controls */}
        <div className="xl:col-span-5 space-y-4">
          <div className="rounded-xl bg-[#1c1b1d] p-4 border border-[#27272a] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PlayCircle className="w-4 h-4 text-[#10b981]" />
                <h2 className="text-base text-[#e5e1e4] font-semibold">
                  {currentHarness.id === 'claude-desktop'
                    ? t('engineAConfigMutator')
                    : t('engineBTerminalSpawner')}
                </h2>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-ping" />
            </div>

            {/* Main Action Buttons - Positioned At The Top */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleLaunchAgent}
                disabled={launchingState === 'spawning'}
                className="w-full h-11 px-4 rounded-lg bg-[#10b981] hover:bg-[#4edea3] text-[#003824] font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                {launchingState === 'spawning' ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>{t('dispatchingProcess')}</span>
                  </>
                ) : launchingState === 'success' ? (
                  <>
                    <Check className="w-5 h-5" />
                    <span>{launchFeedback || t('agentSpawned')}</span>
                  </>
                ) : (
                  <>
                    <TerminalIcon className="w-5 h-5" />
                    <span>
                      {currentHarness.id === 'claude-desktop'
                        ? t('mutateClaudeConfig')
                        : t('launchInTerminal', { name: currentHarness.name })}
                    </span>
                  </>
                )}
              </button>

              {launchFeedback && launchingState !== 'success' && (
                <div className="p-2 rounded bg-[#ef4444]/10 border border-[#ef4444]/30 text-xs text-[#ef4444] font-mono flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{launchFeedback}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleCopyCmd}
                  className="w-full h-9 rounded-lg bg-[#201f22] hover:bg-[#2a2a2c] text-[#e5e1e4] text-xs transition-colors flex items-center justify-center gap-1.5 border border-[#27272a] cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedCmd ? t('copied') : t('copyLaunchCmd')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="w-full h-9 rounded-lg bg-[#201f22] hover:bg-[#2a2a2c] text-[#bbcabf] hover:text-[#ffb4ab] text-xs transition-colors flex items-center justify-center gap-1.5 border border-[#27272a] cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{t('resetDefaults')}</span>
                </button>
              </div>
            </div>

            {currentHarness.id !== 'claude-desktop' && (
              <div className="space-y-1">
                <label className="font-mono text-[10px] uppercase text-[#86948a] font-bold tracking-wider block">
                  {t('terminalEmulatorTarget')}
                </label>
                <select
                  value={selectedEmulator}
                  onChange={(e) => setSelectedEmulator(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-[#201f22] text-[#e5e1e4] text-xs border border-[#27272a] focus:outline-none focus:border-[#10b981] cursor-pointer"
                >
                  <option>Terminal.app (macOS default)</option>
                  <option>iTerm2 (com.googlecode.iterm2)</option>
                  <option>Windows Terminal (wt.exe)</option>
                  <option>PowerShell (-NoExit)</option>
                  <option>gnome-terminal (Linux)</option>
                  <option>Alacritty / Kitty</option>
                </select>
              </div>
            )}

            {/* Scoped Env Payload Display */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase text-[#86948a] font-bold tracking-wider">
                  {t('scopedEnvPayload')}
                </span>
                <span className="font-mono text-[10px] text-[#10b981]">{t('noGlobalPollution')}</span>
              </div>
              <div className="relative rounded-lg bg-[#0e0e10] p-3 border border-[#27272a] font-mono text-[11px] text-[#e5e1e4]">
                <button
                  type="button"
                  onClick={handleCopyEnv}
                  className="absolute top-2 right-2 p-1 rounded bg-[#201f22] hover:bg-[#2a2a2c] text-[#86948a] hover:text-[#e5e1e4] transition-colors cursor-pointer"
                  title="Copy Environment Block"
                >
                  {copiedEnv ? (
                    <Check className="w-3.5 h-3.5 text-[#10b981]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                <div className="space-y-1 text-[#bbcabf]">
                  <div>
                    <span className="text-[#4cd7f6]">export</span> ANTHROPIC_BASE_URL=
                    <span className="text-[#10b981]">"{gatewayUrl}"</span>
                  </div>
                  <div>
                    <span className="text-[#4cd7f6]">export</span> ANTHROPIC_API_KEY=
                    <span className="text-[#ffb95f]">
                      "{maskedKey || 'sk-litellm-...'}"
                    </span>
                  </div>
                  <div>
                    <span className="text-[#4cd7f6]">export</span> ANTHROPIC_MODEL=
                    <span className="text-[#10b981]">"{activeSonnetModel}"</span>
                  </div>
                  <div>
                    <span className="text-[#4cd7f6]">export</span> CLAUDE_CODE_MODEL=
                    <span className="text-[#e5e1e4]">"{activeSonnetModel}"</span>
                  </div>
                  <div>
                    <span className="text-[#4cd7f6]">export</span> OPENAI_API_BASE=
                    <span className="text-[#10b981]">"{gatewayUrl}/v1"</span>
                  </div>
                  <div className="text-[#86948a] pt-1 italic text-[10px]">
                    # Subprocess isolated • Zero global shell pollution
                  </div>
                </div>
              </div>
            </div>

            {/* Spawn Command Preview */}
            <div className="rounded-lg bg-[#201f22] p-2.5 border border-[#27272a] space-y-1">
              <span className="font-mono text-[10px] uppercase text-[#86948a] font-bold">
                {t('spawnCommand')}
              </span>
              <div className="flex items-center gap-1.5 font-mono text-xs">
                <span className="text-[#4cd7f6] font-bold select-none">$</span>
                <span className="text-[#e5e1e4] truncate">{spawnCmdText}</span>
              </div>
            </div>
          </div>

          {/* Quick Tips Card */}
          <div className="rounded-xl bg-[#1c1b1d]/70 p-3 border border-[#27272a] flex items-start gap-2.5 shadow-sm">
            <AlertCircle className="w-5 h-5 text-[#4cd7f6] shrink-0 mt-0.5" />
            <p className="text-xs text-[#bbcabf] leading-relaxed">
              {t('quickTip')}
            </p>
          </div>
        </div>
      </div>

      {/* Subprocess Status Drawer (Live Process Telemetry) */}
      <div className="rounded-xl bg-[#0e0e10] p-2.5 border border-[#27272a] shadow-inner flex flex-col md:flex-row md:items-center justify-between gap-2 text-[#bbcabf] font-mono text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#201f22] text-[#10b981]">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                activeProcessesList.length > 0 ? 'bg-[#10b981] animate-pulse' : 'bg-[#86948a]'
              }`}
            />
            <span className="font-bold">
              {t('activeProcessesDrawer', { count: activeProcessesList.length })}
            </span>
          </div>
          <span className="text-[#3c4a42]">•</span>
          <span className="text-[#e5e1e4]">
            PID{' '}
            <span className="text-[#4cd7f6] font-semibold">
              {currentProcess ? currentProcess.pid : 'None'}
            </span>
          </span>
          <span className="text-[#3c4a42]">•</span>
          <span>
            {t('memoryRss')}:{' '}
            <span className="text-[#e5e1e4]">
              {currentProcess
                ? `${(currentProcess.memory_rss_bytes / (1024 * 1024)).toFixed(1)} MB`
                : '0 MB'}
            </span>
          </span>
          <span className="text-[#3c4a42]">•</span>
          <span>
            {t('uptime')}:{' '}
            <span className="text-[#e5e1e4]">
              {currentProcess ? `${currentProcess.uptime_secs}s` : '0s'}
            </span>
          </span>
        </div>
      </div>
    </div>
  )
}

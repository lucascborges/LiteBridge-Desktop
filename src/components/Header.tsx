import React from 'react'
import { Activity, RefreshCw, Settings, User } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useLiteLLMHealth } from '../hooks/useTauriBridge'

export const Header: React.FC<{ onOpenDiagnostics: () => void }> = ({ onOpenDiagnostics }) => {
  const gatewayUrl = useAppStore((s) => s.gatewayUrl)
  const models = useAppStore((s) => s.models)
  const { data: health, isLoading } = useLiteLLMHealth()

  const isConnected = !isLoading && health?.status === 'connected'
  const latency = health?.latency_ms ?? 18

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
              LiteBridge Desktop{' '}
              <span className="text-[#bbcabf] text-[10px]">v1.0.0-MVP</span>
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
                LiteLLM: {isConnected ? 'Connected' : 'Offline'}
              </span>{' '}
              ({models.length} models) •{' '}
              <span className="text-[#4cd7f6]">{gatewayUrl}</span> •{' '}
              <span className="text-[#86948a]">{latency}ms</span>
            </span>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenDiagnostics}
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#201f22] hover:bg-[#2a2a2c] text-[#bbcabf] hover:text-[#e5e1e4] text-xs transition-colors"
            title="IPC Diagnostics"
          >
            <Activity className="w-3.5 h-3.5 text-[#10b981]" />
            <span className="hidden lg:inline text-[11px] font-mono">Diagnostics</span>
          </button>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#201f22] hover:bg-[#2a2a2c] text-[#bbcabf] hover:text-[#e5e1e4] text-xs transition-colors"
            title="Refresh System"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#4cd7f6]" />
            <span className="hidden lg:inline text-[11px] font-mono">Refresh</span>
          </button>

          <button
            type="button"
            className="p-1 rounded bg-[#201f22] hover:bg-[#2a2a2c] text-[#bbcabf] hover:text-[#e5e1e4] transition-colors"
            title="Settings"
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

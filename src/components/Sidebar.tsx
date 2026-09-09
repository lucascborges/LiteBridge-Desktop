import React from 'react'
import { Terminal, Database, Shield, FileCode, Monitor, Server } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

interface SidebarProps {
  currentTab: string
  setCurrentTab: (tab: string) => void
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, setCurrentTab }) => {
  const harnesses = useAppStore((s) => s.harnesses)
  const selectedHarnessId = useAppStore((s) => s.selectedHarnessId)
  const setSelectedHarnessId = useAppStore((s) => s.setSelectedHarnessId)

  return (
    <aside className="fixed left-0 top-[38px] bottom-0 w-64 bg-[#0e0e10] border-r border-[#27272a] z-40 flex flex-col justify-between select-none">
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Gateway Host Mini Card */}
        <div className="p-2.5 rounded-lg bg-[#1c1b1d] border border-[#27272a] shadow-inner">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#10b981]" />
              <span className="font-mono text-[10px] text-[#bbcabf] uppercase tracking-wider">
                Gateway Host
              </span>
            </div>
            <span className="font-mono text-[11px] text-[#10b981] font-medium">24ms</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-[#e5e1e4] font-semibold">127.0.0.1:4000</span>
            <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
          </div>
        </div>

        {/* Section: Agents & Harnesses */}
        <div className="space-y-1">
          <div className="px-2 py-1 font-mono text-[10px] text-[#86948a] uppercase tracking-wider">
            Agents & Harnesses
          </div>

          {harnesses.map((h) => {
            const isSelected = selectedHarnessId === h.id && currentTab === 'orchestrator'
            const statusColor =
              h.status === 'DETECTED'
                ? 'text-[#10b981] bg-[#10b981]/10'
                : h.status === 'CONFIG-ONLY'
                ? 'text-[#ffb95f] bg-[#ffb95f]/10'
                : 'text-[#86948a] bg-[#86948a]/10'

            return (
              <button
                key={h.id}
                type="button"
                onClick={() => {
                  setSelectedHarnessId(h.id)
                  setCurrentTab('orchestrator')
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                  isSelected
                    ? 'bg-[#2a2a2c] text-[#e5e1e4] font-semibold shadow-sm'
                    : 'text-[#bbcabf] hover:bg-[#1c1b1d] hover:text-[#e5e1e4]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      h.status === 'DETECTED'
                        ? 'bg-[#10b981] shadow-[0_0_6px_rgba(16,185,129,0.5)]'
                        : h.status === 'CONFIG-ONLY'
                        ? 'bg-[#ffb95f]'
                        : 'bg-[#86948a]'
                    }`}
                  />
                  <span>{h.name}</span>
                </div>
                <span className={`px-1.5 py-0.5 rounded font-mono text-[9px] ${statusColor}`}>
                  {h.status}
                </span>
              </button>
            )
          })}
        </div>

        {/* Section: System & Proxy */}
        <div className="space-y-1">
          <div className="px-2 py-1 font-mono text-[10px] text-[#86948a] uppercase tracking-wider">
            System & Proxy
          </div>

          <button
            type="button"
            onClick={() => setCurrentTab('gateway-config')}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all ${
              currentTab === 'gateway-config'
                ? 'bg-[#2a2a2c] text-[#e5e1e4] font-semibold'
                : 'text-[#bbcabf] hover:bg-[#1c1b1d] hover:text-[#e5e1e4]'
            }`}
          >
            <Server className="w-3.5 h-3.5 text-[#4cd7f6]" />
            <span>LiteLLM Gateway Config</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentTab('model-registry')}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all ${
              currentTab === 'model-registry'
                ? 'bg-[#2a2a2c] text-[#e5e1e4] font-semibold'
                : 'text-[#bbcabf] hover:bg-[#1c1b1d] hover:text-[#e5e1e4]'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-[#ffb95f]" />
            <span>Model Registry & Aliases</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentTab('process-monitor')}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all ${
              currentTab === 'process-monitor'
                ? 'bg-[#2a2a2c] text-[#e5e1e4] font-semibold'
                : 'text-[#bbcabf] hover:bg-[#1c1b1d] hover:text-[#e5e1e4]'
            }`}
          >
            <Monitor className="w-3.5 h-3.5 text-[#10b981]" />
            <span>Process Monitor</span>
          </button>
        </div>

        {/* Section: Tools & Audit */}
        <div className="space-y-1">
          <div className="px-2 py-1 font-mono text-[10px] text-[#86948a] uppercase tracking-wider">
            Tools & Audit
          </div>

          <button
            type="button"
            onClick={() => setCurrentTab('backups')}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all ${
              currentTab === 'backups'
                ? 'bg-[#2a2a2c] text-[#e5e1e4] font-semibold'
                : 'text-[#bbcabf] hover:bg-[#1c1b1d] hover:text-[#e5e1e4]'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-[#4cd7f6]" />
            <span>Config Backups & Rollbacks</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentTab('security-owasp')}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all ${
              currentTab === 'security-owasp'
                ? 'bg-[#2a2a2c] text-[#e5e1e4] font-semibold'
                : 'text-[#bbcabf] hover:bg-[#1c1b1d] hover:text-[#e5e1e4]'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-[#10b981]" />
            <span>Security & OWASP Audit</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentTab('ipc-logs')}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all ${
              currentTab === 'ipc-logs'
                ? 'bg-[#2a2a2c] text-[#e5e1e4] font-semibold'
                : 'text-[#bbcabf] hover:bg-[#1c1b1d] hover:text-[#e5e1e4]'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-[#bbcabf]" />
            <span>Tauri IPC Logs</span>
          </button>
        </div>
      </div>

      {/* Footer System Status */}
      <div className="p-3 bg-[#0e0e10] border-t border-[#27272a]">
        <div className="p-2 rounded-lg bg-[#1c1b1d] flex items-center justify-between text-[#bbcabf] font-mono text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
            <span>Tauri IPC Core</span>
          </div>
          <span className="text-[#86948a]">:v2</span>
        </div>
      </div>
    </aside>
  )
}

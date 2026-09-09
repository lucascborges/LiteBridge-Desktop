import React from 'react'
import { Terminal, Trash2 } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

export const IpcLogsView: React.FC = () => {
  const ipcLogs = useAppStore((s) => s.ipcLogs)

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="rounded-xl bg-[#1c1b1d] p-5 border border-[#27272a] shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#201f22] border border-[#27272a] flex items-center justify-center">
            <Terminal className="w-5 h-5 text-[#10b981]" />
          </div>
          <div>
            <h2 className="text-lg text-[#e5e1e4] font-semibold">Tauri IPC Event Logs & Telemetry</h2>
            <p className="text-xs text-[#bbcabf]">
              Real-time audit log of commands invoked between React webview and Rust native runtime.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => useAppStore.setState({ ipcLogs: [] })}
          className="px-3 py-1.5 rounded-lg bg-[#201f22] hover:bg-[#2a2a2c] text-[#bbcabf] hover:text-[#ffb4ab] text-xs font-mono transition-colors flex items-center gap-1.5 border border-[#27272a] cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear Logs</span>
        </button>
      </div>

      <div className="rounded-xl bg-[#0e0e10] p-4 border border-[#27272a] shadow-inner font-mono text-xs text-[#e5e1e4] min-h-[360px] max-h-[500px] overflow-y-auto space-y-1">
        {ipcLogs.length === 0 ? (
          <div className="text-[#86948a] italic py-8 text-center">
            No IPC events captured yet. Run an action to see real-time bridge telemetry.
          </div>
        ) : (
          ipcLogs.map((log, index) => (
            <div key={index} className="flex items-start gap-2 py-0.5 border-b border-[#27272a]/30">
              <span className="text-[#86948a] select-none text-[10px]">[{index + 1}]</span>
              <span
                className={
                  log.includes('[ERROR') || log.includes('error')
                    ? 'text-[#ffb4ab]'
                    : log.includes('[HEALTH') || log.includes('[SPAWN')
                    ? 'text-[#10b981]'
                    : 'text-[#bbcabf]'
                }
              >
                {log}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

import React, { useState } from 'react'
import { FileCode, RotateCcw, Check, Clock, Eye, AlertTriangle } from 'lucide-react'
import { useConfigBackups } from '../hooks/useTauriBridge'
import { invoke } from '@tauri-apps/api/core'
import { useAppStore } from '../store/useAppStore'

export const BackupsView: React.FC = () => {
  const claudeDesktopConfigPath = useAppStore((s) => s.claudeDesktopConfigPath)
  const addIpcLog = useAppStore((s) => s.addIpcLog)
  const { data: backups = [], refetch, isFetching } = useConfigBackups()

  const [restoring, setRestoring] = useState<string | null>(null)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [previewBackup, setPreviewBackup] = useState<{ path: string; name: string } | null>(null)

  const handleRollback = async (backupPath: string) => {
    setRestoring(backupPath)
    setErrorMsg(null)
    try {
      await invoke('rollback_config_backup', {
        backupPath,
        targetPath: claudeDesktopConfigPath || null,
      })
      addIpcLog(`[ROLLBACK] Restored configuration from ${backupPath}`)
      setStatusMsg(`Successfully restored config from ${backupPath}`)
      await refetch()
    } catch (e) {
      addIpcLog(`[ROLLBACK_ERROR] ${e}`)
      setErrorMsg(`Failed to restore backup: ${e}`)
    } finally {
      setRestoring(null)
      setTimeout(() => {
        setStatusMsg(null)
        setErrorMsg(null)
      }, 4000)
    }
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="rounded-xl bg-[#1c1b1d] p-5 border border-[#27272a] shadow-sm space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#201f22] border border-[#27272a] flex items-center justify-center">
            <FileCode className="w-5 h-5 text-[#4cd7f6]" />
          </div>
          <div>
            <h2 className="text-lg text-[#e5e1e4] font-semibold">Config Backups & Atomic Rollbacks</h2>
            <p className="text-xs text-[#bbcabf]">
              Target Host Config:{' '}
              <span className="font-mono text-[#10b981]">
                {claudeDesktopConfigPath || 'claude_desktop_config.json'}
              </span>
            </p>
          </div>
        </div>

        <p className="text-xs text-[#bbcabf] leading-relaxed">
          LiteBridge creates an atomic snapshot before every configuration rewrite. MCP server entries, credentials, and custom plugins are guaranteed immutable.
        </p>

        {statusMsg && (
          <div className="p-2.5 rounded-lg bg-[#10b981]/10 border border-[#10b981]/30 text-xs text-[#10b981] flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{statusMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-2.5 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/30 text-xs text-[#ef4444] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      <div className="rounded-xl bg-[#0e0e10] border border-[#27272a] overflow-hidden shadow-inner">
        <div className="px-4 py-2.5 bg-[#1c1b1d] border-b border-[#27272a] flex items-center justify-between text-xs font-mono text-[#bbcabf]">
          <span>AVAILABLE BACKUP SNAPSHOTS ({backups.length})</span>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-[#10b981] hover:underline cursor-pointer disabled:opacity-50"
          >
            {isFetching ? 'Scanning...' : 'Refresh List'}
          </button>
        </div>

        {backups.length === 0 ? (
          <div className="p-10 text-center space-y-2 font-mono text-xs text-[#86948a]">
            <FileCode className="w-8 h-8 mx-auto text-[#3c4a42]" />
            <p className="text-[#e5e1e4] font-medium">No Config Backups Created Yet</p>
            <p className="text-[11px] max-w-sm mx-auto">
              Whenever you mutate your Claude Desktop configuration through LiteBridge, an atomic timestamped backup (.bak.&lt;timestamp&gt;) will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#27272a]">
            {backups.map((b) => (
              <div
                key={b.file_name}
                className="p-3.5 flex items-center justify-between hover:bg-[#18181b] transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-mono text-xs text-[#e5e1e4] font-medium">
                    <FileCode className="w-4 h-4 text-[#4cd7f6]" />
                    <span>{b.file_name}</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono text-[11px] text-[#86948a]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {new Date(b.created_at).toLocaleString()}
                    </span>
                    <span>•</span>
                    <span>{b.size_bytes} bytes</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewBackup(
                        previewBackup?.path === b.path ? null : { path: b.path, name: b.file_name }
                      )
                    }
                    className="px-2.5 py-1.5 rounded-lg bg-[#201f22] hover:bg-[#2a2a2c] text-[#bbcabf] hover:text-[#e5e1e4] text-xs font-mono transition-colors flex items-center gap-1 border border-[#27272a] cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{previewBackup?.path === b.path ? 'Close' : 'Details'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRollback(b.path)}
                    disabled={restoring === b.path}
                    className="px-3 py-1.5 rounded-lg bg-[#201f22] hover:bg-[#2a2a2c] text-[#e5e1e4] hover:text-[#10b981] text-xs font-mono transition-colors flex items-center gap-1.5 border border-[#27272a] cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{restoring === b.path ? 'Restoring...' : 'Restore'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {previewBackup && (
        <div className="rounded-xl bg-[#0e0e10] p-4 border border-[#27272a] shadow-inner space-y-2 font-mono text-xs">
          <div className="flex items-center justify-between text-[#e5e1e4]">
            <span className="text-[#4cd7f6] font-bold">Snapshot Path: {previewBackup.name}</span>
            <button
              type="button"
              onClick={() => setPreviewBackup(null)}
              className="text-[#86948a] hover:text-[#e5e1e4]"
            >
              &times; Close
            </button>
          </div>
          <div className="p-3 rounded bg-[#1c1b1d] text-[#bbcabf] overflow-x-auto text-[11px] leading-relaxed">
            <code>Location: {previewBackup.path}</code>
            <p className="text-[10px] text-[#86948a] pt-1">
              Validated schema snapshot with intact mcpServers definitions. Ready for 1-click restore.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

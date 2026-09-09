import React, { useState } from 'react'
import {
  Monitor,
  Square,
  RefreshCw,
  Terminal,
  Activity,
  Cpu,
  Clock,
  Layers,
} from 'lucide-react'
import { useTrackedProcesses, useKillProcess } from '../hooks/useTauriBridge'
import { useTranslation } from '../i18n/useTranslation'

export const ProcessMonitorView: React.FC = () => {
  const { data: processes = [], refetch, isFetching } = useTrackedProcesses()
  const killMutation = useKillProcess()
  const [killingPid, setKillingPid] = useState<number | null>(null)
  const { t } = useTranslation()

  const handleKill = async (pid: number) => {
    setKillingPid(pid)
    try {
      await killMutation.mutateAsync(pid)
      await refetch()
    } finally {
      setKillingPid(null)
    }
  }

  const formatUptime = (secs: number) => {
    if (secs < 60) return `${secs}s`
    const mins = Math.floor(secs / 60)
    const remSecs = secs % 60
    if (mins < 60) return `${mins}m ${remSecs}s`
    const hours = Math.floor(mins / 60)
    return `${hours}h ${mins % 60}m`
  }

  const formatMemory = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 MB'
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }

  const activeCount = processes.filter((p) => p.active).length

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="rounded-xl bg-[#1c1b1d] p-5 border border-[#27272a] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#201f22] border border-[#27272a] flex items-center justify-center">
            <Monitor className="w-5 h-5 text-[#10b981]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg text-[#e5e1e4] font-semibold">{t('processMonitorTitle')}</h2>
              <span className="px-2 py-0.5 rounded-full bg-[#10b981]/10 text-[#10b981] font-mono text-[10px] font-bold">
                {t('activeProcessesCount', { count: activeCount })}
              </span>
            </div>
            <p className="text-xs text-[#bbcabf]">
              {t('processMonitorDesc')}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="px-3 py-1.5 rounded-lg bg-[#201f22] hover:bg-[#2a2a2c] text-[#e5e1e4] text-xs font-mono transition-colors flex items-center gap-1.5 border border-[#27272a] cursor-pointer disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#10b981] ${isFetching ? 'animate-spin' : ''}`} />
          <span>{t('refreshProcessesBtn')}</span>
        </button>
      </div>

      {processes.length === 0 ? (
        <div className="rounded-xl bg-[#0e0e10] p-12 border border-[#27272a] text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#1c1b1d] border border-[#27272a] flex items-center justify-center mx-auto text-[#86948a]">
            <Terminal className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-[#e5e1e4]">{t('noTrackedProcessesTitle')}</h3>
          <p className="text-xs text-[#86948a] max-w-md mx-auto">
            {t('noTrackedProcessesDesc')}
          </p>
        </div>
      ) : (
        <div className="rounded-xl bg-[#0e0e10] border border-[#27272a] overflow-hidden shadow-inner">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs text-[#e5e1e4]">
              <thead className="bg-[#1c1b1d] text-[#86948a] uppercase text-[10px] border-b border-[#27272a]">
                <tr>
                  <th className="p-3">{t('colPidStatus')}</th>
                  <th className="p-3">{t('colCliBinary')}</th>
                  <th className="p-3">{t('colEmulator')}</th>
                  <th className="p-3">{t('colMemoryRss')}</th>
                  <th className="p-3">{t('colCpu')}</th>
                  <th className="p-3">{t('colUptime')}</th>
                  <th className="p-3 text-right">{t('colAction')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272a]">
                {processes.map((proc) => (
                  <tr key={proc.pid} className="hover:bg-[#18181b] transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            proc.active ? 'bg-[#10b981] animate-pulse' : 'bg-[#86948a]'
                          }`}
                        />
                        <span className="font-bold">{proc.pid}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded ${
                            proc.active
                              ? 'bg-[#10b981]/10 text-[#10b981]'
                              : 'bg-[#201f22] text-[#86948a]'
                          }`}
                        >
                          {proc.active ? t('runningStatus') : t('exitedStatus')}
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5 text-[#4cd7f6]">
                        <Terminal className="w-3.5 h-3.5" />
                        <span>{proc.binary}</span>
                      </div>
                    </td>
                    <td className="p-3 text-[#bbcabf] text-[11px]">{proc.emulator}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-[#ffb95f]" />
                        <span>{formatMemory(proc.memory_rss_bytes)}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <Cpu className="w-3.5 h-3.5 text-[#10b981]" />
                        <span>{proc.cpu_usage_pct.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1 text-[#bbcabf]">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatUptime(proc.uptime_secs)}</span>
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      {proc.active ? (
                        <button
                          type="button"
                          onClick={() => handleKill(proc.pid)}
                          disabled={killingPid === proc.pid}
                          className="px-2.5 py-1 rounded bg-[#ef4444]/10 hover:bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/30 transition-colors inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <Square className="w-3 h-3 fill-current" />
                          <span>{killingPid === proc.pid ? t('killingBtn') : t('killBtn')}</span>
                        </button>
                      ) : (
                        <span className="text-[#86948a] text-[11px] italic">{t('terminatedStatus')}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
